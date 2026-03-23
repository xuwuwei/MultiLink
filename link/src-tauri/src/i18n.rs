/// Tray menu strings for a given language code.
pub struct TrayI18n {
    pub show: &'static str,
    pub auto_start: &'static str,
    pub auto_start_on: &'static str,
    pub feedback: &'static str,
    pub help: &'static str,
    pub quit: &'static str,
}

pub fn tray_i18n(lang: &str) -> TrayI18n {
    match lang {
        "zhCN" => TrayI18n {
            show: "显示 IP / 二维码",
            auto_start: "开机启动",
            auto_start_on: "开机启动 ✓",
            feedback: "反馈",
            help: "帮助",
            quit: "退出",
        },
        "zhTW" => TrayI18n {
            show: "顯示 IP / 二維碼",
            auto_start: "開機啟動",
            auto_start_on: "開機啟動 ✓",
            feedback: "回饋",
            help: "說明",
            quit: "退出",
        },
        "ja" => TrayI18n {
            show: "IP / QRコードを表示",
            auto_start: "自動起動",
            auto_start_on: "自動起動 ✓",
            feedback: "フィードバック",
            help: "ヘルプ",
            quit: "終了",
        },
        "ko" => TrayI18n {
            show: "IP / QR 코드 표시",
            auto_start: "자동 시작",
            auto_start_on: "자동 시작 ✓",
            feedback: "피드백",
            help: "도움말",
            quit: "종료",
        },
        "fr" => TrayI18n {
            show: "Afficher IP / QR Code",
            auto_start: "Démarrage auto",
            auto_start_on: "Démarrage auto ✓",
            feedback: "Commentaires",
            help: "Aide",
            quit: "Quitter",
        },
        "de" => TrayI18n {
            show: "IP / QR-Code anzeigen",
            auto_start: "Autostart",
            auto_start_on: "Autostart ✓",
            feedback: "Feedback",
            help: "Hilfe",
            quit: "Beenden",
        },
        "es" => TrayI18n {
            show: "Mostrar IP / QR",
            auto_start: "Inicio automático",
            auto_start_on: "Inicio automático ✓",
            feedback: "Comentarios",
            help: "Ayuda",
            quit: "Salir",
        },
        "pt" => TrayI18n {
            show: "Mostrar IP / QR",
            auto_start: "Início automático",
            auto_start_on: "Início automático ✓",
            feedback: "Comentários",
            help: "Ajuda",
            quit: "Sair",
        },
        "ru" => TrayI18n {
            show: "Показать IP / QR",
            auto_start: "Автозапуск",
            auto_start_on: "Автозапуск ✓",
            feedback: "Обратная связь",
            help: "Справка",
            quit: "Выход",
        },
        "hi" => TrayI18n {
            show: "IP / QR दिखाएं",
            auto_start: "स्वत: प्रारंभ",
            auto_start_on: "स्वत: प्रारंभ ✓",
            feedback: "प्रतिक्रिया",
            help: "सहायता",
            quit: "बाहर निकलें",
        },
        "id" => TrayI18n {
            show: "Tampilkan IP / QR",
            auto_start: "Mulai otomatis",
            auto_start_on: "Mulai otomatis ✓",
            feedback: "Umpan balik",
            help: "Bantuan",
            quit: "Keluar",
        },
        "vi" => TrayI18n {
            show: "Hiển thị IP / QR",
            auto_start: "Khởi động tự động",
            auto_start_on: "Khởi động tự động ✓",
            feedback: "Phản hồi",
            help: "Trợ giúp",
            quit: "Thoát",
        },
        "ar" => TrayI18n {
            show: "عرض IP / QR",
            auto_start: "بدء تلقائي",
            auto_start_on: "بدء تلقائي ✓",
            feedback: "ملاحظات",
            help: "مساعدة",
            quit: "خروج",
        },
        _ => TrayI18n {
            show: "Show IP / QR Code",
            auto_start: "Auto Start",
            auto_start_on: "Auto Start ✓",
            feedback: "Feedback",
            help: "Help",
            quit: "Quit",
        },
    }
}

/// Accessibility permission dialog text (macOS only).
#[cfg(target_os = "macos")]
pub fn accessibility_dialog_msg(lang: &str) -> &'static str {
    match lang {
        "zhCN" => "需要「辅助功能」权限才能注入键盘/鼠标事件。请在刚打开的系统设置中授权 MultiLinkServer，授权后应用会自动重启。",
        "zhTW" => "需要「輔助使用」權限才能注入鍵盤/滑鼠事件。請在剛開啟的系統設定中授權 MultiLinkServer，授權後應用程式會自動重啟。",
        "ja" => "キーボード/マウスイベントを注入するためにアクセシビリティ権限が必要です。開いたシステム設定で MultiLinkServer を認証してください。認証後、アプリは自動的に再起動します。",
        "ko" => "키보드/마우스 이벤트를 주입하려면 손쉬운 사용 권한이 필요합니다. 방금 열린 시스템 설정에서 MultiLinkServer를 승인하세요. 승인 후 앱이 자동으로 재시작됩니다.",
        "fr" => "L'autorisation d'accessibilité est requise pour injecter des événements clavier/souris. Autorisez MultiLinkServer dans les Réglages Système qui viennent de s'ouvrir. L'app redémarrera automatiquement.",
        "de" => "Für die Tastatur-/Mauseingabe wird die Bedienungshilfen-Berechtigung benötigt. Bitte MultiLinkServer in den geöffneten Systemeinstellungen autorisieren. Die App startet danach automatisch neu.",
        "es" => "Se requiere permiso de accesibilidad para inyectar eventos de teclado/ratón. Autoriza MultiLinkServer en los Ajustes del Sistema que acaban de abrirse. La app se reiniciará automáticamente.",
        "pt" => "É necessária permissão de acessibilidade para injetar eventos de teclado/mouse. Autorize o MultiLinkServer nas Preferências do Sistema que acabaram de abrir. O app reiniciará automaticamente.",
        "ru" => "Для работы с клавиатурой и мышью требуется разрешение на доступ. Авторизуйте MultiLinkServer в открывшихся Системных настройках. Приложение перезапустится автоматически.",
        _ => "Accessibility permission is required to inject keyboard/mouse events. Please authorize MultiLinkServer in the System Settings that just opened. The app will restart automatically.",
    }
}

/// Detect the OS UI language, returning a language code matching the app Language type.
pub fn detect_system_lang() -> String {
    // 1. Standard POSIX environment variables
    for var in &["LANG", "LANGUAGE", "LC_ALL", "LC_MESSAGES"] {
        if let Ok(val) = std::env::var(var) {
            if !val.is_empty() && val != "C" && val != "POSIX" {
                if let Some(lang) = map_locale(&val) {
                    return lang;
                }
            }
        }
    }

    // 2. macOS: query AppleLanguages from user defaults
    #[cfg(target_os = "macos")]
    if let Ok(out) = std::process::Command::new("defaults")
        .args(["read", "-g", "AppleLanguages"])
        .output()
    {
        let text = String::from_utf8_lossy(&out.stdout);
        // Output looks like: (\n    "zh-Hans-CN",\n    en,\n    ...\n)
        // Split on non-identifier characters and try each token
        for token in text.split(|c: char| c == '"' || c == ',' || c == '(' || c == ')' || c == '\n' || c == ' ') {
            let t = token.trim();
            if t.len() >= 2 {
                if let Some(lang) = map_locale(t) {
                    return lang;
                }
            }
        }
    }

    // 3. Windows: system locale via GetLocaleInfoEx or env
    #[cfg(windows)]
    {
        // USERPROFILE locale not in env by default on Windows; use a best-effort check
        for var in &["USERLANGUAGE", "UI_LANGUAGE"] {
            if let Ok(val) = std::env::var(var) {
                if let Some(lang) = map_locale(&val) {
                    return lang;
                }
            }
        }
    }

    "en".to_string()
}

fn map_locale(locale: &str) -> Option<String> {
    // Strip encoding suffix (.UTF-8, .utf8, etc.)
    let base = locale.split('.').next().unwrap_or(locale);
    let l = base.to_lowercase();
    if l.starts_with("zh-hans") || l == "zh_cn" || l == "zh-cn" || l == "zh" {
        return Some("zhCN".to_string());
    }
    if l.starts_with("zh-hant") || l == "zh_tw" || l == "zh-tw" || l == "zh_hk" || l == "zh-hk" {
        return Some("zhTW".to_string());
    }
    if l.starts_with("ja") { return Some("ja".to_string()); }
    if l.starts_with("ko") { return Some("ko".to_string()); }
    if l.starts_with("fr") { return Some("fr".to_string()); }
    if l.starts_with("de") { return Some("de".to_string()); }
    if l.starts_with("es") { return Some("es".to_string()); }
    if l.starts_with("pt") { return Some("pt".to_string()); }
    if l.starts_with("ru") { return Some("ru".to_string()); }
    if l.starts_with("hi") { return Some("hi".to_string()); }
    if l.starts_with("id") { return Some("id".to_string()); }
    if l.starts_with("vi") { return Some("vi".to_string()); }
    if l.starts_with("ar") { return Some("ar".to_string()); }
    if l.starts_with("en") { return Some("en".to_string()); }
    None
}
