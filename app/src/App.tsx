import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from './i18n';
import { StorageService, isIphone } from './services/platformService';
import { Settings, Loader2, Palette, Box, Zap, Circle, Moon, Volume2, Grid3X3, Monitor, Plus, Crown, Copy, Globe, Mouse, Heart, MessageSquare } from 'lucide-react';
import { HID_CODES } from './constants';
import { Keyboard, KeyboardTheme } from './components/Keyboard';
import { Touchpad } from './components/Touchpad';
import { FlipCounter } from './components/FlipCounter';
import { Modal } from './components/Modal';
import { WifiIndicator } from './components/WifiIndicator';
import { Device, createDevice } from './services/deviceService';
import { connectionService } from './services/connectionService';
import { audioService } from './services/audioService';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AddDevicePage } from './pages/AddDevicePage';
import { QrScannerPage } from './pages/QrScannerPage';
import { initStatusBar, setStatusBarStyle } from './plugins/StatusBarPlugin';
import { browserService } from './plugins/BrowserPlugin';
import { hapticsService } from './plugins/HapticsPlugin';
import { mdnsDiscoveryService } from './services/mdnsDiscoveryService';
import { purchaseService } from './services/purchaseService';
import { adService } from './services/adService';

export type AppLayout = 'default' | 'keyboardOnly' | 'touchpadOnly' | 'touchpadTop';

export default function App() {
  const isPhone = isIphone();
  const navigate = useNavigate();
  const location = useLocation();
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<KeyboardTheme>(
    () => (localStorage.getItem('theme') as KeyboardTheme | null) ?? 'glass'
  );
  const [layout, setLayout] = useState<AppLayout>('default');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [soundVariant, setSoundVariant] = useState<'classic' | 'modern' | 'click'>('modern');
  const [isRippleEnabled, setIsRippleEnabled] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isHapticEnabled, setIsHapticEnabled] = useState(true);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [pressCount, setPressCount] = useState(() => {
    const saved = StorageService.getItem('total_press_count');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [isTouchpadPopupVisible, setIsTouchpadPopupVisible] = useState(false);
  const [newDeviceIp, setNewDeviceIp] = useState('');
  const [newDevicePort, setNewDevicePort] = useState('8333');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [isSystemKeysOpen, setIsSystemKeysOpen] = useState(false);
  const [isNumPadOpen, setIsNumPadOpen] = useState(false);
  const [touchSensitivity, setTouchSensitivity] = useState(1.5);
  const [naturalScroll, setNaturalScroll] = useState(true);
  const [isHapticSupported, setIsHapticSupported] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const openingLockRef = useRef(false);
  const devicesRef = useRef<Device[]>([]);
  const isSwitchingRef = useRef(false);
  // Ref to the switch function so the connection-change callback can call it
  // without a stale closure (defined after the state declarations)
  const doSwitchDeviceRef = useRef<(id: string) => Promise<void>>(async () => {});

  // 检测设备是否支持震动
  useEffect(() => {
    const checkSupport = async () => {
      // 延迟检查，等待 hapticsService 初始化完成
      setTimeout(() => {
        setIsHapticSupported(hapticsService.isSupported());
      }, 500);
    };
    checkSupport();
  }, []);

  // Initialize purchase service and check purchase status
  useEffect(() => {
    const initPurchase = async () => {
      await purchaseService.initialize();
      const proStatus = await purchaseService.isPro();
      setIsPro(proStatus);

      // Subscribe to purchase status changes
      const unsubscribe = purchaseService.onPurchaseStatusChanged((isPro) => {
        setIsPro(isPro);
        if (isPro) {
          adService.disableAds();
          adService.removeBanner();
        }
      });

      return unsubscribe;
    };

    initPurchase();
  }, []);

  // Initialize ad service and show banner if not pro
  useEffect(() => {
    const initAds = async () => {
      // Set up callback for when user closes the banner (session-only dismiss)
      adService.setOnRemoveAdsCallback(() => {
        adService.removeBanner();
      });

      await adService.initialize();
      if (!isPro && adService.areAdsEnabled()) {
        await adService.showBanner();
      }
    };

    initAds();

    return () => {
      adService.removeBanner();
    };
  }, [isPro]);

  // Sync html gradient with theme so safe-area insets blend seamlessly.
  // The body is transparent; html carries the gradient that shows through safe areas.
  useEffect(() => {
    const gradients: Record<KeyboardTheme, string> = {
      glass:     'linear-gradient(180deg, #111116 0%, #0a0a0e 100%)',
      retro:     'linear-gradient(180deg, #d8d8d8 0%, #c8c8c8 100%)',
      cyberpunk: 'linear-gradient(180deg, #08080f 0%, #050505 100%)',
      minimal:   'linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%)',
      amoled:    '#000000',
      pink:      'linear-gradient(180deg, #fff5f9 0%, #fce7f3 100%)',
    };
    document.documentElement.style.background = gradients[theme];
    document.body.style.background = 'transparent';
    localStorage.setItem('theme', theme);

    // Update status bar style based on theme (light themes need dark text, dark themes need light text)
    const isLightTheme = theme === 'minimal' || theme === 'retro' || theme === 'pink';
    setStatusBarStyle(isLightTheme);
  }, [theme]);

  // Track held modifier keys for combo support
  const heldModifiersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (pressedKey) {
      const timer = setTimeout(() => setPressedKey(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [pressedKey]);

  // Keep refs so event callbacks always see latest values
  const activeDeviceIdRef = useRef(activeDeviceId);
  useEffect(() => { activeDeviceIdRef.current = activeDeviceId; }, [activeDeviceId]);
  useEffect(() => { devicesRef.current = devices; }, [devices]);

  // Single listener handles ALL devices' connection state changes.
  // connectionId = device.id, so we update exactly the right device.
  useEffect(() => {
    const unsub = connectionService.onConnectionChange((deviceId, connected) => {
      // Update that specific device's isOnline flag
      setDevices((prev: Device[]) => prev.map((d: Device) =>
        d.id === deviceId ? { ...d, isOnline: connected } : d
      ));

      if (connected && deviceId === activeDeviceIdRef.current) {
        // Active device reconnected — release any stuck modifier keys
        if (heldModifiersRef.current.size > 0) {
          heldModifiersRef.current.forEach(key => {
            const lookupKey = key.length === 1 ? key.toUpperCase() : key;
            const hidCode = HID_CODES[lookupKey];
            if (hidCode !== undefined) connectionService.sendKeyUp(hidCode);
          });
          heldModifiersRef.current.clear();
        }
      }

      if (!connected && deviceId === activeDeviceIdRef.current) {
        // Active device went offline — auto-switch to another already-connected device
        const other = devicesRef.current.find(
          d => d.id !== deviceId && d.isOnline
        );
        if (other) {
          // Small delay so the isOnline state update has propagated
          setTimeout(() => {
            if (!connectionService.isConnected(activeDeviceIdRef.current)) {
              doSwitchDeviceRef.current(other.id);
            }
          }, 300);
        }
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Initialize status bar
    initStatusBar();

    // Start MDNS discovery for auto-connect
    mdnsDiscoveryService.startDiscovery(true);

    // If no connected device is found after 5s and tutorial was never dismissed, show it
    const tutorialDismissed = StorageService.getItem('tutorial_dismissed') === 'true';
    let tutorialTimer: ReturnType<typeof setTimeout> | null = null;
    if (!tutorialDismissed) {
      tutorialTimer = setTimeout(() => {
        // Check if there's any connected device
        const hasConnectedDevice = devicesRef.current.some((d: Device) => d.isOnline);
        if (!hasConnectedDevice) {
          setIsTutorialModalOpen(true);
        }
      }, 5000);
    }

    // Listen for discovered devices
    const unsubscribe = mdnsDiscoveryService.onDevicesDiscovered((devices) => {
      if (devices.length > 0) {
        console.log('[App] Discovered devices via MDNS:', devices);
        setDevices((prev: Device[]) => {
          const newDevices = [...prev];
          devices.forEach(discoveredDevice => {
            const exists = newDevices.some((d: Device) => d.ip === discoveredDevice.ip && d.port === discoveredDevice.port);
            if (!exists) {
              newDevices.push(discoveredDevice);
              // Auto-set as active device if none is active yet
              if (!activeDeviceIdRef.current) {
                connectionService.setActive(discoveredDevice.id);
                setActiveDeviceId(discoveredDevice.id);
                activeDeviceIdRef.current = discoveredDevice.id;
              }
            }
          });
          return newDevices;
        });
      }
    });

    return () => {
      if (tutorialTimer) clearTimeout(tutorialTimer);
      unsubscribe();
      mdnsDiscoveryService.stopDiscovery();
    };
  }, []);

  useEffect(() => {
    const handleGlobalTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        // For buttons, we want to allow the click event but prevent the double trigger
        // However, preventDefault() on touchstart often prevents the click event entirely.
        // A better way is to use a flag or to handle the interaction specifically.
      }
    };

    // Instead of a global listener that might break things, let's add a CSS fix
    // and ensure all buttons are handled correctly.
    // The previous CSS change to touch-action: manipulation should have helped.
    
    // Let's also add a specific fix for the Keyboard and Touchpad components
    // to ensure they don't propagate events that might trigger a click on a parent.
  }, []);

  // Helper function to show toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleKeyAction = async (key: string, isRelease: boolean = false) => {
    if (!connectionService.isConnected()) {
      if (!isRelease) audioService.playErrorBeep();
      return;
    }

    const modifierKeys = ['Ctrl', 'Alt', 'Win', 'Menu', 'Shift', 'L-Shift', 'R-Shift', 'Fn', 'Caps'];
    const isModifier = modifierKeys.includes(key);

    if (!isRelease) setPressedKey(key);

    // Track modifier key states
    if (isModifier) {
      if (isRelease) {
        heldModifiersRef.current.delete(key);
      } else {
        heldModifiersRef.current.add(key);
      }
    }

    // Haptic feedback on key press
    if (!isRelease && isHapticEnabled) {
      hapticsService.keyPress();
    }

    // Sound feedback on key press
    if (!isRelease && isSoundEnabled) {
      audioService.playClickSound(soundVariant);
    }

    // MENU key → right mouse click (press+release on keydown only)
    if (key === 'Menu') {
      if (!isRelease) {
        await connectionService.sendMouseButton(0x02, true);
        setTimeout(() => connectionService.sendMouseButton(0x02, false), 50);
        setPressCount((prev: number) => {
          const next = prev >= 99999 ? 0 : prev + 1;
          StorageService.setItem('total_press_count', String(next));
          return next;
        });
      }
      return;
    }

    const lookupKey = key.length === 1 ? key.toUpperCase() : key;
    const hidCode = HID_CODES[lookupKey];

    if (hidCode !== undefined) {
      const hexCode = `0x${hidCode.toString(16).toUpperCase().padStart(2, '0')}`;
      console.log(`Key: ${key}, HID Code: ${hexCode}, Release: ${isRelease}`);

      if (isRelease) {
        await connectionService.sendKeyUp(hidCode);
      } else {
        if (!isModifier) {
          // Regular key: tap it. If modifiers are held they're already down on the PC.
          await connectionService.sendKeyDown(hidCode);
          setTimeout(() => connectionService.sendKeyUp(hidCode), 50);
        } else {
          // Modifier key: hold it down on PC until released
          await connectionService.sendKeyDown(hidCode);
        }
      }

      if (!isRelease) {
        setPressCount((prev: number) => {
          const next = prev >= 99999 ? 0 : prev + 1;
          StorageService.setItem('total_press_count', String(next));
          return next;
        });
      }
    } else {
      console.log(`Key: ${key}, HID Code: Unknown`);
    }
  };

  // Touchpad 直接调用 connectionService 发送网络事件；此回调仅用于更新按压次数
  const handleMouseAction = (action: string) => {
    if (!connectionService.isConnected()) return;
    console.log(`[Mouse Action] ${action}`);

    // Haptic feedback on mouse action
    if (isHapticEnabled) {
      hapticsService.keyPress();
    }

    // Sound feedback on mouse action
    if (isSoundEnabled) {
      audioService.playClickSound(soundVariant);
    }

    setPressCount((prev: number) => {
      const next = prev >= 99999 ? 0 : prev + 1;
      StorageService.setItem('total_press_count', String(next));
      return next;
    });
  };

  useEffect(() => {
    const savedLang = StorageService.getItem('app_lang') as string;
    const availableLangs = Object.keys(translations);
    
    if (savedLang && availableLangs.includes(savedLang)) {
      setLang(savedLang as Language);
    } else {
      const fullLang = navigator.language;
      const shortLang = fullLang.split('-')[0];
      
      if (fullLang === 'zh-CN') {
        setLang('zhCN');
      } else if (fullLang === 'zh-TW' || fullLang === 'zh-HK') {
        setLang('zhTW');
      } else if (availableLangs.includes(fullLang.replace('-', ''))) {
        setLang(fullLang.replace('-', '') as Language);
      } else if (availableLangs.includes(shortLang)) {
        setLang(shortLang as Language);
      } else {
        setLang('en');
      }
    }

    const savedSound = StorageService.getItem('sound_variant') as 'classic' | 'modern' | 'click';
    if (savedSound) {
      setSoundVariant(savedSound);
    }

    const savedRipple = StorageService.getItem('is_ripple_enabled');
    if (savedRipple !== null) {
      setIsRippleEnabled(savedRipple === 'true');
    }

    const savedSoundEnabled = StorageService.getItem('is_sound_enabled');
    if (savedSoundEnabled !== null) {
      setIsSoundEnabled(savedSoundEnabled === 'true');
    }

    const savedLayout = StorageService.getItem('app_layout') as AppLayout;
    if (savedLayout) {
      setLayout(savedLayout);
    }

    const savedSensitivity = StorageService.getItem('touch_sensitivity');
    if (savedSensitivity) {
      setTouchSensitivity(parseFloat(savedSensitivity));
    }

    const savedNaturalScroll = StorageService.getItem('natural_scroll');
    if (savedNaturalScroll !== null) {
      setNaturalScroll(savedNaturalScroll === 'true');
    }
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    StorageService.setItem('app_lang', newLang);
    setIsLangModalOpen(false);
  };

  const changeSoundVariant = (variant: 'classic' | 'modern' | 'click') => {
    setSoundVariant(variant);
    StorageService.setItem('sound_variant', variant);
    // Play preview
    audioService.playClickSound(variant);
  };

  const toggleRipple = () => {
    const newValue = !isRippleEnabled;
    setIsRippleEnabled(newValue);
    StorageService.setItem('is_ripple_enabled', String(newValue));
  };

  const toggleSound = () => {
    const newValue = !isSoundEnabled;
    setIsSoundEnabled(newValue);
    StorageService.setItem('is_sound_enabled', String(newValue));
  };

  const changeLayout = (newLayout: AppLayout) => {
    setLayout(newLayout);
    StorageService.setItem('app_layout', newLayout);
  };

  const changeSensitivity = (value: number) => {
    setTouchSensitivity(value);
    StorageService.setItem('touch_sensitivity', String(value));
  };

  const toggleNaturalScroll = () => {
    const newValue = !naturalScroll;
    setNaturalScroll(newValue);
    StorageService.setItem('natural_scroll', String(newValue));
  };

  const handleSwitchDevice = (id: string) => doSwitchDeviceRef.current(id);

  // Keep doSwitchDeviceRef in sync with latest state/refs so the
  // onConnectionChange callback can call it without stale closures.
  // Defined with useEffect so it runs after every render where deps change.
  useEffect(() => {
    doSwitchDeviceRef.current = async (id: string) => {
      if (id === activeDeviceId) return;
      if (isSwitchingRef.current) return;          // prevent concurrent switches

      const device = devicesRef.current.find((d: Device) => d.id === id);
      if (!device) return;

      isSwitchingRef.current = true;
      setIsSwitching(true);

      // If the target device is already connected, just switch active — instant.
      // Otherwise open a new connection (previous connections stay alive).
      if (!connectionService.isConnected(id)) {
        const port = parseInt(device.port || '8333', 10);
        const result = await connectionService.connect(id, device.ip, port);
        if (!result.success) {
          isSwitchingRef.current = false;
          setIsSwitching(false);
          return;
        }
      }

      connectionService.setActive(id);
      activeDeviceIdRef.current = id;
      setActiveDeviceId(id);

      isSwitchingRef.current = false;
      setIsSwitching(false);
    };
  }, [activeDeviceId]);

  const activeDevice = devices.find(d => d.id === activeDeviceId);
  const accentColor = activeDevice?.color || '#34D399';
  const t = translations[lang] || translations['en'];

  const getAppThemeStyles = () => {
    switch (theme) {
      case 'retro':
        return 'text-[#333] font-serif';
      case 'cyberpunk':
        return 'text-white font-mono';
      case 'minimal':
        return 'text-black font-sans';
      case 'amoled':
        return 'text-white font-sans';
      case 'pink':
        return 'text-[#831843] font-sans';
      default: // glass
        return 'text-white font-sans';
    }
  };

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const isAnyModalOpen = isLangModalOpen || isSettingsModalOpen || isTutorialModalOpen || isPurchaseModalOpen || isFeedbackModalOpen;

  return (
    <div 
      className={`relative w-full h-screen flex flex-col items-center justify-start overflow-hidden bg-transparent ${getAppThemeStyles()}`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.2rem)' }}
    >
      {/* Background Decorative Elements */}
      {theme === 'cyberpunk' && (
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-50 opacity-20" />
      )}

      {/* Top Controls Bar */}
      <div className="relative w-full max-w-[68rem] mx-auto grid grid-cols-[1fr_auto_1fr] items-center mb-[0.2rem] z-10 h-[2.5rem]" style={{ paddingLeft: 'calc(env(safe-area-inset-left) + 0.2rem)', paddingRight: 'calc(env(safe-area-inset-right) + 0.2rem)' }}>
        <div className="flex justify-start h-full items-center gap-[0.4rem]">
          {isPhone && (
            <button
              onPointerDown={() => setIsTouchpadPopupVisible(true)}
              onPointerUp={() => setIsTouchpadPopupVisible(false)}
              onPointerLeave={() => setIsTouchpadPopupVisible(false)}
              onPointerCancel={() => setIsTouchpadPopupVisible(false)}
              className={`p-[0.5rem] h-[2rem] w-[2rem] rounded-full transition-all flex items-center justify-center select-none flex-shrink-0 ${
                isTouchpadPopupVisible
                  ? 'bg-emerald-500 text-white'
                  : theme === 'minimal' ? 'bg-black/5 hover:bg-black/10' :
                    theme === 'retro' ? 'bg-black/10 hover:bg-black/20' :
                    'glass-effect hover:bg-white/10'
              }`}
            >
              <Mouse size={16} />
            </button>
          )}
          <div className="h-full flex items-center">
            <WifiIndicator
              devices={devices}
              activeDeviceId={activeDeviceId}
              onSwitchDevice={handleSwitchDevice}
              onAddDevice={() => navigate('/add-device')}
              onTutorialClick={() => setIsTutorialModalOpen(true)}
              theme={theme}
              offlineText={t.offline}
            />
          </div>
        </div>

        {/* Flip-board Press Count Display - Centered in the grid */}
        {!isPhone && (
          <div className="flex justify-center pointer-events-none h-full items-center">
            <FlipCounter count={pressCount} theme={theme} />
          </div>
        )}
        {isPhone && <div />}

        <div className="flex justify-end gap-[0.6rem] h-full items-center flex-nowrap">
          <button
            onClick={(e) => { e.stopPropagation(); setIsSettingsModalOpen(true); }}
            className={`p-[0.5rem] h-[2rem] w-[2rem] rounded-full transition-all active:scale-90 flex items-center justify-center ${
              theme === 'minimal' ? 'bg-black/5 hover:bg-black/10' :
              theme === 'retro' ? 'bg-black/10 hover:bg-black/20' :
              'glass-effect hover:bg-white/10'
            }`}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Switching Overlay */}
      <AnimatePresence>
        {isSwitching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/60 px-[2rem] py-[1rem] rounded-2xl flex items-center gap-[1rem] border border-white/10 shadow-2xl">
              <Loader2 size={24} className="text-white animate-spin" />
              <span className="text-white font-medium tracking-wide">Switching Device...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-[1rem] left-1/2 -translate-x-1/2 z-[300] px-[1rem] py-[0.5rem] rounded-full bg-black/70 text-white text-[0.8rem] font-medium pointer-events-none shadow-lg"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Touchpad popup overlay (iPhone only) — slides in from the right */}
      <AnimatePresence>
        {isPhone && isTouchpadPopupVisible && (
          <>
            {/* Full screen mask/backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[199] bg-black/50 backdrop-blur-sm"
              onClick={() => setIsTouchpadPopupVisible(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed right-0 top-0 bottom-0 z-[200] flex flex-col"
              style={{ width: '60%' }}
            >
              <Touchpad
                accentColor={accentColor}
                theme={theme}
                isSystemKeysOpen={false}
                isNumPadOpen={false}
                onKeyAction={handleKeyAction}
                onMouseAction={handleMouseAction}
                sensitivity={touchSensitivity}
                naturalScroll={naturalScroll}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className={`w-full flex-grow flex flex-col items-center gap-[0.5rem] overflow-hidden pb-[1rem] ${isAnyModalOpen ? 'pointer-events-none select-none' : ''}`}>
        {isPhone ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-[68rem] mx-auto flex-grow flex flex-col justify-center"
            style={{ paddingLeft: 'calc(env(safe-area-inset-left) + 0.2rem)', paddingRight: 'calc(env(safe-area-inset-right) + 0.2rem)' }}
          >
            <Keyboard
              onKeyAction={handleKeyAction}
              soundVariant={soundVariant}
              accentColor={accentColor}
              theme={theme}
              isRippleEnabled={isRippleEnabled}
              isSoundEnabled={isSoundEnabled}
            />
          </motion.div>
        ) : null}
        {!isPhone && (layout === 'default' || layout === 'touchpadTop') && (
          <>
            <motion.div 
              initial={{ y: layout === 'default' ? -20 : 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`w-full max-w-[68rem] mx-auto flex justify-center flex-shrink-0 ${layout === 'touchpadTop' ? 'order-2' : 'order-1'}`}
              style={{ paddingLeft: 'calc(env(safe-area-inset-left) + 0.2rem)', paddingRight: 'calc(env(safe-area-inset-right) + 0.2rem)' }}
            >
              <Keyboard 
                onKeyAction={handleKeyAction} 
                soundVariant={soundVariant} 
                accentColor={accentColor}
                theme={theme}
                isRippleEnabled={isRippleEnabled}
                isSoundEnabled={isSoundEnabled}
              />
            </motion.div>

            <motion.div
              initial={{ y: layout === 'default' ? 20 : -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              className={`w-full flex-grow flex flex-col justify-center min-h-0 relative ${layout === 'touchpadTop' ? 'order-1' : 'order-2'}`}
              style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
            >
              <Touchpad
                accentColor={accentColor}
                theme={theme}
                isSystemKeysOpen={isSystemKeysOpen}
                isNumPadOpen={isNumPadOpen}
                onKeyAction={handleKeyAction}
                onMouseAction={handleMouseAction}
                sensitivity={touchSensitivity}
                naturalScroll={naturalScroll}
              />
              {layout === 'touchpadTop' && (
                <>
                  <div className="absolute bottom-[1.5rem] left-[1.5rem] z-50">
                    <button
                      onClick={() => setIsSystemKeysOpen(!isSystemKeysOpen)}
                      className={`p-[0.6rem] rounded-full transition-all active:scale-90 shadow-lg ${
                        isSystemKeysOpen
                          ? 'bg-emerald-500 text-white'
                          : (theme === 'pink' ? 'bg-[#fce7f3] hover:bg-[#f9a8d4] text-[#831843] border border-[#fbcfe8] shadow-sm' : theme === 'minimal' || theme === 'retro' ? 'bg-black/5 hover:bg-black/10 text-black' : 'glass-effect hover:bg-white/10 text-white')
                      }`}
                    >
                      <Box size={16} />
                    </button>
                  </div>
                  <div className="absolute bottom-[1.5rem] right-[1.5rem] z-50">
                    <button
                      onClick={() => setIsNumPadOpen(!isNumPadOpen)}
                      className={`p-[0.6rem] rounded-full transition-all active:scale-90 shadow-lg ${
                        isNumPadOpen
                          ? 'bg-emerald-500 text-white'
                          : (theme === 'pink' ? 'bg-[#fce7f3] hover:bg-[#f9a8d4] text-[#831843] border border-[#fbcfe8] shadow-sm' : theme === 'minimal' || theme === 'retro' ? 'bg-black/5 hover:bg-black/10 text-black' : 'glass-effect hover:bg-white/10 text-white')
                      }`}
                    >
                      <Grid3X3 size={16} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}

        {!isPhone && layout === 'keyboardOnly' && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-[68rem] mx-auto flex-grow flex flex-col justify-start pt-[0.5rem]"
            style={{ paddingLeft: 'calc(env(safe-area-inset-left) + 0.2rem)', paddingRight: 'calc(env(safe-area-inset-right) + 0.2rem)' }}
          >
            <Keyboard
              onKeyAction={handleKeyAction}
              soundVariant={soundVariant}
              accentColor={accentColor}
              theme={theme}
              isRippleEnabled={isRippleEnabled}
              isSoundEnabled={isSoundEnabled}
            />
            {/* Side panels rendered below keyboard when in keyboardOnly mode */}
            {(isSystemKeysOpen || isNumPadOpen) && (
              <Touchpad
                hideTouchpadArea
                theme={theme}
                isSystemKeysOpen={isSystemKeysOpen}
                isNumPadOpen={isNumPadOpen}
                onKeyAction={handleKeyAction}
                onMouseAction={handleMouseAction}
                sensitivity={touchSensitivity}
              />
            )}
          </motion.div>
        )}

        {!isPhone && layout === 'touchpadOnly' && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full flex-grow flex flex-col justify-center"
            style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
          >
            {/* Force panels closed in touchpadOnly — icons are hidden, panels should be too */}
            <Touchpad
              accentColor={accentColor}
              theme={theme}
              isSystemKeysOpen={false}
              isNumPadOpen={false}
              onKeyAction={handleKeyAction}
              onMouseAction={handleMouseAction}
              sensitivity={touchSensitivity}
            />
          </motion.div>
        )}
      </div>

      {/* Side Panel Icons — hidden for touchpadOnly/touchpadTop (touchpadTop inlines them) */}
      {!isPhone && layout !== 'touchpadOnly' && layout !== 'touchpadTop' && (
        <>
          <div className="fixed bottom-[1.5rem] left-[1.5rem] z-50">
            <button
              onClick={() => setIsSystemKeysOpen(!isSystemKeysOpen)}
              className={`p-[0.6rem] rounded-full transition-all active:scale-90 shadow-lg ${
                isSystemKeysOpen
                  ? 'bg-emerald-500 text-white'
                  : (theme === 'pink' ? 'bg-[#fce7f3] hover:bg-[#f9a8d4] text-[#831843] border border-[#fbcfe8] shadow-sm' : theme === 'minimal' || theme === 'retro' ? 'bg-black/5 hover:bg-black/10 text-black' : 'glass-effect hover:bg-white/10 text-white')
              }`}
            >
              <Box size={16} />
            </button>
          </div>
          <div className="fixed bottom-[1.5rem] right-[1.5rem] z-50">
            <button
              onClick={() => setIsNumPadOpen(!isNumPadOpen)}
              className={`p-[0.6rem] rounded-full transition-all active:scale-90 shadow-lg ${
                isNumPadOpen
                  ? 'bg-emerald-500 text-white'
                  : (theme === 'pink' ? 'bg-[#fce7f3] hover:bg-[#f9a8d4] text-[#831843] border border-[#fbcfe8] shadow-sm' : theme === 'minimal' || theme === 'retro' ? 'bg-black/5 hover:bg-black/10 text-black' : 'glass-effect hover:bg-white/10 text-white')
              }`}
            >
              <Grid3X3 size={16} />
            </button>
          </div>
        </>
      )}

      {/* Footer Info */}
      <div className="absolute bottom-[1rem] right-[1.5rem] pointer-events-none z-0">
        <div className="text-white/10 text-[0.6rem] uppercase tracking-[0.2rem] font-medium whitespace-nowrap">
          Designed for iPad Pro
        </div>
      </div>

      {/* Routed Modals */}
      <Routes>
        <Route path="/add-device" element={<AddDevicePage lang={lang} theme={theme} devices={devices} setDevices={setDevices} setActiveDeviceId={setActiveDeviceId} />} />
        <Route path="/scan-qr" element={<QrScannerPage theme={theme} />} />
      </Routes>

      {/* Modals */}
      <Modal 
        isOpen={isLangModalOpen} 
        onClose={() => setIsLangModalOpen(false)} 
        title={t.language}
        theme={theme}
      >
        <div className="grid grid-cols-2 gap-[0.8rem]">
          {(Object.keys(translations) as Language[]).map((l) => {
            const names: Record<Language, { native: string; english: string }> = {
              en: { native: 'English', english: 'English' },
              zhCN: { native: '简体中文', english: 'Chinese (Simplified)' },
              zhTW: { native: '繁體中文', english: 'Chinese (Traditional)' },
              ja: { native: '日本語', english: 'Japanese' },
              ko: { native: '한국어', english: 'Korean' },
              fr: { native: 'Français', english: 'French' },
              de: { native: 'Deutsch', english: 'German' },
              es: { native: 'Español', english: 'Spanish' },
              pt: { native: 'Português', english: 'Portuguese' },
              ru: { native: 'Русский', english: 'Russian' },
              hi: { native: 'हिन्दी', english: 'Hindi' },
              id: { native: 'Bahasa Indonesia', english: 'Indonesian' },
              vi: { native: 'Tiếng Việt', english: 'Vietnamese' },
              ar: { native: 'العربية', english: 'Arabic' },
            };
            return (
              <motion.button
                key={l}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => changeLanguage(l)}
                style={{ touchAction: 'pan-y' }}
                className={`
                  p-[1rem] rounded-[1.2rem] text-left transition-all border flex flex-col gap-[0.4rem] relative overflow-hidden
                  ${theme === 'minimal' || theme === 'retro' || theme === 'pink'
                    ? (lang === l ? 'bg-black text-white border-black' : 'bg-black/5 border-transparent hover:bg-black/10')
                    : (lang === l ? 'bg-white text-black border-white' : 'bg-white/5 border-transparent hover:bg-white/10')
                  }
                `}
              >
                <div className="flex items-center justify-end w-full">
                  {lang === l && (
                    <motion.div
                      layoutId="active-lang"
                      className={`w-[0.4rem] h-[0.4rem] rounded-full ${theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-white' : 'bg-black'}`}
                    />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[0.9rem] font-bold leading-tight">{names[l].native}</span>
                  <span className={`text-[0.65rem] opacity-50 font-medium ${lang === l ? 'text-inherit' : ''}`}>
                    {names[l].english}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </Modal>

      <Modal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        title={t.settings}
        theme={theme}
      >
        <div className="flex flex-col gap-[1.5rem]">
          {/* Theme */}
          <div className="flex flex-col gap-[0.8rem]">
            <span className="text-[0.9rem] opacity-60 ml-[0.5rem]">Theme</span>
            <div className={`grid grid-cols-3 gap-[0.3rem] p-[0.3rem] rounded-[1rem] ${
              theme === 'minimal' ? 'bg-black/5 border border-black/5' :
              theme === 'retro' ? 'bg-black/10 border border-black/10' :
              theme === 'pink' ? 'bg-[#fce7f3] border border-[#fbcfe8]' :
              'glass-effect bg-white/5 border border-white/5'
            }`}>
              {([
                { id: 'glass', icon: <Box size={14} />, label: 'Glass' },
                { id: 'retro', icon: <Palette size={14} />, label: 'Retro' },
                { id: 'cyberpunk', icon: <Zap size={14} />, label: 'Cyber' },
                { id: 'minimal', icon: <Circle size={14} />, label: 'Minimal' },
                { id: 'amoled', icon: <Moon size={14} />, label: 'AMOLED' },
                { id: 'pink', icon: <Heart size={14} />, label: 'Pink' },
              ] as { id: KeyboardTheme; icon: React.ReactNode; label: string }[]).map(item => (
                <button
                  key={item.id}
                  onClick={() => setTheme(item.id)}
                  title={item.label}
                  className={`flex items-center justify-center gap-[0.3rem] py-[0.5rem] rounded-[0.7rem] transition-all text-[0.7rem] font-medium ${
                    theme === item.id
                      ? (theme === 'pink' ? 'bg-[#ec4899] text-white' : theme === 'minimal' || theme === 'retro' ? 'bg-black text-white' : 'bg-white/20 text-white')
                      : (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'text-black/50 hover:text-black/70 hover:bg-black/5' : 'text-white/40 hover:text-white/60 hover:bg-white/5')
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language — single row, opens the language modal */}
          <button
            onClick={() => { setIsSettingsModalOpen(false); setIsLangModalOpen(true); }}
            className={`flex items-center justify-between p-[1rem] rounded-[1.5rem] transition-all ${
              theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-[0.8rem]">
              <Globe size={16} className="opacity-60" />
              <span className="text-[0.9rem]">{t.language}</span>
            </div>
            <div className="flex items-center gap-[0.5rem] opacity-60">
              <span className="text-[0.8rem]">{translations[lang].name}</span>
              <span className="text-[0.7rem]">›</span>
            </div>
          </button>

          <div className="flex flex-col gap-[0.8rem]">
            <span className="text-[0.9rem] opacity-60 ml-[0.5rem]">{t.soundVariant}</span>
            <div className="grid grid-cols-2 gap-[0.8rem]">
              {[
                { id: 'classic', label: t.soundClassic, sub: 'Classic' },
                { id: 'modern', label: t.soundModern, sub: 'Modern' },
                { id: 'click', label: t.soundClick, sub: 'Click' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => changeSoundVariant(item.id as any)}
                  className={`p-[0.8rem] rounded-[1.2rem] transition-all border text-left flex flex-col gap-[0.2rem] ${
                    theme === 'minimal' || theme === 'retro' || theme === 'pink'
                      ? (soundVariant === item.id ? 'border-black/40 bg-black/10' : 'border-transparent bg-black/5')
                      : (soundVariant === item.id ? 'border-white/40 bg-white/10' : 'border-transparent bg-white/5')
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[0.9rem] font-medium">{item.label}</span>
                    {soundVariant === item.id && <Volume2 size={12} className="opacity-60" />}
                  </div>
                  <span className="text-[0.7rem] opacity-40">{item.sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={`flex items-center justify-between p-[1rem] rounded-[1.5rem] ${
            theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/5' : 'bg-white/5'
          }`}>
            <span>{t.rippleEffect}</span>
            <button 
              onClick={toggleRipple}
              className={`w-[3rem] h-[1.5rem] rounded-full relative transition-colors duration-300 ${
                isRippleEnabled 
                  ? (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black' : 'bg-white') 
                  : (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/20' : 'bg-white/20')
              }`}
            >
              <motion.div 
                animate={{ x: isRippleEnabled ? '1.5rem' : '0.2rem' }}
                className={`absolute top-[0.2rem] w-[1.1rem] h-[1.1rem] rounded-full ${
                  theme === 'minimal' || theme === 'retro' || theme === 'pink' 
                    ? (isRippleEnabled ? 'bg-white' : 'bg-black/40') 
                    : (isRippleEnabled ? 'bg-black' : 'bg-white/40')
                }`} 
              />
            </button>
          </div>
          <div className={`flex items-center justify-between p-[1rem] rounded-[1.5rem] ${
            theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/5' : 'bg-white/5'
          }`}>
            <span>{t.soundEnabled}</span>
            <button 
              onClick={toggleSound}
              className={`w-[3rem] h-[1.5rem] rounded-full relative transition-colors duration-300 ${
                isSoundEnabled 
                  ? (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black' : 'bg-white') 
                  : (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/20' : 'bg-white/20')
              }`}
            >
              <motion.div 
                animate={{ x: isSoundEnabled ? '1.5rem' : '0.2rem' }}
                className={`absolute top-[0.2rem] w-[1.1rem] h-[1.1rem] rounded-full ${
                  theme === 'minimal' || theme === 'retro' || theme === 'pink' 
                    ? (isSoundEnabled ? 'bg-white' : 'bg-black/40') 
                    : (isSoundEnabled ? 'bg-black' : 'bg-white/40')
                }`} 
              />
            </button>
          </div>
          <div className={`flex items-center justify-between p-[1rem] rounded-[1.5rem] ${
            theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/5' : 'bg-white/5'
          }`}>
            <div className="flex flex-col">
              <span>Haptic Feedback</span>
              {!isHapticSupported && (
                <span className="text-[0.7rem] opacity-50">Not supported on this device</span>
              )}
            </div>
            <button 
              onClick={() => {
                setIsHapticEnabled(!isHapticEnabled);
                if (!isHapticEnabled && isHapticSupported) {
                  // 开启时触发一次震动反馈
                  hapticsService.toggle();
                }
              }}
              disabled={!isHapticSupported}
              className={`w-[3rem] h-[1.5rem] rounded-full relative transition-colors duration-300 ${
                !isHapticSupported
                  ? (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/10' : 'bg-white/10')
                  : isHapticEnabled 
                    ? (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black' : 'bg-white') 
                    : (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/20' : 'bg-white/20')
              }`}
            >
              <motion.div 
                animate={{ x: isHapticEnabled && isHapticSupported ? '1.5rem' : '0.2rem' }}
                className={`absolute top-[0.2rem] w-[1.1rem] h-[1.1rem] rounded-full ${
                  !isHapticSupported
                    ? (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/20' : 'bg-white/20')
                    : theme === 'minimal' || theme === 'retro' || theme === 'pink' 
                      ? (isHapticEnabled ? 'bg-white' : 'bg-black/40') 
                      : (isHapticEnabled ? 'bg-black' : 'bg-white/40')
                }`} 
              />
            </button>
          </div>

          <div className={`flex flex-col gap-[0.8rem] p-[1rem] rounded-[1.5rem] ${
            theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/5' : 'bg-white/5'
          }`}>
            <div className="flex items-center justify-between mb-[0.5rem]">
              <span className="text-[0.9rem]">Touch Sensitivity</span>
              <span className="text-[0.8rem] font-mono opacity-60">{touchSensitivity.toFixed(1)}x</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="5.0" 
              step="0.1" 
              value={touchSensitivity}
              onChange={(e) => changeSensitivity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-emerald-500/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className={`flex items-center justify-between p-[1rem] rounded-[1.5rem] ${
            theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/5' : 'bg-white/5'
          }`}>
            <div className="flex flex-col">
              <span>Natural Scroll</span>
              <span className="text-[0.7rem] opacity-50">{naturalScroll ? 'Scroll follows finger' : 'Traditional direction'}</span>
            </div>
            <button
              onClick={toggleNaturalScroll}
              className={`w-[3rem] h-[1.5rem] rounded-full relative transition-colors duration-300 ${
                naturalScroll
                  ? (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black' : 'bg-white')
                  : (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/20' : 'bg-white/20')
              }`}
            >
              <motion.div
                animate={{ x: naturalScroll ? '1.5rem' : '0.2rem' }}
                className={`absolute top-[0.2rem] w-[1.1rem] h-[1.1rem] rounded-full ${
                  theme === 'minimal' || theme === 'retro' || theme === 'pink'
                    ? (naturalScroll ? 'bg-white' : 'bg-black/40')
                    : (naturalScroll ? 'bg-black' : 'bg-white/40')
                }`}
              />
            </button>
          </div>

          {!isPhone && (
            <div className="flex flex-col gap-[0.8rem]">
              <span className="text-[0.9rem] opacity-60 ml-[0.5rem]">{t.layout}</span>
              <div className="grid grid-cols-2 gap-[0.8rem]">
                {[
                  { id: 'default', label: t.layoutDefault },
                  { id: 'keyboardOnly', label: t.layoutKeyboardOnly },
                  { id: 'touchpadOnly', label: t.layoutTouchpadOnly },
                  { id: 'touchpadTop', label: t.layoutTouchpadTop }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => changeLayout(item.id as AppLayout)}
                    className={`p-[0.8rem] rounded-[1rem] text-[0.8rem] font-medium transition-all border ${
                      theme === 'minimal' || theme === 'retro' || theme === 'pink'
                        ? (layout === item.id ? 'border-black/40 bg-black/10' : 'border-transparent bg-black/5 hover:bg-black/10')
                        : (layout === item.id ? 'border-white/40 bg-white/10' : 'border-transparent bg-white/5 hover:bg-white/10')
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback — always last */}
          <button
            onClick={() => { setIsSettingsModalOpen(false); setIsFeedbackModalOpen(true); }}
            className={`flex items-center justify-between p-[1rem] rounded-[1.5rem] transition-all ${
              theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-[0.8rem]">
              <MessageSquare size={16} className="opacity-60" />
              <span className="text-[0.9rem]">{t.feedback}</span>
            </div>
            <span className="text-[0.7rem] opacity-40">›</span>
          </button>
        </div>
      </Modal>
      
      <Modal
        isOpen={isTutorialModalOpen}
        onClose={() => {
          setIsTutorialModalOpen(false);
          StorageService.setItem('tutorial_dismissed', 'true');
        }}
        title={
          <div className="flex items-center gap-2">
            <span>{t.tutorialTitle}</span>
            <button
              onClick={() => browserService.openUrl('https://xuwuwei.github.io/keyboard-help/')}
              className="text-[0.7rem] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors underline underline-offset-2 hover:underline-offset-4 flex items-center gap-1"
            >
              {t.detailedTutorial}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        }
        theme={theme}
      >
        <div className="flex flex-col gap-[1.2rem] max-h-[30rem] overflow-y-auto pr-[0.5rem] text-[0.9rem] leading-relaxed">
          <section className="flex flex-col gap-[0.5rem]">
            <h3 className="font-bold text-[1rem] flex items-center gap-[0.5rem]">
              <Monitor size={18} className="text-emerald-500" />
              {t.tutorialStep1Title}
            </h3>
            <p className="opacity-70">{t.tutorialStep1Desc}</p>
            
            <div className={`mt-[0.4rem] p-[1rem] rounded-[1.2rem] border flex flex-col gap-[0.6rem] ${
              theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
            }`}>
              <div className="grid grid-cols-2 gap-[0.6rem]">
                <a
                  href="https://github.com/xuwuwei/keyboard-help/releases/download/0.1.0/MultiLinkServer_0.1.0_universal.dmg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-[0.4rem] px-[0.8rem] py-[0.6rem] rounded-[0.8rem] bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
                >
                  <svg className="w-[16px] h-[16px] text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span className="text-[0.75rem] font-bold text-emerald-500">{t.downloadMac}</span>
                </a>
                <a
                  href="https://github.com/xuwuwei/keyboard-help/releases/download/0.1.0/MultiLinkServer-0.1.0-x86_64.msi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-[0.4rem] px-[0.8rem] py-[0.6rem] rounded-[0.8rem] bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition-colors"
                >
                  <svg className="w-[16px] h-[16px] text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 12V6.75l6-1.32v6.48L3 12m17-9v8.75l-10 .15V5.21L20 3M3 13l6 .09v6.81l-6-1.15V13m17 .25V22l-10-1.91V13.1l10 .15z"/>
                  </svg>
                  <span className="text-[0.75rem] font-bold text-blue-500">{t.downloadWindows}</span>
                </a>
              </div>
              {/* Copy Download Links */}
              <div className="pt-[0.4rem] border-t border-current border-opacity-10 grid grid-cols-2 gap-[0.4rem]">
                <button
                  onClick={() => {
                    const macUrl = 'https://github.com/xuwuwei/keyboard-help/releases/download/0.1.0/MultiLinkServer_0.1.0_universal.dmg';
                    navigator.clipboard.writeText(macUrl);
                    hapticsService.lightImpact();
                    showToast(t.copySuccess);
                  }}
                  className={`flex items-center justify-center gap-[0.3rem] px-[0.6rem] py-[0.4rem] rounded-[0.6rem] text-[0.65rem] font-medium transition-colors ${
                    theme === 'minimal' || theme === 'retro' || theme === 'pink'
                      ? 'bg-black/5 hover:bg-black/10 text-black/60'
                      : 'bg-white/5 hover:bg-white/10 text-white/60'
                  }`}
                >
                  <Copy size={10} />
                  <span>Mac {t.copyUrl}</span>
                </button>
                <button
                  onClick={() => {
                    const winUrl = 'https://github.com/xuwuwei/keyboard-help/releases/download/0.1.0/MultiLinkServer-0.1.0-x86_64.msi';
                    navigator.clipboard.writeText(winUrl);
                    hapticsService.lightImpact();
                    showToast(t.copySuccess);
                  }}
                  className={`flex items-center justify-center gap-[0.3rem] px-[0.6rem] py-[0.4rem] rounded-[0.6rem] text-[0.65rem] font-medium transition-colors ${
                    theme === 'minimal' || theme === 'retro' || theme === 'pink'
                      ? 'bg-black/5 hover:bg-black/10 text-black/60'
                      : 'bg-white/5 hover:bg-white/10 text-white/60'
                  }`}
                >
                  <Copy size={10} />
                  <span>Win {t.copyUrl}</span>
                </button>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-[0.5rem]">
            <h3 className="font-bold text-[1rem] flex items-center gap-[0.5rem]">
              <Zap size={18} className="text-amber-500" />
              {t.tutorialStep2Title}
            </h3>
            <p className="opacity-70">
              {t.tutorialStep2Desc}
            </p>
          </section>

          <section className="flex flex-col gap-[0.5rem]">
            <h3 className="font-bold text-[1rem] flex items-center gap-[0.5rem]">
              <Settings size={18} className="text-blue-500" />
              {t.tutorialStep3Title}
            </h3>
            <div className="bg-black/20 p-[1rem] rounded-[1rem] border border-white/5 flex flex-col gap-[0.6rem]">
              <p className="opacity-70">{t.tutorialStep3Desc1}</p>
              <ul className="list-disc list-inside opacity-70 flex flex-col gap-[0.3rem] ml-[0.5rem]">
                <li>{t.tutorialStep3Desc2}</li>
                <li>{t.tutorialStep3Desc3}</li>
                <li>{t.tutorialStep3Desc4}</li>
              </ul>
            </div>
          </section>

          <section className="flex flex-col gap-[0.5rem]">
            <h3 className="font-bold text-[1rem] flex items-center gap-[0.5rem]">
              <Plus size={18} className="text-purple-500" />
              {t.tutorialStep4Title}
            </h3>
            <p className="opacity-70">
              {t.tutorialStep4Desc}
            </p>
          </section>
        </div>
      </Modal>
      
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title={t.proUpgrade}
        theme={theme}
      >
        <div className="flex flex-col gap-[1.5rem]">
          <div className={`p-[1.5rem] rounded-[2rem] border flex flex-col gap-[1.2rem] relative overflow-hidden ${
            theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            <div className="absolute top-[-1rem] right-[-1rem] opacity-10">
              <Crown size={120} />
            </div>
            
            <div className="flex items-center gap-[1rem]">
              <div className="w-[3.5rem] h-[3.5rem] rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                <Crown size={28} className="fill-current" />
              </div>
              <div>
                <h3 className="text-[1.3rem] font-bold text-amber-600 leading-tight">{t.proLifetime}</h3>
                <p className="text-[0.8rem] opacity-60">{t.proUnlockFeatures}</p>
              </div>
            </div>

            <div className="flex flex-col gap-[0.8rem] bg-white/5 p-[1rem] rounded-[1.2rem] border border-white/5">
              {[
                t.proFeature1,
                t.proFeature2,
                t.proFeature3,
                t.proFeature4,
                t.proFeature5
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-[0.8rem] text-[0.85rem]">
                  <div className="w-[0.5rem] h-[0.5rem] rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="opacity-80">{feature}</span>
                </div>
              ))}
            </div>

            {purchaseError && (
              <div className="p-[0.8rem] rounded-[0.8rem] bg-rose-500/20 text-rose-500 text-[0.85rem] text-center">
                {purchaseError}
              </div>
            )}

            <button
              onClick={async () => {
                setIsPurchasing(true);
                setPurchaseError(null);
                const result = await purchaseService.purchasePro();
                setIsPurchasing(false);
                if (result.success) {
                  setIsPurchaseModalOpen(false);
                  setIsPro(true);
                } else {
                  setPurchaseError(result.error || 'Purchase failed');
                }
              }}
              disabled={isPurchasing}
              className="w-full py-[1.2rem] rounded-[1.5rem] bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-[1.1rem] shadow-xl shadow-amber-500/30 hover:shadow-amber-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[0.5rem]"
            >
              {isPurchasing && <Loader2 size={20} className="animate-spin" />}
              {isPurchasing ? 'Processing...' : t.purchaseNow}
            </button>
          </div>

          <div className="flex flex-col gap-[0.8rem] text-center">
            <p className="text-[0.8rem] font-medium opacity-60">
              {t.oneTimePurchase}
            </p>
            <button
              onClick={async () => {
                setIsPurchasing(true);
                setPurchaseError(null);
                const result = await purchaseService.restorePurchases();
                setIsPurchasing(false);
                if (result.success && result.isPro) {
                  setIsPurchaseModalOpen(false);
                  setIsPro(true);
                } else if (!result.success) {
                  setPurchaseError(result.error || 'Restore failed');
                } else {
                  setPurchaseError('No previous purchases found');
                }
              }}
              disabled={isPurchasing}
              className={`text-[0.75rem] font-medium opacity-50 hover:opacity-80 transition-opacity disabled:opacity-30 ${
                theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'text-black' : 'text-white'
              }`}
            >
              {isPurchasing ? 'Restoring...' : 'Restore Purchases'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        title={t.feedback}
        theme={theme}
      >
        <div style={{ height: '60vh', minHeight: '320px' }}>
          <iframe
            src="https://tally.so/r/aQGVKB"
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
            title="Feedback"
          />
        </div>
      </Modal>

    </div>
  );
}
