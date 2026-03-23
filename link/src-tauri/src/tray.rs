use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayMenuItem, Window, AppHandle, Manager};
use crate::i18n::tray_i18n;

pub fn create_tray_menu(lang: &str) -> SystemTray {
    let i = tray_i18n(lang);
    let show      = CustomMenuItem::new("show".to_string(),       i.show);
    let auto_start = CustomMenuItem::new("auto_start".to_string(), i.auto_start);
    let feedback  = CustomMenuItem::new("feedback".to_string(),   i.feedback);
    let help      = CustomMenuItem::new("help".to_string(),       i.help);
    let quit      = CustomMenuItem::new("quit".to_string(),       i.quit);

    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(auto_start)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(feedback)
        .add_item(help)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}

pub fn show_window(window: &Window) {
    window.show().unwrap();
    window.center().unwrap();
}

pub fn hide_window(window: &Window) {
    window.hide().unwrap();
}

pub fn toggle_window(window: &Window) {
    if window.is_visible().unwrap() {
        hide_window(window);
    } else {
        show_window(window);
    }
}

/// Update the auto-start menu item title to reflect current state, using the app's current language.
pub fn update_auto_start_menu(app: &AppHandle, enabled: bool) {
    let lang: String = app
        .try_state::<crate::AppState>()
        .and_then(|s| s.lang.lock().ok().map(|g| g.clone()))
        .unwrap_or_else(|| "en".to_string());
    let i = tray_i18n(&lang);
    let label = if enabled { i.auto_start_on } else { i.auto_start };
    let _ = app.tray_handle().get_item("auto_start").set_title(label);
}

/// Update all tray item titles to the given language.
pub fn update_tray_lang(app: &AppHandle, lang: &str) {
    let i = tray_i18n(lang);
    let tray = app.tray_handle();
    let _ = tray.get_item("show").set_title(i.show);
    let _ = tray.get_item("feedback").set_title(i.feedback);
    let _ = tray.get_item("help").set_title(i.help);
    let _ = tray.get_item("quit").set_title(i.quit);

    // Reflect current auto-start state with new language
    let enabled = crate::auto_start::AutoStartManager::new("KeyboardServer")
        .is_enabled()
        .unwrap_or(false);
    let auto_label = if enabled { i.auto_start_on } else { i.auto_start };
    let _ = tray.get_item("auto_start").set_title(auto_label);
}
