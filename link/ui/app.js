// ── i18n translations ──────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en',   label: 'EN', native: 'English',           english: 'English' },
  { code: 'zhCN', label: '中', native: '简体中文',            english: 'Chinese (Simplified)' },
  { code: 'zhTW', label: '繁', native: '繁體中文',            english: 'Chinese (Traditional)' },
  { code: 'ja',   label: 'JA', native: '日本語',             english: 'Japanese' },
  { code: 'ko',   label: 'KO', native: '한국어',             english: 'Korean' },
  { code: 'fr',   label: 'FR', native: 'Français',          english: 'French' },
  { code: 'de',   label: 'DE', native: 'Deutsch',           english: 'German' },
  { code: 'es',   label: 'ES', native: 'Español',           english: 'Spanish' },
  { code: 'pt',   label: 'PT', native: 'Português',         english: 'Portuguese' },
  { code: 'ru',   label: 'RU', native: 'Русский',           english: 'Russian' },
  { code: 'hi',   label: 'HI', native: 'हिन्दी',              english: 'Hindi' },
  { code: 'id',   label: 'ID', native: 'Bahasa Indonesia',  english: 'Indonesian' },
  { code: 'vi',   label: 'VI', native: 'Tiếng Việt',        english: 'Vietnamese' },
  { code: 'ar',   label: 'AR', native: 'العربية',            english: 'Arabic' },
];

const T = {
  en: {
    serverRunning: 'Keyboard Server Running',
    loading: 'Loading...',
    scanQr: 'Scan with phone to connect',
    ipAddress: 'IP Address',
    tcpPort: 'TCP Port',
    fullAddress: 'Full Address',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    copiedToClipboard: 'Copied to clipboard',
    instructions: 'Instructions',
    step1: 'Connect phone and PC to same Wi-Fi',
    step2: 'Scan QR code or enter address manually',
    step3: 'App stays in tray after closing window',
    step4: 'Right-click tray icon to reopen',
    footer: 'Program continues running in system tray',
    devMode: 'Dev Mode',
    loadFailed: 'Load failed',
    language: 'Language',
  },
  zhCN: {
    serverRunning: 'Keyboard Server 运行中',
    loading: '加载中...',
    scanQr: '手机扫码连接',
    ipAddress: 'IP 地址',
    tcpPort: 'TCP 端口',
    fullAddress: '完整地址',
    copy: '复制',
    copied: '已复制',
    copyFailed: '复制失败',
    copiedToClipboard: '已复制到剪贴板',
    instructions: '使用说明',
    step1: '手机与电脑连接同一 Wi-Fi',
    step2: '扫描二维码或手动输入地址',
    step3: '关闭窗口后程序继续在托盘运行',
    step4: '右键托盘图标可重新打开',
    footer: '关闭窗口后程序将继续在系统托盘运行',
    devMode: '开发模式',
    loadFailed: '加载失败',
    language: '语言',
  },
  zhTW: {
    serverRunning: 'Keyboard Server 運行中',
    loading: '載入中...',
    scanQr: '手機掃碼連接',
    ipAddress: 'IP 地址',
    tcpPort: 'TCP 埠',
    fullAddress: '完整地址',
    copy: '複製',
    copied: '已複製',
    copyFailed: '複製失敗',
    copiedToClipboard: '已複製到剪貼簿',
    instructions: '使用說明',
    step1: '手機與電腦連接同一 Wi-Fi',
    step2: '掃描二維碼或手動輸入地址',
    step3: '關閉視窗後程式繼續在托盤運行',
    step4: '右鍵托盤圖示可重新打開',
    footer: '關閉視窗後程式將繼續在系統托盤運行',
    devMode: '開發模式',
    loadFailed: '載入失敗',
    language: '語言',
  },
  ja: {
    serverRunning: 'Keyboard Server 実行中',
    loading: '読み込み中...',
    scanQr: 'スマホでQRコードをスキャン',
    ipAddress: 'IPアドレス',
    tcpPort: 'TCPポート',
    fullAddress: 'フルアドレス',
    copy: 'コピー',
    copied: 'コピー済み',
    copyFailed: 'コピー失敗',
    copiedToClipboard: 'クリップボードにコピーしました',
    instructions: '使い方',
    step1: 'スマホとPCを同じWi-Fiに接続',
    step2: 'QRコードをスキャンまたは手動でアドレス入力',
    step3: 'ウィンドウを閉じてもトレイで起動中',
    step4: 'トレイアイコンを右クリックで再表示',
    footer: 'ウィンドウを閉じてもシステムトレイで動作します',
    devMode: '開発モード',
    loadFailed: '読み込み失敗',
    language: '言語',
  },
  ko: {
    serverRunning: 'Keyboard Server 실행 중',
    loading: '로딩 중...',
    scanQr: '스마트폰으로 QR 코드 스캔',
    ipAddress: 'IP 주소',
    tcpPort: 'TCP 포트',
    fullAddress: '전체 주소',
    copy: '복사',
    copied: '복사됨',
    copyFailed: '복사 실패',
    copiedToClipboard: '클립보드에 복사됨',
    instructions: '사용 방법',
    step1: '스마트폰과 PC를 같은 Wi-Fi에 연결',
    step2: 'QR 코드 스캔 또는 주소 직접 입력',
    step3: '창을 닫아도 트레이에서 계속 실행',
    step4: '트레이 아이콘 우클릭으로 다시 열기',
    footer: '창을 닫아도 시스템 트레이에서 계속 실행됩니다',
    devMode: '개발 모드',
    loadFailed: '로드 실패',
    language: '언어',
  },
  fr: {
    serverRunning: 'Keyboard Server en cours',
    loading: 'Chargement...',
    scanQr: 'Scanner le QR code avec le téléphone',
    ipAddress: 'Adresse IP',
    tcpPort: 'Port TCP',
    fullAddress: 'Adresse complète',
    copy: 'Copier',
    copied: 'Copié',
    copyFailed: 'Échec de la copie',
    copiedToClipboard: 'Copié dans le presse-papiers',
    instructions: 'Instructions',
    step1: 'Connecter téléphone et PC au même Wi-Fi',
    step2: 'Scanner le QR code ou saisir l\'adresse manuellement',
    step3: 'L\'app reste dans la barre des tâches après fermeture',
    step4: 'Clic droit sur l\'icône de la barre pour rouvrir',
    footer: 'Le programme continue dans la barre des tâches',
    devMode: 'Mode développeur',
    loadFailed: 'Échec du chargement',
    language: 'Langue',
  },
  de: {
    serverRunning: 'Keyboard Server läuft',
    loading: 'Wird geladen...',
    scanQr: 'QR-Code mit Telefon scannen',
    ipAddress: 'IP-Adresse',
    tcpPort: 'TCP-Port',
    fullAddress: 'Vollständige Adresse',
    copy: 'Kopieren',
    copied: 'Kopiert',
    copyFailed: 'Kopieren fehlgeschlagen',
    copiedToClipboard: 'In die Zwischenablage kopiert',
    instructions: 'Anleitung',
    step1: 'Telefon und PC mit demselben WLAN verbinden',
    step2: 'QR-Code scannen oder Adresse manuell eingeben',
    step3: 'App bleibt nach Fensterschluss im Tray',
    step4: 'Tray-Symbol rechtsklicken zum Wiederherstellen',
    footer: 'Programm läuft weiter im System-Tray',
    devMode: 'Entwicklermodus',
    loadFailed: 'Laden fehlgeschlagen',
    language: 'Sprache',
  },
  es: {
    serverRunning: 'Keyboard Server en ejecución',
    loading: 'Cargando...',
    scanQr: 'Escanear QR con el teléfono',
    ipAddress: 'Dirección IP',
    tcpPort: 'Puerto TCP',
    fullAddress: 'Dirección completa',
    copy: 'Copiar',
    copied: 'Copiado',
    copyFailed: 'Error al copiar',
    copiedToClipboard: 'Copiado al portapapeles',
    instructions: 'Instrucciones',
    step1: 'Conectar teléfono y PC a la misma Wi-Fi',
    step2: 'Escanear QR o ingresar dirección manualmente',
    step3: 'La app sigue en la bandeja al cerrar la ventana',
    step4: 'Clic derecho en el icono de bandeja para reabrir',
    footer: 'El programa sigue ejecutándose en la bandeja del sistema',
    devMode: 'Modo desarrollador',
    loadFailed: 'Error de carga',
    language: 'Idioma',
  },
  pt: {
    serverRunning: 'Keyboard Server a executar',
    loading: 'A carregar...',
    scanQr: 'Digitalizar QR com o telemóvel',
    ipAddress: 'Endereço IP',
    tcpPort: 'Porta TCP',
    fullAddress: 'Endereço completo',
    copy: 'Copiar',
    copied: 'Copiado',
    copyFailed: 'Falha ao copiar',
    copiedToClipboard: 'Copiado para a área de transferência',
    instructions: 'Instruções',
    step1: 'Ligar telemóvel e PC à mesma Wi-Fi',
    step2: 'Digitalizar QR ou inserir endereço manualmente',
    step3: 'App fica na bandeja após fechar a janela',
    step4: 'Botão direito no ícone da bandeja para reabrir',
    footer: 'O programa continua na bandeja do sistema',
    devMode: 'Modo de desenvolvedor',
    loadFailed: 'Falha ao carregar',
    language: 'Idioma',
  },
  ru: {
    serverRunning: 'Keyboard Server работает',
    loading: 'Загрузка...',
    scanQr: 'Сканируйте QR-код телефоном',
    ipAddress: 'IP-адрес',
    tcpPort: 'TCP-порт',
    fullAddress: 'Полный адрес',
    copy: 'Копировать',
    copied: 'Скопировано',
    copyFailed: 'Ошибка копирования',
    copiedToClipboard: 'Скопировано в буфер обмена',
    instructions: 'Инструкция',
    step1: 'Подключить телефон и ПК к одной Wi-Fi',
    step2: 'Сканировать QR или ввести адрес вручную',
    step3: 'Приложение остаётся в трее после закрытия',
    step4: 'Правая кнопка на иконке трея для открытия',
    footer: 'Программа продолжает работать в системном трее',
    devMode: 'Режим разработки',
    loadFailed: 'Ошибка загрузки',
    language: 'Язык',
  },
  hi: {
    serverRunning: 'Keyboard Server चल रहा है',
    loading: 'लोड हो रहा है...',
    scanQr: 'फोन से QR कोड स्कैन करें',
    ipAddress: 'IP पता',
    tcpPort: 'TCP पोर्ट',
    fullAddress: 'पूरा पता',
    copy: 'कॉपी करें',
    copied: 'कॉपी हो गया',
    copyFailed: 'कॉपी विफल',
    copiedToClipboard: 'क्लिपबोर्ड पर कॉपी किया गया',
    instructions: 'निर्देश',
    step1: 'फोन और PC को एक ही Wi-Fi से कनेक्ट करें',
    step2: 'QR कोड स्कैन करें या पता मैन्युअल दर्ज करें',
    step3: 'विंडो बंद करने के बाद ऐप ट्रे में रहता है',
    step4: 'ट्रे आइकन पर राइट-क्लिक कर पुनः खोलें',
    footer: 'प्रोग्राम सिस्टम ट्रे में चलता रहता है',
    devMode: 'डेव मोड',
    loadFailed: 'लोड विफल',
    language: 'भाषा',
  },
  id: {
    serverRunning: 'Keyboard Server berjalan',
    loading: 'Memuat...',
    scanQr: 'Pindai QR dengan ponsel',
    ipAddress: 'Alamat IP',
    tcpPort: 'Port TCP',
    fullAddress: 'Alamat lengkap',
    copy: 'Salin',
    copied: 'Disalin',
    copyFailed: 'Gagal menyalin',
    copiedToClipboard: 'Disalin ke papan klip',
    instructions: 'Petunjuk',
    step1: 'Hubungkan ponsel dan PC ke Wi-Fi yang sama',
    step2: 'Pindai QR atau masukkan alamat secara manual',
    step3: 'App tetap di tray setelah jendela ditutup',
    step4: 'Klik kanan ikon tray untuk membuka kembali',
    footer: 'Program terus berjalan di system tray',
    devMode: 'Mode pengembang',
    loadFailed: 'Gagal memuat',
    language: 'Bahasa',
  },
  vi: {
    serverRunning: 'Keyboard Server đang chạy',
    loading: 'Đang tải...',
    scanQr: 'Quét QR bằng điện thoại',
    ipAddress: 'Địa chỉ IP',
    tcpPort: 'Cổng TCP',
    fullAddress: 'Địa chỉ đầy đủ',
    copy: 'Sao chép',
    copied: 'Đã sao chép',
    copyFailed: 'Sao chép thất bại',
    copiedToClipboard: 'Đã sao chép vào bộ nhớ tạm',
    instructions: 'Hướng dẫn',
    step1: 'Kết nối điện thoại và PC cùng Wi-Fi',
    step2: 'Quét mã QR hoặc nhập địa chỉ thủ công',
    step3: 'App ở trong khay sau khi đóng cửa sổ',
    step4: 'Nhấp chuột phải vào biểu tượng khay để mở lại',
    footer: 'Chương trình tiếp tục chạy trong khay hệ thống',
    devMode: 'Chế độ phát triển',
    loadFailed: 'Tải thất bại',
    language: 'Ngôn ngữ',
  },
  ar: {
    serverRunning: 'خادم لوحة المفاتيح يعمل',
    loading: 'جارٍ التحميل...',
    scanQr: 'امسح رمز QR بالهاتف',
    ipAddress: 'عنوان IP',
    tcpPort: 'منفذ TCP',
    fullAddress: 'العنوان الكامل',
    copy: 'نسخ',
    copied: 'تم النسخ',
    copyFailed: 'فشل النسخ',
    copiedToClipboard: 'تم النسخ إلى الحافظة',
    instructions: 'التعليمات',
    step1: 'توصيل الهاتف والكمبيوتر بنفس Wi-Fi',
    step2: 'مسح رمز QR أو إدخال العنوان يدوياً',
    step3: 'يبقى التطبيق في شريط المهام بعد الإغلاق',
    step4: 'انقر بزر الماوس الأيمن على أيقونة الشريط لإعادة الفتح',
    footer: 'يستمر البرنامج في العمل في شريط المهام',
    devMode: 'وضع المطور',
    loadFailed: 'فشل التحميل',
    language: 'اللغة',
  },
};

// ── Language detection & state ─────────────────────────────────────────────
let currentLang = 'en';

function detectInitialLang() {
  // 1. User's saved preference
  const saved = localStorage.getItem('link_lang');
  if (saved && T[saved]) return saved;

  // 2. System lang injected by Rust
  if (window.appData && window.appData.systemLang && T[window.appData.systemLang]) {
    return window.appData.systemLang;
  }

  // 3. Browser/webview locale
  const nav = navigator.language || '';
  const full = nav.toLowerCase();
  const short = full.split('-')[0];
  if (full === 'zh-cn' || full === 'zh-hans') return 'zhCN';
  if (full === 'zh-tw' || full === 'zh-hk' || full === 'zh-hant') return 'zhTW';
  if (T[full.replace('-', '')]) return full.replace('-', '');
  if (T[short]) return short;
  return 'en';
}

function applyLang(lang) {
  currentLang = lang;
  const dict = T[lang] || T['en'];

  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });

  // Update header label
  const langMeta = LANGUAGES.find(l => l.code === lang);
  if (langMeta) {
    const lbl = document.getElementById('lang-label');
    if (lbl) lbl.textContent = langMeta.label;
  }

  // RTL support for Arabic
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Keep copy buttons showing current translation (not "copied" state)
  document.querySelectorAll('.copy-btn:not(.copied)').forEach(btn => {
    btn.textContent = dict['copy'];
  });

  // Persist
  localStorage.setItem('link_lang', lang);

  // Notify Rust to update tray
  const invoke = window.__TAURI__?.invoke;
  if (invoke) invoke('set_language', { lang }).catch(() => {});
}

// ── Language dropdown ──────────────────────────────────────────────────────
function buildLangList() {
  const list = document.getElementById('lang-list');
  list.innerHTML = '';
  LANGUAGES.forEach(l => {
    const item = document.createElement('div');
    item.className = 'lang-item' + (l.code === currentLang ? ' active' : '');
    item.innerHTML = `<span class="lang-native">${l.native}</span>${l.code === currentLang ? '<span class="lang-check">✓</span>' : ''}`;
    item.onclick = () => selectLang(l.code);
    list.appendChild(item);
  });
}

function toggleLangDropdown() {
  const dd = document.getElementById('lang-dropdown');
  const isOpen = dd.classList.contains('open');
  if (!isOpen) {
    buildLangList();
    dd.classList.add('open');
  } else {
    dd.classList.remove('open');
  }
}

function selectLang(lang) {
  applyLang(lang);
  document.getElementById('lang-dropdown').classList.remove('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#lang-btn') && !e.target.closest('#lang-dropdown')) {
    document.getElementById('lang-dropdown').classList.remove('open');
  }
});

// ── App data & display ─────────────────────────────────────────────────────
const invoke = window.__TAURI__?.invoke;
let appData = { ip: '', port: 0 };

async function init() {
  // Apply language first
  const lang = detectInitialLang();
  applyLang(lang);

  // Show data injected at startup (instant display, no flicker)
  if (window.appData && window.appData.ip) {
    appData.ip = window.appData.ip;
    appData.port = window.appData.port;
    updateDisplay();
  }

  try {
    if (invoke) {
      const info = await invoke('get_connection_info');
      appData.ip = info.ip;
      appData.port = info.port;
      updateDisplay();

      const qrDataUrl = await invoke('get_qr_code');
      displayQRCode(qrDataUrl);
    } else {
      if (!appData.ip) {
        appData.ip = '192.168.1.100';
        appData.port = 8333;
      }
      const dict = T[currentLang] || T['en'];
      document.getElementById('qr-loading').textContent = dict['devMode'];
      updateDisplay();
    }
  } catch (error) {
    console.error('Init failed:', error);
    const dict = T[currentLang] || T['en'];
    if (!appData.ip) {
      const failed = dict['loadFailed'];
      document.getElementById('ip-address').textContent = failed;
      document.getElementById('port').textContent = failed;
      document.getElementById('full-address').textContent = failed;
    }
    document.getElementById('qr-loading').textContent = dict['loadFailed'];
  }
}

function updateDisplay() {
  document.getElementById('ip-address').textContent = appData.ip;
  document.getElementById('port').textContent = appData.port;
  document.getElementById('full-address').textContent = `${appData.ip}:${appData.port}`;
}

function displayQRCode(dataUrl) {
  const qrImg = document.getElementById('qr-code');
  const loading = document.getElementById('qr-loading');
  qrImg.src = dataUrl;
  qrImg.onload = () => {
    qrImg.classList.add('loaded');
    loading.style.display = 'none';
  };
}

async function copyText(elementId, btn) {
  const text = document.getElementById(elementId).textContent;
  const dict = T[currentLang] || T['en'];
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    const orig = dict['copy'];
    btn.textContent = dict['copied'];
    btn.classList.add('copied');
    showToast(dict['copiedToClipboard']);
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
  } catch (err) {
    showToast(dict['copyFailed']);
  }
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

document.addEventListener('DOMContentLoaded', init);
