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
use tauri::{Manager, WindowEvent};
use crate::mdns::MdnsManager;
use crate::port::find_available_port;
use crate::qr::generate_qr_data_url;
use crate::auto_start::AutoStartManager;
#[cfg(target_os = "macos")]
use crate::driver::is_accessibility_trusted;
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
    
    // Try to get the best IP using scoring algorithm
    if let Some(best_ip) = find_best_local_ip() {
        return Some(best_ip);
    }
    
    // Fallback to original method
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if let Ok(_) = socket.connect("8.8.8.8:80") {
            if let Ok(addr) = socket.local_addr() {
                return Some(addr.ip().to_string());
            }
        }
    }
    None
}

/// Find the best local IP address using a scoring algorithm
fn find_best_local_ip() -> Option<String> {
    use std::net::IpAddr;
    
    #[cfg(target_os = "windows")]
    let interfaces = get_network_interfaces_windows()?;
    
    #[cfg(target_os = "macos")]
    let interfaces = get_network_interfaces_macos()?;
    
    #[cfg(target_os = "linux")]
    let interfaces = get_network_interfaces_linux()?;
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    return None;
    
    let mut candidates: Vec<(String, i32, String)> = Vec::new();
    
    for (dev_name, ip) in interfaces {
        // Only consider IPv4 addresses
        let IpAddr::V4(ipv4) = ip else { continue };
        
        // Skip loopback addresses
        if ipv4.is_loopback() {
            continue;
        }
        
        let ip_str = ip.to_string();
        let mut score = 0;
        
        // 2. Score private network ranges
        let octets = ipv4.octets();
        if octets[0] == 192 && octets[1] == 168 {
            score += 10; // 192.168.x.x
        } else if octets[0] == 10 {
            score += 10; // 10.x.x.x
        } else if octets[0] == 172 && (16..=31).contains(&octets[1]) {
            score += 10; // 172.16-31.x.x
        }
        
        // 3. Penalize virtual interfaces
        let dev_lower = dev_name.to_lowercase();
        if dev_lower.contains("virtual") 
            || dev_lower.contains("vbox")
            || dev_lower.contains("docker")
            || dev_lower.contains("veth")
            || dev_lower.contains("tap")
            || dev_lower.contains("vpn")
            || dev_lower.contains("tailscale")
            || dev_lower.contains("zerotier") {
            score -= 100;
        }
        
        // 4. Prefer wireless and physical ethernet
        if dev_lower.contains("wlan")
            || dev_lower.contains("wi-fi")
            || dev_lower.contains("wifi")
            || dev_lower.contains("ethernet")
            || dev_lower.contains("en0")
            || dev_lower.contains("eth0") {
            score += 20;
        }
        
        // 5. Exclude auto-config addresses (169.254.x.x)
        if ip_str.starts_with("169.254") {
            score -= 150;
        }
        
        candidates.push((ip_str, score, dev_name));
    }
    
    // Sort by score descending
    candidates.sort_by(|a, b| b.1.cmp(&a.1));
    
    // Return the highest scoring IP
    candidates.first().map(|(ip, score, name)| {
        println!("[IP] Selected best local IP: {} (score: {}, interface: {})", ip, score, name);
        ip.clone()
    })
}

#[cfg(target_os = "windows")]
fn get_network_interfaces_windows() -> Option<Vec<(String, std::net::IpAddr)>> {
    use std::net::IpAddr;
    use winapi::shared::ws2def::{AF_UNSPEC, SOCKADDR_IN};
    use winapi::um::iptypes::{IP_ADAPTER_ADDRESSES, GAA_FLAG_INCLUDE_PREFIX};
    use winapi::um::iphlpapi::GetAdaptersAddresses;
    
    let mut result = Vec::new();
    
    unsafe {
        let mut buffer_size = 0u32;
        
        // First call to get buffer size
        let _ = GetAdaptersAddresses(
            AF_UNSPEC as u32,
            GAA_FLAG_INCLUDE_PREFIX,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            &mut buffer_size,
        );
        
        if buffer_size == 0 {
            return None;
        }
        
        let mut buffer = vec![0u8; buffer_size as usize];
        let adapter_addresses = buffer.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES;
        
        let ret = GetAdaptersAddresses(
            AF_UNSPEC as u32,
            GAA_FLAG_INCLUDE_PREFIX,
            std::ptr::null_mut(),
            adapter_addresses,
            &mut buffer_size,
        );
        
        if ret != 0 {
            return None;
        }
        
        let mut current = adapter_addresses;
        while !current.is_null() {
            let adapter = &*current;
            
            // Get adapter name
            let name_ptr = adapter.AdapterName;
            let name = if !name_ptr.is_null() {
                std::ffi::CStr::from_ptr(name_ptr)
                    .to_string_lossy()
                    .to_string()
            } else {
                String::new()
            };
            
            // Get friendly name
            let friendly_name = if !adapter.FriendlyName.is_null() {
                let len = (0..).take_while(|&i| *adapter.FriendlyName.add(i) != 0).count();
                let slice = std::slice::from_raw_parts(adapter.FriendlyName, len);
                String::from_utf16_lossy(slice)
            } else {
                name.clone()
            };
            
            // Iterate through unicast addresses
            let mut unicast = adapter.FirstUnicastAddress;
            while !unicast.is_null() {
                let addr = &*unicast;
                if !addr.Address.lpSockaddr.is_null() {
                    let sockaddr = &*(addr.Address.lpSockaddr as *const SOCKADDR_IN);
                    if sockaddr.sin_family == winapi::shared::ws2def::AF_INET as u16 {
                        let ip_bytes = sockaddr.sin_addr.S_un.S_addr().to_ne_bytes();
                        let ip = IpAddr::V4(std::net::Ipv4Addr::new(ip_bytes[0], ip_bytes[1], ip_bytes[2], ip_bytes[3]));
                        result.push((friendly_name.clone(), ip));
                    }
                }
                unicast = addr.Next;
            }
            
            current = adapter.Next;
        }
    }
    
    Some(result)
}

#[cfg(target_os = "macos")]
fn get_network_interfaces_macos() -> Option<Vec<(String, std::net::IpAddr)>> {
    use std::net::IpAddr;
    
    let mut result = Vec::new();
    
    unsafe {
        let mut ifap: *mut libc::ifaddrs = std::ptr::null_mut();
        
        if libc::getifaddrs(&mut ifap) != 0 {
            return None;
        }
        
        let mut ifa = ifap;
        while !ifa.is_null() {
            let ifa_ref = &*ifa;
            
            if !ifa_ref.ifa_addr.is_null() {
                let addr = &*ifa_ref.ifa_addr;
                
                if addr.sa_family as i32 == libc::AF_INET {
                    let sin = &*(ifa_ref.ifa_addr as *const libc::sockaddr_in);
                    let ip_bytes = sin.sin_addr.s_addr.to_ne_bytes();
                    let ip = IpAddr::V4(std::net::Ipv4Addr::new(ip_bytes[0], ip_bytes[1], ip_bytes[2], ip_bytes[3]));
                    
                    let name = std::ffi::CStr::from_ptr(ifa_ref.ifa_name)
                        .to_string_lossy()
                        .to_string();
                    
                    result.push((name, ip));
                }
            }
            
            ifa = ifa_ref.ifa_next;
        }
        
        libc::freeifaddrs(ifap);
    }
    
    Some(result)
}

#[cfg(target_os = "linux")]
fn get_network_interfaces_linux() -> Option<Vec<(String, std::net::IpAddr)>> {
    // Same implementation as macos for Linux
    get_network_interfaces_macos()
}

fn get_computer_name() -> String {
    if let Ok(name) = std::env::var("COMPUTERNAME") { return name; }
    if let Ok(name) = std::env::var("HOSTNAME") { return name; }
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

        let script = format!(
            r#"display dialog "{}" buttons {{"OK"}} default button "OK" with title "MultiLinkServer""#,
            msg.replace('"', "\\\"")
        );
        let _ = std::process::Command::new("osascript")
            .args(["-e", &script])
            .output();

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
    let ip = get_local_ip().unwrap_or_else(|| "127.0.0.1".to_string());
    let computer_name = get_computer_name();
    let initial_lang = i18n::detect_system_lang();

    // ── UDP server ────────────────────────────────────────────
    let udp_port = port;
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().expect("tokio runtime");
        rt.block_on(async move { run_udp_server(udp_port).await; });
    });

    // ── mDNS ────────────────────────────────────────────────
    let mut mdns_manager = MdnsManager::new("_multilink._udp.local.", &computer_name, port, Some(ip.clone()));
    let _ = mdns_manager.start();

    tauri::Builder::default()
        .manage(AppState {
            port: Mutex::new(port),
            ip: Mutex::new(ip.clone()),
            mdns_manager: Mutex::new(Some(mdns_manager)),
            lang: Mutex::new(initial_lang.clone()),
        })
        .setup(move |app| {
            let tray_items = tray::create_tray(app.handle(), &initial_lang)?;
            app.manage(tray_items);

            let window = app.get_webview_window("main").unwrap();
            let _ = window.eval(&format!(
                "window.appData = {{ ip: '{}', port: {}, systemLang: '{}' }}",
                ip, port, initial_lang
            ));

            let auto_start = AutoStartManager::new("KeyboardServer");
            let app_data_dir = app.path().app_data_dir().ok();
            let first_run_flag = app_data_dir.as_ref().map(|p| p.join(".initialized"));
            let is_first_run = first_run_flag.as_ref().map(|p| !p.exists()).unwrap_or(false);

            if is_first_run {
                if let Err(e) = auto_start.set_enabled(true) {
                    eprintln!("Failed to enable auto-start on first run: {}", e);
                }
                if let Some(ref dir) = app_data_dir {
                    let _ = std::fs::create_dir_all(dir);
                    if let Some(ref flag) = first_run_flag {
                        let _ = std::fs::File::create(flag);
                    }
                }
            }

            if let Ok(enabled) = auto_start.is_enabled() {
                tray::update_auto_start_menu(app.handle(), enabled);
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
        .invoke_handler(tauri::generate_handler![
            get_connection_info,
            get_qr_code,
            toggle_auto_start,
            is_auto_start_enabled,
            set_language
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
}

async fn run_udp_server(port: u16) {
    let mut driver_manager = DriverManager::new();
    if !driver_manager.initialize() {
        eprintln!("Failed to initialize driver manager");
        return;
    }

    let mut network_manager = NetworkManager::new(port);
    if let Err(e) = network_manager.init_udp().await {
        eprintln!("UDP init failed: {}", e);
        return;
    }
    network_manager.start_udp_listener().await;

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
            KeyboardEvent::MouseMove(x, y)            => { 
                println!("[Main] MouseMove: x={}, y={}", x, y);
                driver_manager.send_mouse_move(*x, *y); 
            }
            KeyboardEvent::MouseButton(mask, pressed)  => { driver_manager.send_mouse_button(*mask, *pressed); }
            KeyboardEvent::MouseScroll(delta)           => { driver_manager.send_mouse_scroll(*delta); }
            KeyboardEvent::ResetState => {
                for code in [0xE0u8, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7] {
                    driver_manager.send_key_release(code);
                }
            }
            KeyboardEvent::MouseDoubleClick(mask) => { driver_manager.send_mouse_double_click(*mask); }
            KeyboardEvent::Heartbeat => {
                // 心跳已在 network.rs 中回复，这里仅记录
                // 可用于统计客户端连接状态
            }
        }
    }
}

// ── Tauri commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn get_connection_info(state: tauri::State<AppState>) -> Result<serde_json::Value, String> {
    let ip   = state.ip.lock().map_err(|e| e.to_string())?;
    let port = state.port.lock().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ip": *ip, "port": *port, "address": format!("{}:{}", *ip, *port) }))
}

#[tauri::command]
fn get_qr_code(state: tauri::State<AppState>) -> Result<String, String> {
    let ip   = state.ip.lock().map_err(|e| e.to_string())?;
    let port = state.port.lock().map_err(|e| e.to_string())?;
    generate_qr_data_url(&format!("{}:{}", *ip, *port)).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_auto_start(enable: bool) -> Result<(), String> {
    AutoStartManager::new("KeyboardServer").set_enabled(enable).map_err(|e| e.to_string())
}

#[tauri::command]
fn is_auto_start_enabled() -> Result<bool, String> {
    AutoStartManager::new("KeyboardServer").is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_language(lang: String, app: tauri::AppHandle, state: tauri::State<AppState>) -> Result<(), String> {
    *state.lang.lock().map_err(|e| e.to_string())? = lang.clone();
    tray::update_tray_lang(&app, &lang);
    Ok(())
}
