use tauri::{
    menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WebviewWindow,
};
use crate::i18n::tray_i18n;

pub fn create_tray(app: &AppHandle, lang: &str) -> tauri::Result<()> {
    let i = tray_i18n(lang);

    let show       = MenuItem::with_id(app, "show",       i.show,       true, None::<&str>)?;
    let auto_start = MenuItem::with_id(app, "auto_start", i.auto_start, true, None::<&str>)?;
    let feedback   = MenuItem::with_id(app, "feedback",   i.feedback,   true, None::<&str>)?;
    let help       = MenuItem::with_id(app, "help",       i.help,       true, None::<&str>)?;
    let quit       = MenuItem::with_id(app, "quit",       i.quit,       true, None::<&str>)?;

    let menu = Menu::with_items(app, &[
        &show,
        &PredefinedMenuItem::separator(app)?,
        &auto_start,
        &PredefinedMenuItem::separator(app)?,
        &feedback,
        &help,
        &PredefinedMenuItem::separator(app)?,
        &quit,
    ])?;

    TrayIconBuilder::with_id("tray")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } => {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    toggle_window(&w);
                }
            }
            TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } => {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    show_window(&w);
                    let _ = w.set_focus();
                }
            }
            _ => {}
        })
        .on_menu_event(|app, event| {
            handle_menu_event(app, event.id().as_ref());
        })
        .build(app)?;

    Ok(())
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        "show" => {
            if let Some(w) = app.get_webview_window("main") {
                show_window(&w);
            }
        }
        "auto_start" => {
            let mgr = crate::auto_start::AutoStartManager::new("KeyboardServer");
            let current = mgr.is_enabled().unwrap_or(false);
            let new_state = !current;
            if let Err(e) = mgr.set_enabled(new_state) {
                eprintln!("设置开机启动失败: {}", e);
            }
            update_auto_start_menu(app, new_state);
        }
        "feedback" => { let _ = open::that("https://tally.so/r/aQGVKB"); }
        "help"     => { let _ = open::that("https://xuwuwei.github.io/keyboard-help/"); }
        "quit" => {
            if let Some(state) = app.try_state::<crate::AppState>() {
                if let Ok(mut m) = state.mdns_manager.lock() {
                    if let Some(ref mut mgr) = *m { let _ = mgr.stop(); }
                }
            }
            std::process::exit(0);
        }
        _ => {}
    }
}

pub fn show_window(w: &WebviewWindow) {
    let _ = w.show();
    let _ = w.center();
}

pub fn hide_window(w: &WebviewWindow) {
    let _ = w.hide();
}

pub fn toggle_window(w: &WebviewWindow) {
    if w.is_visible().unwrap_or(false) { hide_window(w); } else { show_window(w); }
}

fn tray_menu(app: &AppHandle) -> Option<Menu<tauri::Wry>> {
    app.tray_by_id("tray")?.menu()
}

fn set_item_text(app: &AppHandle, id: &str, text: &str) {
    if let Some(menu) = tray_menu(app) {
        if let Some(MenuItemKind::MenuItem(item)) = menu.get(id) {
            let _ = item.set_text(text);
        }
    }
}

pub fn update_auto_start_menu(app: &AppHandle, enabled: bool) {
    let lang = app
        .try_state::<crate::AppState>()
        .and_then(|s| s.lang.lock().ok().map(|g| g.clone()))
        .unwrap_or_else(|| "en".to_string());
    let i = tray_i18n(&lang);
    let label = if enabled { i.auto_start_on } else { i.auto_start };
    set_item_text(app, "auto_start", label);
}

pub fn update_tray_lang(app: &AppHandle, lang: &str) {
    let i = tray_i18n(lang);
    set_item_text(app, "show",     i.show);
    set_item_text(app, "feedback", i.feedback);
    set_item_text(app, "help",     i.help);
    set_item_text(app, "quit",     i.quit);

    let enabled = crate::auto_start::AutoStartManager::new("KeyboardServer")
        .is_enabled().unwrap_or(false);
    let auto_label = if enabled { i.auto_start_on } else { i.auto_start };
    set_item_text(app, "auto_start", auto_label);
}
