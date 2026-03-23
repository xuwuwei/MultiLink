/**
 * Internationalization Service
 */

export type Language = 'ar' | 'de' | 'en' | 'es' | 'fr' | 'hi' | 'id' | 'ja' | 'ko' | 'pt' | 'ru' | 'vi' | 'zhCN' | 'zhTW';

const translations: Record<Language, Record<string, string>> = {
  en: {
    welcome: 'Welcome',
    blank_page: 'Blank Page',
    switch_lang: 'Switch Language',
  },
  zhCN: {
    welcome: '欢迎',
    blank_page: '空白页面',
    switch_lang: '切换语言',
  },
  // Add other languages as needed...
  ar: { welcome: 'أهلاً بك', blank_page: 'صفحة فارغة', switch_lang: 'تبديل اللغة' },
  de: { welcome: 'Willkommen', blank_page: 'Leere Seite', switch_lang: 'Sprache wechseln' },
  es: { welcome: 'Bienvenido', blank_page: 'Página en blanco', switch_lang: 'Cambiar idioma' },
  fr: { welcome: 'Bienvenue', blank_page: 'Page blanche', switch_lang: 'Changer de langue' },
  hi: { welcome: 'स्वागत है', blank_page: 'खाली पन्ना', switch_lang: 'भाषा बदलें' },
  id: { welcome: 'Selamat datang', blank_page: 'Halaman Kosong', switch_lang: 'Ganti Bahasa' },
  ja: { welcome: 'ようこそ', blank_page: '空白ページ', switch_lang: '言語を切り替える' },
  ko: { welcome: '환영합니다', blank_page: '빈 페이지', switch_lang: '언어 전환' },
  pt: { welcome: 'Bem-vindo', blank_page: 'Página em branco', switch_lang: 'Mudar idioma' },
  ru: { welcome: 'Добро пожаловать', blank_page: 'Пустая страница', switch_lang: 'Переключить язык' },
  vi: { welcome: 'Chào mừng', blank_page: 'Trang trống', switch_lang: 'Chuyển đổi ngôn ngữ' },
  zhTW: { welcome: '歡迎', blank_page: '空白頁面', switch_lang: '切換語言' },
};

export const getBrowserLang = (): Language => {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh-tw') || lang.startsWith('zh-hk')) return 'zhTW';
  if (lang.startsWith('zh')) return 'zhCN';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('ru')) return 'ru';
  if (lang.startsWith('pt')) return 'pt';
  if (lang.startsWith('ar')) return 'ar';
  if (lang.startsWith('hi')) return 'hi';
  if (lang.startsWith('id')) return 'id';
  if (lang.startsWith('vi')) return 'vi';
  return 'en';
};

export const t = (key: string, lang: Language): string => {
  return translations[lang]?.[key] || translations['en'][key] || key;
};
