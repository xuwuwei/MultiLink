#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod mdns;
mod port;
mod qr;
mod tray;
mod auto_start;
mod network;
mod driver;
mod buffer;
mod scancode;
mod hid;
mod i18n;

use std::sync::Mutex;
use tauri::{Manager, SystemTrayEvent, WindowEvent};
use crate::mdns::MdnsManager;
use crate::port::find_available_port;
use crate::qr::generate_qr_data_url;
use crate::auto_start::AutoStartManager;
#[cfg(target_os = "macos")]
use crate::driver::{request_accessibility_if_needed, is_accessibility_trusted};
use crate::driver::DriverManager;
use crate::network::NetworkManager;
use tokio::time::Duration;

pub struct AppState {
    pub port: Mutex<u16>,
    pub ip: Mutex<String>,
    pub mdns_manager: Mutex<Option<MdnsManager>>,
    pub lang: Mutex<String>,
}

fn get_local_ip() -> Option<String> {
    use std::net::UdpSocket;
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if let Ok(_) = socket.connect("8.8.8.8:80") {
            if let Ok(addr) = socket.local_addr() {
                return Some(addr.ip().to_string());
            }
        }
    }
    None
}

fn get_computer_name() -> String {
    if let Ok(name) = std::env::var("COMPUTERNAME") {
        return name;
    }
    if let Ok(name) = std::env::var("HOSTNAME") {
        return name;
    }
    "KeyboardLink".to_string()
}

#[cfg(target_os = "macos")]
fn check_macos_setup() {
    if !is_accessibility_trusted() {
        let lang = i18n::detect_system_lang();
        let msg = i18n::accessibility_dialog_msg(&lang);

        let _ = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn();

        // Build and run the osascript dialog
        let script = format!(
            r#"display dialog "{}" buttons {{"OK"}} default button "OK" with title "MultiLinkServer""#,
            msg.replace('"', "\\\"")
        );
        let _ = std::process::Command::new("osascript")
            .args(["-e", &script])
            .output();

        // Poll in background; relaunch once trusted
        let exe_path = std::env::current_exe().ok().map(|p| p.to_string_lossy().to_string());
        std::thread::spawn(move || {
            loop {
                std::thread::sleep(std::time::Duration::from_secs(2));
                if is_accessibility_trusted() {
                    if let Some(ref path) = exe_path {
                        let _ = std::process::Command::new(path).spawn();
                    }
                    std::process::exit(0);
                }
            }
        });
    }
}

fn main() {
    #[cfg(target_os = "macos")]
    check_macos_setup();

    let port = find_available_port(8333).expect("无法找到可用端口");
    println!("使用端口: {}", port);

    let ip = get_local_ip().unwrap_or_else(|| "127.0.0.1".to_string());
    let computer_name = get_computer_name();

    // Detect initial language (will be overridden by webview localStorage preference)
    let initial_lang = i18n::detect_system_lang();

    // ── TCP server ────────────────────────────────────────────
    let tcp_port = port;
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().expect("tokio runtime");
        rt.block_on(async move {
            run_tcp_server(tcp_port).await;
        });
    });

    // ── mDNS ────────────────────────────────────────────────
    let mut mdns_manager = MdnsManager::new("_multilink._tcp.local.", &computer_name, port, Some(ip.clone()));
    let _ = mdns_manager.start();

    let tray = tray::create_tray_menu(&initial_lang);

    tauri::Builder::default()
        .manage(AppState {
            port: Mutex::new(port),
            ip: Mutex::new(ip.clone()),
            mdns_manager: Mutex::new(Some(mdns_manager)),
            lang: Mutex::new(initial_lang.clone()),
        })
        .setup(move |app| {
            let window = app.get_window("main").unwrap();
            // Inject connection info AND system-detected language into the webview
            let _ = window.eval(&format!(
                "window.appData = {{ ip: '{}', port: {}, systemLang: '{}' }}",
                ip, port, initial_lang
            ));

            let auto_start = AutoStartManager::new("KeyboardServer");

            // Check if this is the first run (for auto-start on install)
            let app_handle = app.handle();
            let app_data_dir = app_handle.path_resolver().app_data_dir();
            let first_run_flag = app_data_dir.as_ref().map(|p| p.join(".initialized"));
            let is_first_run = first_run_flag.as_ref().map(|p| !p.exists()).unwrap_or(false);

            if is_first_run {
                // Enable auto-start on first run (install)
                if let Err(e) = auto_start.set_enabled(true) {
                    eprintln!("Failed to enable auto-start on first run: {}", e);
                } else {
                    println!("Auto-start enabled on first run");
                }

                // Create the flag file to indicate initialization is done
                if let Some(ref dir) = app_data_dir {
                    let _ = std::fs::create_dir_all(dir);
                    if let Some(ref flag) = first_run_flag {
                        let _ = std::fs::File::create(flag);
                    }
                }
            }

            // Update tray menu to reflect current auto-start status
            if let Ok(enabled) = auto_start.is_enabled() {
                tray::update_auto_start_menu(&app_handle, enabled);
            }

            let win = window.clone();
            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = win.hide();
                }
            });

            Ok(())
        })
        .system_tray(tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                tray::toggle_window(&window);
            }
            SystemTrayEvent::DoubleClick { .. } => {
                let window = app.get_window("main").unwrap();
                tray::show_window(&window);
                let _ = window.set_focus();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "show" => {
                        let window = app.get_window("main").unwrap();
                        tray::show_window(&window);
                    }
                    "auto_start" => {
                        let auto_start = AutoStartManager::new("KeyboardServer");
                        let current = auto_start.is_enabled().unwrap_or(false);
                        let new_state = !current;
                        if let Err(e) = auto_start.set_enabled(new_state) {
                            eprintln!("设置开机启动失败: {}", e);
                        }
                        tray::update_auto_start_menu(app, new_state);
                    }
                    "feedback" => {
                        let url = "https://tally.so/r/aQGVKB";
                        if let Err(e) = tauri::api::shell::open(&app.shell_scope(), url, None) {
                            eprintln!("打开反馈链接失败: {}", e);
                        }
                    }
                    "help" => {
                        let help_url = "https://xuwuwei.github.io/keyboard-help/";
                        if let Err(e) = tauri::api::shell::open(&app.shell_scope(), help_url, None) {
                            eprintln!("打开帮助链接失败: {}", e);
                        }
                    }
                    "quit" => {
                        if let Some(state) = app.try_state::<AppState>() {
                            if let Ok(mut manager) = state.mdns_manager.lock() {
                                if let Some(ref mut m) = *manager {
                                    let _ = m.stop();
                                }
                            }
                        }
                        std::process::exit(0);
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            get_connection_info,
            get_qr_code,
            toggle_auto_start,
            is_auto_start_enabled,
            set_language
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            _ => {}
        });
}

/// TCP server loop
async fn run_tcp_server(port: u16) {
    let mut driver_manager = DriverManager::new();
    if !driver_manager.initialize() {
        eprintln!("Failed to initialize driver manager");
        return;
    }

    let mut network_manager = NetworkManager::new(0, port);
    if let Err(e) = network_manager.init_tcp().await {
        eprintln!("TCP init failed: {}", e);
        return;
    }
    network_manager.start_tcp_listener().await;
    println!("TCP server listening on port {}", port);

    let mut network_receiver = network_manager.get_event_receiver();

    while let Some(msg) = network_receiver.recv().await {
        use crate::network::KeyboardEvent;
        use crate::scancode::char_to_hid;
        match &msg.event {
            KeyboardEvent::KeyDown(code)  => { driver_manager.send_key_press(*code); }
            KeyboardEvent::KeyUp(code)    => { driver_manager.send_key_release(*code); }
            KeyboardEvent::KeyCombo(keys) => { driver_manager.send_key_combo(keys); }
            KeyboardEvent::Text(text) => {
                let text = text.clone();
                for c in text.chars() {
                    if let Some(hid_code) = char_to_hid(c) {
                        let needs_shift = c.is_uppercase() || "!@#$%^&*()_+{}|:<>?~".contains(c);
                        if needs_shift { driver_manager.send_key_press(0xE1); }
                        driver_manager.send_key_press(hid_code);
                        tokio::time::sleep(Duration::from_millis(5)).await;
                        driver_manager.send_key_release(hid_code);
                        if needs_shift { driver_manager.send_key_release(0xE1); }
                        tokio::time::sleep(Duration::from_millis(10)).await;
                    }
                }
            }
            KeyboardEvent::MouseMove(x, y)           => { driver_manager.send_mouse_move(*x, *y); }
            KeyboardEvent::MouseButton(mask, pressed) => { driver_manager.send_mouse_button(*mask, *pressed); }
            KeyboardEvent::MouseScroll(delta)          => { driver_manager.send_mouse_scroll(*delta); }
            KeyboardEvent::ResetState => {
                for code in [0xE0u8, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7] {
                    driver_manager.send_key_release(code);
                }
            }
            KeyboardEvent::MouseDoubleClick(mask) => { driver_manager.send_mouse_double_click(*mask); }
        }
    }
}

// ── Tauri commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_connection_info(state: tauri::State<AppState>) -> Result<serde_json::Value, String> {
    let ip = state.ip.lock().map_err(|e| e.to_string())?;
    let port = state.port.lock().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "ip": *ip,
        "port": *port,
        "address": format!("{}:{}", *ip, *port)
    }))
}

#[tauri::command]
fn get_qr_code(state: tauri::State<AppState>) -> Result<String, String> {
    let ip = state.ip.lock().map_err(|e| e.to_string())?;
    let port = state.port.lock().map_err(|e| e.to_string())?;
    let data = format!("{}:{}", *ip, *port);
    generate_qr_data_url(&data).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_auto_start(enable: bool) -> Result<(), String> {
    let auto_start = AutoStartManager::new("KeyboardServer");
    auto_start.set_enabled(enable).map_err(|e| e.to_string())
}

#[tauri::command]
fn is_auto_start_enabled() -> Result<bool, String> {
    let auto_start = AutoStartManager::new("KeyboardServer");
    auto_start.is_enabled().map_err(|e| e.to_string())
}

/// Called from the webview when the user changes the language.
/// Updates the tray menu titles to match the new language.
#[tauri::command]
fn set_language(
    lang: String,
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    *state.lang.lock().map_err(|e| e.to_string())? = lang.clone();
    tray::update_tray_lang(&app, &lang);
    Ok(())
}
