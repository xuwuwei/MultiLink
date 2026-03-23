
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion } from 'motion/react';
import { X, Camera, RefreshCw } from 'lucide-react';
import { KeyboardTheme } from './Keyboard';

interface QrScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  theme?: KeyboardTheme;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onClose, theme = 'glass' }) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [qrboxSize, setQrboxSize] = useState(250);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';

  const [canClickOverlay, setCanClickOverlay] = useState(false);
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const historyPushedRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const scannerId = `QrScanner-${Date.now()}`;
    const isPushingRef = { current: true };
    
    // Push history state immediately
    const state = { modal: 'QrScanner', id: scannerId };
    window.history.pushState(state, '');
    historyPushedRef.current = scannerId;
    
    // Keep isPushingRef true for a while to ignore any popstate triggered by the browser/permission prompt
    const timer = setTimeout(() => {
      if (!isMounted) return;
      isPushingRef.current = false;
      setCanClickOverlay(true);
    }, 1500);
    
    const handlePopState = (e: PopStateEvent) => {
      if (!isMounted || isPushingRef.current) return;
      
      // Only close if we've moved to a state that isn't this specific scanner session
      if (!e.state || e.state.id !== scannerId) {
        historyPushedRef.current = null; // Mark as handled
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
      window.removeEventListener('popstate', handlePopState);
      
      // If unmounting programmatically (not via popstate)
      // and we are still on this scanner's history state, pop it.
      if (historyPushedRef.current === scannerId && window.history.state?.id === scannerId) {
        historyPushedRef.current = null;
        window.history.back();
      }
    };
  }, []);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        
        const config = { 
          fps: 10, 
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            // Ensure boxSize is at least 50px as required by the library
            const boxSize = Math.max(50, Math.floor(minEdge * 0.7));
            setQrboxSize(boxSize);
            return { width: boxSize, height: boxSize };
          }
        };
        
        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            onScanRef.current(decodedText);
            // We don't call window.history.back() here anymore.
            // The cleanup function in the useEffect will handle it when the component unmounts.
            stopScanner();
          },
          (errorMessage) => {
            // Silence common scanning errors
          }
        );
        setIsScanning(true);
      } catch (err) {
        console.error('Failed to start scanner:', err);
        const msg = err instanceof Error ? err.message : String(err);
        const isPermissionError = msg.toLowerCase().includes('permission') ||
          msg.toLowerCase().includes('notallowed') ||
          msg.toLowerCase().includes('denied');
        setError(isPermissionError
          ? 'Camera access denied. Go to Settings > Privacy > Camera and enable access for this app.'
          : 'Could not access camera. Please check permissions.');
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'retro':
        return 'bg-[#e0e0e0] border-[4px] border-black/40 text-black';
      case 'cyberpunk':
        return 'bg-black/90 border border-white/20 text-white';
      case 'minimal':
        return 'bg-white border border-black/5 text-black';
      case 'amoled':
        return 'bg-black border border-white/20 text-white';
      case 'pink':
        return 'bg-[#fff0f6] border border-[#fbcfe8] text-[#831843]';
      default:
        return 'glass-effect bg-black/40 border border-white/10 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-[1rem] md:p-[2rem]">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute inset-0 bg-black/80 backdrop-blur-md ${!canClickOverlay ? 'pointer-events-none' : ''}`}
        onClick={() => {
          if (canClickOverlay) {
            window.history.back();
          }
        }}
      />
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-[32rem] max-h-[90vh] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] ${getThemeStyles()}`}
      >
        <div className="flex justify-between items-center p-[1.2rem] md:p-[1.5rem] border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-[0.8rem]">
            <Camera size={20} />
            <h3 className="text-[1rem] md:text-[1.2rem] font-bold uppercase tracking-wider">Scan QR Code</h3>
          </div>
          <button 
            onClick={() => window.history.back()}
            className="p-[0.5rem] rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow relative bg-black flex items-center justify-center overflow-hidden min-h-[200px]">
          <div id={containerId} className="w-full h-full" />
          
          {!isScanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1rem]">
              <RefreshCw className="animate-spin text-white/40" size={48} />
              <p className="text-white/40 text-[0.9rem]">Initializing Camera...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-[2rem] text-center gap-[1rem]">
              <p className="text-rose-500 font-bold">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-[1.5rem] py-[0.7rem] bg-white/10 rounded-full hover:bg-white/20 transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none border-[2px] border-white/10">
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[2px] border-emerald-500/50 rounded-[1rem]"
                style={{ width: qrboxSize, height: qrboxSize }}
              >
                <div className="absolute inset-0 animate-pulse bg-emerald-500/10 rounded-[1rem]" />
                {/* Corners */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />
              </div>
            </div>
          )}
        </div>

        <div className="p-[1.5rem] text-center bg-black/20">
          <p className="text-[0.8rem] opacity-60">
            Point your camera at the QR code displayed on the HID Controller client.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
