
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

import { KeyboardTheme } from './Keyboard';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  theme?: KeyboardTheme;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, theme = 'glass' }) => {
  const [canClickOverlay, setCanClickOverlay] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const historyPushedRef = useRef<string | null>(null);
  // Generate a stable string ID from title for history state
  const titleIdRef = useRef(`modal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      // Use a unique ID for this specific modal instance/open-session
      const modalId = titleIdRef.current;
      const isPushingRef = { current: true };

      // Push history state immediately - only use serializable data
      const state = { modalId: modalId };
      window.history.pushState(state, '');
      historyPushedRef.current = modalId;

      // Keep isPushingRef true for a while to ignore any popstate triggered by the browser/permission prompt
      const timer = setTimeout(() => {
        if (!isMounted) return;
        isPushingRef.current = false;
        setCanClickOverlay(true);
      }, 100);
      
      const handlePopState = (e: PopStateEvent) => {
        if (!isMounted || isPushingRef.current) return;

        // Only close if we've moved to a state that isn't this specific modal session
        if (!e.state || e.state.modalId !== modalId) {
          historyPushedRef.current = null; // Mark as handled
          onCloseRef.current();
        }
      };

      window.addEventListener('popstate', handlePopState);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
        window.removeEventListener('popstate', handlePopState);
        // Replace the current history state instead of going back
        // This prevents triggering previous modals
        if (historyPushedRef.current === modalId && window.history.state?.modalId === modalId) {
          historyPushedRef.current = null;
          window.history.replaceState(null, '', window.location.href);
        }
      };
    }
  }, [isOpen]);

  const getThemeStyles = () => {
    switch (theme) {
      case 'retro':
        return 'bg-[#e0e0e0] border-[4px] border-black/40 rounded-[0.5rem] shadow-2xl text-[#333]';
      case 'cyberpunk':
        return 'bg-black/90 border border-white/10 rounded-[1rem] shadow-[0_0_30px_rgba(0,0,0,0.8)] text-white';
      case 'minimal':
        return 'bg-white border border-black/5 rounded-[2rem] shadow-xl text-black';
      case 'amoled':
        return 'bg-black border border-white/20 rounded-[0.5rem] text-white';
      case 'pink':
        return 'bg-[#fff0f6] border border-[#fbcfe8] rounded-[2rem] shadow-xl text-[#831843]';
      default: // glass
        return 'glass-effect rounded-[2.5rem] border border-white/10 text-white';
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[2rem]">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${!canClickOverlay ? 'pointer-events-none' : ''}`}
            onClick={() => {
              if (canClickOverlay) {
                window.history.back();
              }
            }}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-[30rem] p-[1.5rem] md:p-[2rem] flex flex-col ${getThemeStyles()}`}
            style={{ maxHeight: '90vh' }}
          >
            <div className="flex justify-between items-center mb-[1.5rem] flex-shrink-0">
              <h2 className="text-[1.5rem] font-semibold">{title}</h2>
              <button onClick={() => window.history.back()} className={`p-[0.5rem] rounded-full transition-colors ${theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}>
                <X size={24} />
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto min-h-0 modal-content"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
