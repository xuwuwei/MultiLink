import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Settings, 
  HelpCircle, 
  Monitor, 
  Smartphone, 
  Wifi, 
  ChevronDown, 
  Check, 
  Globe, 
  AlertTriangle, 
  Info, 
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { LANGS, T } from './translations';

// --- Components ---

const Nav = ({ lang, setLang }: { lang: string, setLang: (l: string) => void }) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const t = T[lang] || T.en;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/20">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            MultiLink
          </span>
          <div className="hidden lg:flex items-center gap-6">
            {['Preview', 'Download', 'Setup', 'Macos', 'Faq'].map((item) => (
              <a 
                key={item}
                href={`#${item.toLowerCase()}`} 
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                {t[`nav${item}`]}
              </a>
            ))}
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t.navIos}</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t.navAndroid}</a>
            <a href="https://tally.so/r/aQGVKB" target="_blank" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t.navFeedback}</a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {LANGS.find(l => l.code === lang)?.label}
              <ChevronDown className={`w-3 h-3 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isLangOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
                >
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l.code);
                        setIsLangOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${lang === l.code ? 'text-blue-600 bg-blue-50 font-medium' : 'text-slate-700'}`}
                    >
                      {l.native}
                      {lang === l.code && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
};

const SectionHeader = ({ label, title, desc }: { label: string, title: string, desc?: string }) => (
  <div className="mb-12">
    <span className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 block">
      {label}
    </span>
    <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
      {title}
    </h2>
    {desc && <p className="text-lg text-slate-600 max-w-2xl">{desc}</p>}
  </div>
);

const PlatformCard = ({ icon: Icon, title, sub, dlLabel, href, color }: any) => (
  <motion.div 
    whileHover={{ y: -8, scale: 1.02 }}
    className="p-8 rounded-[2rem] glass border border-white/40 shadow-2xl shadow-blue-500/5 hover:shadow-blue-500/10 transition-all group"
  >
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${color} shadow-inner`}>
      <Icon className="w-7 h-7" />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 mb-8 leading-relaxed">{sub}</p>
    <a 
      href={href}
      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/30 transition-all w-full justify-center"
    >
      <Download className="w-4 h-4" />
      {dlLabel}
    </a>
  </motion.div>
);

const StepItem = ({ num, title, desc, children }: any) => (
  <div className="flex gap-6">
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-200">
      {num}
    </div>
    <div className="flex-grow pt-1.5">
      <h4 className="text-lg font-bold text-slate-900 mb-2">{title}</h4>
      <p className="text-slate-600 leading-relaxed mb-4">{desc}</p>
      {children}
    </div>
  </div>
);

const FaqItem = ({ q, a }: { q: string, a: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-100">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{q}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-slate-600 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState('en');
  const t = T[lang];

  useEffect(() => {
    const saved = localStorage.getItem('help_lang');
    if (saved && T[saved]) setLang(saved);
  }, []);

  const handleSetLang = (l: string) => {
    setLang(l);
    localStorage.setItem('help_lang', l);
  };

  return (
    <div className="min-h-screen mesh-gradient selection:bg-blue-100 selection:text-blue-700">
      <Nav lang={lang} setLang={handleSetLang} />

      <main className="max-w-5xl mx-auto px-6 relative">
        {/* Hero */}
        <section className="py-40 text-center relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
          {/* Ambient Background Image */}
          <div className="absolute inset-0 -z-10 opacity-20 blur-2xl scale-125 pointer-events-none">
            <img 
              src={`${import.meta.env.BASE_URL}IMG_0789.png`} 
              alt="Background Ambient" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          
          {/* Floating Background Screenshots */}
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, x: 100, rotate: 12 }}
              animate={{ opacity: 0.1, x: 0, rotate: 12 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute -right-20 top-20 w-[600px] h-[400px] rounded-[3rem] overflow-hidden border border-white/40 shadow-2xl"
            >
              <img src={`${import.meta.env.BASE_URL}IMG_0788.png`} alt="Screenshot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -100, rotate: -12 }}
              animate={{ opacity: 0.1, x: 0, rotate: -12 }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
              className="absolute -left-20 bottom-20 w-[600px] h-[400px] rounded-[3rem] overflow-hidden border border-white/40 shadow-2xl"
            >
              <img src={`${import.meta.env.BASE_URL}IMG_0787.png`} alt="Screenshot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </motion.div>
          </div>

          <div className="absolute inset-0 -z-20 bg-gradient-to-b from-blue-50/30 via-white/50 to-white pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass text-blue-600 text-sm font-bold mb-10 border border-blue-200/50 shadow-blue-500/10"
          >
            <Wifi className="w-4 h-4" />
            {t.heroBadge}
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-7xl font-black text-slate-900 mb-10 tracking-tight leading-[1.05] bg-gradient-to-b from-slate-900 to-slate-700 bg-clip-text text-transparent"
          >
            {t.heroTitle}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl text-slate-600 max-w-3xl mx-auto mb-16 leading-relaxed font-medium"
          >
            {t.heroDesc}
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {['macOS', 'Windows', 'Linux'].map(os => (
              <span key={os} className="px-6 py-2 rounded-2xl glass text-sm font-bold text-slate-600 border border-white/60">
                {os}
              </span>
            ))}
          </motion.div>
        </section>

        {/* App Preview */}
        <section id="preview" className="py-32 border-t border-white/20">
          <SectionHeader 
            label={t.sectionPreview}
            title={t.previewTitle}
            desc={t.previewDesc}
          />
          <div className="relative">
            <div className="flex overflow-x-auto gap-8 pb-12 snap-x no-scrollbar">
              {[789, 788, 787, 786, 785, 784].map((num) => (
                <motion.div 
                  key={num}
                  whileHover={{ y: -10 }}
                  className="flex-none w-[300px] md:w-[500px] snap-center"
                >
                  <div className="rounded-[2rem] overflow-hidden glass border border-white/40 shadow-2xl group">
                    <img 
                      src={`${import.meta.env.BASE_URL}IMG_0${num}.png`} 
                      alt={`App Screenshot ${num}`} 
                      className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            {/* Gradient masks for scroll hint */}
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#f8fafc]/50 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#f8fafc]/50 to-transparent pointer-events-none z-10" />
          </div>
        </section>

        {/* Download */}
        <section id="download" className="py-32 border-t border-white/20">
          <SectionHeader 
            label={t.sectionDownload}
            title={t.downloadTitle}
            desc={t.downloadDesc}
          />
          <div className="grid md:grid-cols-3 gap-8">
            <PlatformCard 
              icon={Monitor}
              title="macOS"
              sub={t.macSub}
              dlLabel={t.dlDmg}
              href="https://github.com/xuwuwei/keyboard-help/releases/download/0.1.0/MultiLinkServer.dmg"
              color="bg-slate-100/50 text-slate-900"
            />
            <PlatformCard 
              icon={Monitor}
              title="Windows"
              sub={t.winSub}
              dlLabel={t.dlZip}
              href="https://github.com/xuwuwei/keyboard-help/releases/download/0.1.0/MultiLinkServer-windows.zip"
              color="bg-blue-100/50 text-blue-600"
            />
            <PlatformCard 
              icon={Monitor}
              title="Linux"
              sub={t.linSub}
              dlLabel={t.dlZip}
              href="https://github.com/xuwuwei/keyboard-help/releases/download/0.1.0/MultiLinkServer-linux-x86_64.zip"
              color="bg-orange-100/50 text-orange-600"
            />
          </div>
        </section>

        {/* Setup */}
        <section id="setup" className="py-32 border-t border-white/20">
          <SectionHeader 
            label={t.sectionSetup}
            title={t.setupTitle}
            desc={t.setupDesc}
          />
          <div className="space-y-20 max-w-3xl">
            <StepItem num="1" title={t.step1Title} desc={t.step1Desc} />
            <StepItem num="2" title={t.step2Title} desc={t.step2Desc}>
              <div className="p-6 rounded-3xl glass border border-blue-200/50 flex gap-5 items-start shadow-blue-500/5">
                <Info className="w-6 h-6 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-base font-bold text-blue-900 mb-1">{t.tipAutoDiscover}</p>
                  <p className="text-base text-blue-700 leading-relaxed">{t.tipAutoDiscoverDesc}</p>
                </div>
              </div>
            </StepItem>
            <StepItem num="3" title={t.step3Title} desc={t.step3Desc} />
            <StepItem num="4" title={t.step4Title} desc={t.step4Desc} />
          </div>
        </section>

        {/* macOS */}
        <section id="macos" className="py-32 border-t border-white/20">
          <SectionHeader 
            label="macOS"
            title={t.macosTitle}
            desc={t.macosDesc}
          />
          
          <div className="p-8 rounded-3xl glass-dark border border-white/10 flex gap-6 items-start mb-16 shadow-2xl">
            <AlertTriangle className="w-8 h-8 text-amber-400 mt-0.5" />
            <div>
              <p className="text-xl font-bold text-white mb-2">{t.macosWarnTitle}</p>
              <p className="text-slate-300 text-lg leading-relaxed">{t.macosWarnDesc}</p>
            </div>
          </div>

          <div className="space-y-20 max-w-3xl">
            <StepItem num="1" title={t.mac1Title} desc={t.mac1Desc} />
            <StepItem num="2" title={t.mac2Title} desc={t.mac2Desc}>
              <div className="mt-8 rounded-[2.5rem] overflow-hidden glass border border-white/40 shadow-2xl group">
                <img 
                  src={`${import.meta.env.BASE_URL}privacy.png`} 
                  alt="macOS Accessibility Settings" 
                  className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
            </StepItem>
            <StepItem num="3" title={t.mac3Title} desc={t.mac3Desc}>
              <div className="p-6 rounded-3xl glass border border-white/40">
                <p className="text-base font-bold text-slate-900 mb-1">{t.mac3NoteTitle}</p>
                <p className="text-base text-slate-600 leading-relaxed">{t.mac3NoteDesc}</p>
              </div>
            </StepItem>
            <StepItem num="4" title={t.mac4Title} desc={t.mac4Desc} />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-32 border-t border-white/20">
          <SectionHeader 
            label={t.sectionFaq}
            title={t.faqTitle}
          />
          <div className="max-w-3xl glass rounded-[2.5rem] p-8 border border-white/40">
            <FaqItem q={t.faq1q} a={t.faq1a} />
            <FaqItem q={t.faq2q} a={t.faq2a} />
            <FaqItem q={t.faq3q} a={t.faq3a} />
            <FaqItem q={t.faq4q} a={t.faq4a} />
            <FaqItem q={t.faq5q} a={t.faq5a} />
            <FaqItem q={t.faq6q} a={t.faq6a} />
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 border-t border-white/20">
          <div className="p-16 rounded-[3rem] glass-dark text-white text-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-indigo-600/30 pointer-events-none" />
            <h2 className="text-5xl font-black mb-8 relative z-10 tracking-tight">{t.ctaTitle}</h2>
            <p className="text-slate-300 text-xl mb-12 max-w-xl mx-auto relative z-10 leading-relaxed">
              {t.ctaDesc}
            </p>
            <div className="flex flex-wrap justify-center gap-6 relative z-10">
              <a 
                href="https://tally.so/r/aQGVKB" 
                target="_blank"
                className="flex items-center gap-3 px-10 py-5 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 hover:scale-105 transition-all shadow-xl shadow-blue-500/20"
              >
                <MessageSquare className="w-6 h-6" />
                {t.navFeedback}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-20 border-t border-white/20 text-center text-slate-500 text-base font-medium">
        <p>{t.footerText}</p>
      </footer>
    </div>
  );
}
