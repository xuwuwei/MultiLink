
import React, { useState } from 'react';
import { Wifi, WifiOff, Monitor, Plus, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Device } from '../services/deviceService';

import { KeyboardTheme } from './Keyboard';

interface WifiIndicatorProps {
  devices: Device[];
  activeDeviceId: string;
  onSwitchDevice: (id: string) => void;
  onAddDevice: () => void;
  onTutorialClick: () => void;
  theme?: KeyboardTheme;
  offlineText?: string;
}

interface WifiIndicatorProps {
  devices: Device[];
  activeDeviceId: string;
  onSwitchDevice: (id: string) => void;
  onAddDevice: () => void;
  onTutorialClick: () => void;
  theme?: KeyboardTheme;
}

export const WifiIndicator: React.FC<WifiIndicatorProps> = ({
  devices,
  activeDeviceId,
  onSwitchDevice,
  onAddDevice,
  onTutorialClick,
  theme = 'glass',
  offlineText = 'Tap for help'
}) => {
  const activeDevice = devices.find(d => d.id === activeDeviceId) || (devices.length > 0 ? devices[0] : null);

  const getThemeStyles = () => {
    switch (theme) {
      case 'retro':
        return 'bg-[#e0e0e0] border-[2px] border-black/40 rounded-[0.4rem] shadow-inner text-[#333]';
      case 'cyberpunk':
        return 'bg-black/80 border border-white/10 rounded-[0.6rem] text-white';
      case 'minimal':
        return 'bg-white border border-black/5 rounded-full shadow-sm text-black';
      case 'amoled':
        return 'bg-black border border-white/20 rounded-[0.4rem] text-white';
      case 'pink':
        return 'bg-[#fce7f3] border border-[#fbcfe8] rounded-full shadow-sm text-[#831843]';
      default: // glass
        return 'glass-effect bg-black/20 border border-white/10 rounded-full text-white';
    }
  };

  const [offlineToast, setOfflineToast] = useState<string | null>(null);

  const lastClickTime = React.useRef(0);
  const handleAddDevice = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastClickTime.current < 1000) return;
    lastClickTime.current = now;
    onAddDevice();
  };

  const handleDeviceClick = (device: Device) => {
    if (!device.isOnline) {
      setOfflineToast(`Reconnecting to ${device.name}...`);
      setTimeout(() => setOfflineToast(null), 2500);
    }
    onSwitchDevice(device.id);
  };

  return (
    <div className="relative flex items-center gap-[0.8rem]">
      <AnimatePresence>
        {offlineToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-[2.8rem] left-0 z-50 px-[0.8rem] py-[0.4rem] rounded-full bg-black/70 text-white text-[0.65rem] whitespace-nowrap pointer-events-none"
          >
            {offlineToast}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Current Device Info - Shrunk and flexible width */}
      <div className={`flex items-center gap-[0.5rem] px-[0.8rem] py-[0.4rem] min-w-0 transition-all duration-500 ${getThemeStyles()}`}>
        {activeDevice ? (
          <>
            <motion.div
              key={activeDeviceId}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: activeDevice.isOnline ? [1, 1.2, 1] : 1,
                opacity: activeDevice.isOnline ? [0.6, 1, 0.6] : 1,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ 
                backgroundColor: activeDevice.color,
                boxShadow: `0 0 10px ${activeDevice.color}`
              }}
              className="w-[0.6rem] h-[0.6rem] rounded-full flex-shrink-0"
            />
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="text-[0.65rem] font-bold uppercase tracking-wider opacity-90 leading-none truncate">
                {activeDevice.name}
              </span>
              <span className="text-[0.45rem] opacity-60 font-mono truncate">
                {activeDevice.ip}{activeDevice.port ? `:${activeDevice.port}` : ''}
              </span>
            </div>
            <AnimatePresence mode="wait">
              {activeDevice.isOnline ? (
                <motion.div
                  key="online"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="flex-shrink-0"
                >
                  <Wifi size={12} style={{ color: activeDevice.color }} />
                </motion.div>
              ) : (
                <motion.div
                  key="offline"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="flex-shrink-0"
                >
                  <WifiOff size={12} className="text-rose-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <button
            onClick={onTutorialClick}
            className="flex items-center gap-[0.5rem] min-w-0"
          >
            <div className="w-[0.6rem] h-[0.6rem] rounded-full bg-gray-500 flex-shrink-0" />
            <div className="flex flex-col min-w-0 overflow-hidden text-left">
              <span className="text-[0.65rem] font-bold uppercase tracking-wider opacity-90 leading-none truncate">
                No Connection
              </span>
              <span className="text-[0.45rem] opacity-60 font-mono truncate">
              {offlineText}
            </span>
            </div>
            <WifiOff size={12} className="text-gray-500 opacity-40 flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Device Switcher and Add Button */}
      <div className="flex items-center gap-[0.4rem]">
        {devices.map((device) => (
          <motion.button
            key={device.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleDeviceClick(device)}
            className={`
              relative w-[1.8rem] h-[1.8rem] flex items-center justify-center transition-all flex-shrink-0
              ${theme === 'retro' ? 'rounded-[0.2rem]' : 'rounded-full'}
              ${activeDeviceId === device.id
                ? (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/10 ring-1 ring-black/20' : 'bg-white/20 ring-1 ring-white/40')
                : (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/5 hover:bg-black/10' : 'bg-black/20 hover:bg-white/10')}
            `}
            title={`${device.name} (${device.ip})`}
          >
            <Monitor 
              size={12} 
              style={{ color: device.isOnline ? device.color : '#666' }} 
              className={device.isOnline ? 'opacity-100' : 'opacity-40'}
            />
            {activeDeviceId === device.id && (
              <motion.div
                layoutId="active-indicator"
                className="absolute bottom-[-0.2rem] w-[0.3rem] h-[0.3rem] rounded-full"
                style={{ backgroundColor: device.color }}
              />
            )}
          </motion.button>
        ))}

        {/* Add Device Button - Icon Only */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddDevice}
          className={`
            w-[1.8rem] h-[1.8rem] flex items-center justify-center transition-all flex-shrink-0 border
            ${theme === 'retro' ? 'rounded-[0.2rem] bg-[#e0e0e0] border-black/40 shadow-[2px_2px_0_rgba(0,0,0,0.2)]' :
              theme === 'minimal' ? 'rounded-full bg-black text-white border-black hover:bg-black/90' :
              theme === 'pink' ? 'rounded-full bg-[#ec4899] text-white border-[#ec4899] hover:bg-[#db2777]' :
              'rounded-full bg-white/10 border-white/10 hover:bg-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]'}
          `}
          title="Add Device"
        >
          <Plus size={14} className={theme === 'retro' ? 'text-black' : 'text-white'} />
        </motion.button>

        {/* Tutorial Button - Icon Only */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onTutorialClick}
          className={`
            w-[1.8rem] h-[1.8rem] flex items-center justify-center transition-all flex-shrink-0 border
            ${theme === 'retro' ? 'rounded-[0.2rem] bg-[#e0e0e0] border-black/40 shadow-[2px_2px_0_rgba(0,0,0,0.2)]' :
              theme === 'minimal' || theme === 'pink' ? 'rounded-full bg-black/5 border-black/10 hover:bg-black/10 text-black' :
              'rounded-full bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'}
          `}
          title="Tutorial"
        >
          <Zap size={14} className={theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'text-black' : 'text-emerald-400'} />
        </motion.button>
      </div>
    </div>
  );
};
