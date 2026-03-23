
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import { KeyboardTheme } from './Keyboard';
import { connectionService } from '../services/connectionService';

interface TouchpadProps {
  accentColor?: string;
  theme?: KeyboardTheme;
  isSystemKeysOpen?: boolean;
  isNumPadOpen?: boolean;
  onKeyAction?: (key: string) => void;
  onMouseAction?: (action: string) => void;
  sensitivity?: number;
  naturalScroll?: boolean;
  /** When true, hides the touchpad area and shows only the side panels */
  hideTouchpadArea?: boolean;
}

interface SideKeyProps {
  label?: string;
  icon?: any;
  onClick: () => void;
  className?: string;
  theme: KeyboardTheme;
}

const SideKey: React.FC<SideKeyProps> = ({ label, icon: Icon, onClick, className = "", theme }) => {
  const getKeyStyles = () => {
    switch (theme) {
      case 'retro':
        return 'bg-[#e0e0e0] border-b-[3px] border-r-[3px] border-black/40 active:translate-y-[1px] active:translate-x-[1px] active:border-b-[1px] active:border-r-[1px] text-black';
      case 'cyberpunk':
        return 'bg-black/60 border border-white/20 active:bg-white/20 text-white';
      case 'minimal':
        return 'bg-white border border-black/5 active:bg-black/5 text-black shadow-sm';
      case 'amoled':
        return 'bg-black border border-white/20 active:bg-white/20 text-white';
      case 'pink':
        return 'bg-[#fce7f3] border border-[#fbcfe8] active:bg-[#f9a8d4] text-[#831843]';
      default:
        return 'glass-effect bg-white/5 border border-white/10 active:bg-white/20 text-white';
    }
  };

  const handleInteraction = (e: React.PointerEvent) => {
    if (e.isPrimary) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };
 
  return (
    <button
      onPointerDown={handleInteraction}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex items-center justify-center p-[0.7rem] rounded-[0.5rem] transition-all active:scale-90 text-[0.8rem] font-bold key-element ${getKeyStyles()} ${className}`}
    >
      {Icon ? <Icon size={18} /> : label}
    </button>
  );
};

export const Touchpad: React.FC<TouchpadProps> = ({
  accentColor = '#10b981',
  theme = 'glass',
  isSystemKeysOpen = false,
  isNumPadOpen = false,
  onKeyAction,
  onMouseAction,
  sensitivity = 1.0,
  naturalScroll = true,
  hideTouchpadArea = false,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isTouching, setIsTouching] = useState(false);
  const [touchPoints, setTouchPoints] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const mouseStartRef = React.useRef<{ time: number; x: number; y: number } | null>(null);
  
  // HID State
  const [buttonState, setButtonState] = useState(0); // Bit 0: Left, Bit 1: Right, Bit 2: Middle
  const accumulatedDelta = React.useRef({ x: 0, y: 0, wheel: 0 });
  const lastReportRef = React.useRef<string>("");
  const lastScrollReportRef = React.useRef<number>(0);
  
  // Gesture State
  const touchStartRef = React.useRef<{ time: number; count: number; x: number; y: number } | null>(null);
  const maxFingersRef = React.useRef(0);

  // Pinch-to-zoom state
  const lastPinchDistRef = React.useRef<number | null>(null);
  const pinchAccumRef = React.useRef(0);

  // Double-tap detection
  const lastTapTimeRef = React.useRef<number>(0);
  const lastTapPosRef = React.useRef<{ x: number; y: number } | null>(null);

  // naturalScroll ref so stale useCallback closures always read the current value
  const naturalScrollRef = React.useRef(naturalScroll);
  naturalScrollRef.current = naturalScroll;

  // Suppress cursor movement for a short window after a tap (prevents cursor
  // shift between two taps which breaks OS double-click detection)
  const suppressMovementRef = React.useRef(false);

  // Polling logic (10ms = 100Hz)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const dx = accumulatedDelta.current.x;
      const dy = accumulatedDelta.current.y;
      const dw = accumulatedDelta.current.wheel;
      
      const hasMovement = Math.abs(dx) >= 1 || Math.abs(dy) >= 1 || Math.abs(dw) >= 1;
      
      const moveX = Math.max(-127, Math.min(127, Math.trunc(dx)));
      const moveY = Math.max(-127, Math.min(127, Math.trunc(dy)));
      const moveWheel = Math.max(-127, Math.min(127, Math.trunc(dw)));
      
      const toHex = (num: number) => {
        const val = num < 0 ? (0xFF + num + 1) : num;
        return val.toString(16).toUpperCase().padStart(2, '0');
      };

      const report = [
        toHex(buttonState),
        toHex(moveX),
        toHex(moveY),
        toHex(moveWheel)
      ].join(' ');

      if (hasMovement || report !== lastReportRef.current) {
        console.log(`[HID Mouse Report] ${report} | ΔX: ${moveX}, ΔY: ${moveY}, Wheel: ${moveWheel}, Buttons: ${buttonState.toString(2).padStart(3, '0')}`);
        lastReportRef.current = report;

        // 通过 Capacitor 插件发送给 PC
        if (moveX !== 0 || moveY !== 0) {
          connectionService.sendMouseMove(moveX, moveY);
        }
        if (moveWheel !== 0) {
          connectionService.sendMouseScroll(moveWheel);
          // 节流显示滚动 HID 码
          const now = Date.now();
          if (now - lastScrollReportRef.current > 150) {
            onMouseAction?.(moveWheel > 0 ? 'ST' : 'SD');
            lastScrollReportRef.current = now;
          }
        }

        accumulatedDelta.current.x -= moveX;
        accumulatedDelta.current.y -= moveY;
        accumulatedDelta.current.wheel -= moveWheel;
      }

      // Pinch-to-zoom: flush accumulated pinch delta as Ctrl+Scroll.
      // Standard HID convention: spread (distance ↑) = Ctrl+ScrollUp = zoom in.
      const pinchDelta = Math.max(-127, Math.min(127, Math.trunc(pinchAccumRef.current)));
      if (Math.abs(pinchDelta) >= 1) {
        connectionService.sendKeyDown(0xE0); // Left Ctrl
        connectionService.sendMouseScroll(pinchDelta);
        connectionService.sendKeyUp(0xE0);
        pinchAccumRef.current -= pinchDelta;
      }
    }, 10);

    return () => clearInterval(interval);
  }, [buttonState]);

  const processMovement = (dx: number, dy: number) => {
    if (suppressMovementRef.current) return;
    accumulatedDelta.current.x += dx * sensitivity * 0.3;
    accumulatedDelta.current.y += dy * sensitivity * 0.3;
  };

  const processScroll = (dy: number) => {
    accumulatedDelta.current.wheel += (naturalScrollRef.current ? -dy : dy) * sensitivity * 0.5;
  };

  const startTracking = (clientX: number, clientY: number, container: HTMLElement) => {
    setIsTouching(true);
    lastPosRef.current = { x: clientX, y: clientY };
    
    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });
  };

  const updateTracking = (clientX: number, clientY: number, container: HTMLElement) => {
    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });

    if (lastPosRef.current) {
      const dx = clientX - lastPosRef.current.x;
      const dy = clientY - lastPosRef.current.y;
      
      if (dx !== 0 || dy !== 0) {
        processMovement(dx, dy);
      }
    }
    
    lastPosRef.current = { x: clientX, y: clientY };
  };

  const stopTracking = () => {
    setIsTouching(false);
    lastPosRef.current = null;
  };

  const handleLeftClick = (pressed: boolean) => {
    setButtonState(prev => pressed ? (prev | 0x01) : (prev & ~0x01));
  };

  const handleRightClick = (pressed: boolean) => {
    setButtonState(prev => pressed ? (prev | 0x02) : (prev & ~0x02));
  };

  const touchpadAreaRef = React.useRef<HTMLDivElement>(null);

  // Sync touchPoints state from a live TouchList
  const syncTouchPoints = React.useCallback((touches: TouchList) => {
    const el = touchpadAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTouchPoints(Array.from(touches).map(t => ({
      id: t.identifier,
      x: ((t.clientX - rect.left) / rect.width) * 100,
      y: ((t.clientY - rect.top) / rect.height) * 100,
    })));
  }, []);

  const handleTouchStart = React.useCallback((e: TouchEvent | React.TouchEvent) => {
    const count = e.targetTouches.length;
    maxFingersRef.current = Math.max(maxFingersRef.current, count);
    syncTouchPoints(e.targetTouches);

    const touch = e.targetTouches[0];
    if (count === 1) {
      touchStartRef.current = { time: Date.now(), count, x: touch.clientX, y: touch.clientY };
      startTracking(touch.clientX, touch.clientY, e.currentTarget as HTMLElement);
    } else if (count === 2) {
      // For 2 fingers, we track the midpoint for scrolling
      const t2 = e.targetTouches[1];
      const midX = (touch.clientX + t2.clientX) / 2;
      const midY = (touch.clientY + t2.clientY) / 2;

      // Reset lastPosRef to midpoint to avoid jump
      lastPosRef.current = { x: midX, y: midY };

      // Init pinch baseline distance
      lastPinchDistRef.current = Math.hypot(t2.clientX - touch.clientX, t2.clientY - touch.clientY);
      pinchAccumRef.current = 0;

      // Update tap info if it's the start of a 2-finger gesture
      if (touchStartRef.current) {
        touchStartRef.current.count = 2;
      }
    }
  }, [sensitivity, syncTouchPoints]);

  const handleTouchMove = React.useCallback((e: TouchEvent | React.TouchEvent) => {
    syncTouchPoints(e.targetTouches);
    const count = e.targetTouches.length;
    const container = e.currentTarget as HTMLElement;

    if (count === 1) {
      updateTracking(e.targetTouches[0].clientX, e.targetTouches[0].clientY, container);
    } else if (count === 2) {
      const t1 = e.targetTouches[0];
      const t2 = e.targetTouches[1];
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      // Pinch detection: compare distance change vs midpoint movement to tell them apart
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const distDelta = lastPinchDistRef.current !== null ? dist - lastPinchDistRef.current : 0;
      lastPinchDistRef.current = dist;

      if (lastPosRef.current) {
        const dy = midY - lastPosRef.current.y;
        if (Math.abs(distDelta) > Math.abs(dy)) {
          // Pinch dominates: spread (distDelta > 0) = zoom in = positive scroll with Ctrl
          pinchAccumRef.current += distDelta * sensitivity * 0.05;
        } else if (Math.abs(dy) > 0.5) {
          processScroll(dy);
        }
      }
      lastPosRef.current = { x: midX, y: midY };

      // Still update visual position for the first finger
      const rect = container.getBoundingClientRect();
      setPosition({
        x: ((t1.clientX - rect.left) / rect.width) * 100,
        y: ((t1.clientY - rect.top) / rect.height) * 100
      });
    }
  }, [sensitivity, syncTouchPoints]);

  const handleTouchEnd = React.useCallback((e: TouchEvent | React.TouchEvent) => {
    syncTouchPoints(e.targetTouches); // e.targetTouches already excludes the lifted finger(s)
    const now = Date.now();
    const count = e.targetTouches.length;

    if (count === 0 && touchStartRef.current) {
      const duration = now - touchStartRef.current.time;
      const touch = e.changedTouches[0];
      const dist = Math.sqrt(
        Math.pow(touch.clientX - touchStartRef.current.x, 2) +
        Math.pow(touch.clientY - touchStartRef.current.y, 2)
      );

      // Tap detection: short duration and minimal movement
      if (duration < 250 && dist < 20) {
        // Suppress cursor movement for 250ms so a second tap doesn't
        // drift the cursor and break OS double-click detection
        suppressMovementRef.current = true;
        setTimeout(() => { suppressMovementRef.current = false; }, 250);

        if (maxFingersRef.current === 1) {
          const tapPos = { x: touch.clientX, y: touch.clientY };
          const lastTap = lastTapPosRef.current;
          const isDoubleTap =
            lastTapTimeRef.current > 0 &&
            (now - lastTapTimeRef.current) < 350 &&
            lastTap !== null &&
            Math.hypot(tapPos.x - lastTap.x, tapPos.y - lastTap.y) < 40;

          if (isDoubleTap) {
            // Double-click: send second click with OS-specific click state.
            // Windows: USER32 auto-detects double-click from timing.
            // macOS: driver sets kCGMouseEventClickState=2 for this event.
            connectionService.sendMouseDoubleClick(0x01);
            onMouseAction?.('LM');
            lastTapTimeRef.current = 0;
            lastTapPosRef.current = null;
          } else {
            // Single click: 15ms down→up so mouseup always arrives before
            // the second tap's mousedown (required for OS double-click detection)
            handleLeftClick(true);
            connectionService.sendMouseButton(0x01, true);
            onMouseAction?.('LM');
            setTimeout(() => {
              handleLeftClick(false);
              connectionService.sendMouseButton(0x01, false);
            }, 15);
            lastTapTimeRef.current = now;
            lastTapPosRef.current = tapPos;
          }
        } else if (maxFingersRef.current === 2) {
          // Two finger tap -> Right Click
          handleRightClick(true);
          connectionService.sendMouseButton(0x02, true);
          onMouseAction?.('RM');
          setTimeout(() => {
            handleRightClick(false);
            connectionService.sendMouseButton(0x02, false);
          }, 15);
          // Reset double-tap state on right-click
          lastTapTimeRef.current = 0;
          lastTapPosRef.current = null;
        }
      }
      
      // Reset gesture state
      touchStartRef.current = null;
      maxFingersRef.current = 0;
      lastPinchDistRef.current = null;
      pinchAccumRef.current = 0;
      stopTracking();
    } else if (count === 1) {
      // Transitioning from 2 fingers to 1, reset tracking to the remaining finger
      const touch = e.targetTouches[0];
      lastPosRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, [onMouseAction, syncTouchPoints]);

  React.useEffect(() => {
    const el = touchpadAreaRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      handleTouchStart(e);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      handleTouchMove(e);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      handleTouchEnd(e);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartRef.current = { time: Date.now(), x: e.clientX, y: e.clientY };
    startTracking(e.clientX, e.clientY, e.currentTarget as HTMLElement);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isTouching) {
      updateTracking(e.clientX, e.clientY, e.currentTarget as HTMLElement);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartRef.current) {
      const now = Date.now();
      const duration = now - mouseStartRef.current.time;
      const dist = Math.sqrt(
        Math.pow(e.clientX - mouseStartRef.current.x, 2) +
        Math.pow(e.clientY - mouseStartRef.current.y, 2)
      );

      // Desktop click detection
      if (duration < 250 && dist < 10) {
        if (e.button === 0) { // Left click
          handleLeftClick(true);
          connectionService.sendMouseButton(0x01, true);
          onMouseAction?.('LM');
          setTimeout(() => {
            handleLeftClick(false);
            connectionService.sendMouseButton(0x01, false);
          }, 50);
        } else if (e.button === 2) { // Right click
          handleRightClick(true);
          connectionService.sendMouseButton(0x02, true);
          onMouseAction?.('RM');
          setTimeout(() => {
            handleRightClick(false);
            connectionService.sendMouseButton(0x02, false);
          }, 50);
        }
      }
    }
    mouseStartRef.current = null;
    stopTracking();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'retro':
        return 'bg-[#e0e0e0] border-[4px] border-black/40 rounded-[0.5rem] shadow-inner';
      case 'cyberpunk':
        return 'bg-black/80 border border-white/30 rounded-[1rem] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]';
      case 'minimal':
        return 'bg-white border border-black/5 rounded-[1.5rem] shadow-sm';
      case 'amoled':
        return 'bg-black border border-white/40 rounded-[0.5rem]';
      case 'pink':
        return 'bg-[#fce7f3] border border-[#fbcfe8] rounded-[1.5rem] shadow-sm';
      default: // glass
        return 'glass-effect rounded-[2rem] bg-black/20 border border-white/10';
    }
  };

  if (hideTouchpadArea) {
    // Panels-only mode (used in keyboardOnly layout): render the side panels
    // in a horizontal row without the touchpad area in the middle.
    return (
      <div className="w-full flex flex-row justify-center gap-[1rem] p-[0.5rem] flex-wrap">
        <AnimatePresence>
          {isSystemKeysOpen && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="flex flex-col gap-[0.6rem]"
            >
              <div className="grid grid-cols-3 gap-[0.5rem]">
                <SideKey theme={theme} label="PrtSc" onClick={() => onKeyAction?.('PrtSc')} />
                <SideKey theme={theme} label="ScrLk" onClick={() => onKeyAction?.('ScrLk')} />
                <SideKey theme={theme} label="Pause" onClick={() => onKeyAction?.('Pause')} />
                <SideKey theme={theme} label="Ins"   onClick={() => onKeyAction?.('Ins')} />
                <SideKey theme={theme} label="Home"  onClick={() => onKeyAction?.('Home')} />
                <SideKey theme={theme} label="PgUp"  onClick={() => onKeyAction?.('PgUp')} />
                <SideKey theme={theme} label="Del"   onClick={() => onKeyAction?.('Del')} />
                <SideKey theme={theme} label="End"   onClick={() => onKeyAction?.('End')} />
                <SideKey theme={theme} label="PgDn"  onClick={() => onKeyAction?.('PgDn')} />
              </div>
              <div className="grid grid-cols-3 gap-[0.5rem] mt-[0.8rem]">
                <div />
                <SideKey theme={theme} icon={ChevronUp}    onClick={() => onKeyAction?.('Up')} />
                <div />
                <SideKey theme={theme} icon={ChevronLeft}  onClick={() => onKeyAction?.('Left')} />
                <SideKey theme={theme} icon={ChevronDown}  onClick={() => onKeyAction?.('Down')} />
                <SideKey theme={theme} icon={ChevronRight} onClick={() => onKeyAction?.('Right')} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isNumPadOpen && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="grid grid-cols-4 gap-[0.5rem]"
            >
              <SideKey theme={theme} label="Num" onClick={() => onKeyAction?.('Num')} />
              <SideKey theme={theme} label="/"   onClick={() => onKeyAction?.('/')} />
              <SideKey theme={theme} label="*"   onClick={() => onKeyAction?.('*')} />
              <SideKey theme={theme} label="-"   onClick={() => onKeyAction?.('-')} />
              <SideKey theme={theme} label="7"   onClick={() => onKeyAction?.('7')} />
              <SideKey theme={theme} label="8"   onClick={() => onKeyAction?.('8')} />
              <SideKey theme={theme} label="9"   onClick={() => onKeyAction?.('9')} />
              <SideKey theme={theme} label="+"   onClick={() => onKeyAction?.('+')} className="row-span-2 h-full" />
              <SideKey theme={theme} label="4"   onClick={() => onKeyAction?.('4')} />
              <SideKey theme={theme} label="5"   onClick={() => onKeyAction?.('5')} />
              <SideKey theme={theme} label="6"   onClick={() => onKeyAction?.('6')} />
              <SideKey theme={theme} label="1"   onClick={() => onKeyAction?.('1')} />
              <SideKey theme={theme} label="2"   onClick={() => onKeyAction?.('2')} />
              <SideKey theme={theme} label="3"   onClick={() => onKeyAction?.('3')} />
              <SideKey theme={theme} label="Enter" onClick={() => onKeyAction?.('Enter')} className="row-span-2 h-full" />
              <SideKey theme={theme} label="0"   onClick={() => onKeyAction?.('0')} className="col-span-2" />
              <SideKey theme={theme} label="."   onClick={() => onKeyAction?.('.')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[60rem] mx-auto h-full grid grid-cols-[1fr_auto_1fr] items-start p-[0.5rem] md:p-[1rem] gap-[0.5rem] md:gap-[1rem]">
      {/* System Keys Panel */}
      <div className="flex justify-start min-w-0">
        <AnimatePresence>
          {isSystemKeysOpen && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex flex-col gap-[0.6rem] w-full max-w-[12rem]"
            >
              <div className="grid grid-cols-3 gap-[0.5rem]">
                <SideKey theme={theme} label="PrtSc" onClick={() => onKeyAction?.('PrtSc')} />
                <SideKey theme={theme} label="ScrLk" onClick={() => onKeyAction?.('ScrLk')} />
                <SideKey theme={theme} label="Pause" onClick={() => onKeyAction?.('Pause')} />
                
                <SideKey theme={theme} label="Ins" onClick={() => onKeyAction?.('Ins')} />
                <SideKey theme={theme} label="Home" onClick={() => onKeyAction?.('Home')} />
                <SideKey theme={theme} label="PgUp" onClick={() => onKeyAction?.('PgUp')} />
                
                <SideKey theme={theme} label="Del" onClick={() => onKeyAction?.('Del')} />
                <SideKey theme={theme} label="End" onClick={() => onKeyAction?.('End')} />
                <SideKey theme={theme} label="PgDn" onClick={() => onKeyAction?.('PgDn')} />
              </div>
              
              <div className="grid grid-cols-3 gap-[0.5rem] mt-[0.8rem]">
                <div />
                <SideKey theme={theme} icon={ChevronUp} onClick={() => onKeyAction?.('Up')} />
                <div />
                <SideKey theme={theme} icon={ChevronLeft} onClick={() => onKeyAction?.('Left')} />
                <SideKey theme={theme} icon={ChevronDown} onClick={() => onKeyAction?.('Down')} />
                <SideKey theme={theme} icon={ChevronRight} onClick={() => onKeyAction?.('Right')} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Touchpad Area */}
      <div className="flex flex-col items-center justify-center min-w-0 flex-grow h-full gap-[1rem]">
        <div 
          ref={touchpadAreaRef}
          className={`relative w-[min(90vw,30rem)] h-full max-h-[24rem] aspect-[5/4] md:aspect-auto overflow-hidden cursor-crosshair transition-all duration-500 touch-none ${getThemeStyles()}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
            <div className="w-[80%] h-[1px]" style={{ backgroundColor: (theme === 'retro' || theme === 'minimal' || theme === 'pink') ? '#000' : '#fff' }} />
            <div className="h-[80%] w-[1px] absolute" style={{ backgroundColor: (theme === 'retro' || theme === 'minimal' || theme === 'pink') ? '#000' : '#fff' }} />
          </div>
          
          <AnimatePresence>
            {touchPoints.map(pt => (
              <motion.div
                key={pt.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="absolute w-[0.75rem] h-[0.75rem] rounded-full pointer-events-none"
                style={{
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                  backgroundColor: theme === 'retro' ? 'rgba(0,0,0,0.5)' : theme === 'minimal' ? 'rgba(0,0,0,0.35)' : theme === 'pink' ? 'rgba(236,72,153,0.5)' : theme === 'amoled' ? 'rgba(255,255,255,0.6)' : accentColor,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}
          </AnimatePresence>
          {/* Desktop mouse dot */}
          {isTouching && touchPoints.length === 0 && (
            <motion.div
              className="absolute w-[0.75rem] h-[0.75rem] rounded-full pointer-events-none"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                backgroundColor: theme === 'retro' ? 'rgba(0,0,0,0.5)' : theme === 'minimal' ? 'rgba(0,0,0,0.35)' : theme === 'pink' ? 'rgba(236,72,153,0.5)' : theme === 'amoled' ? 'rgba(255,255,255,0.6)' : accentColor,
                transform: 'translate(-50%, -50%)'
              }}
            />
          )}
        </div>
      </div>

      {/* Numeric Keypad Panel */}
      <div className="flex justify-end min-w-0">
        <AnimatePresence>
          {isNumPadOpen && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="grid grid-cols-4 gap-[0.5rem] w-full max-w-[15rem]"
            >
              {/* Standard Numpad Rows */}
              <SideKey theme={theme} label="Num" onClick={() => onKeyAction?.('Num')} />
              <SideKey theme={theme} label="/" onClick={() => onKeyAction?.('/')} />
              <SideKey theme={theme} label="*" onClick={() => onKeyAction?.('*')} />
              <SideKey theme={theme} label="-" onClick={() => onKeyAction?.('-')} />

              <SideKey theme={theme} label="7" onClick={() => onKeyAction?.('7')} />
              <SideKey theme={theme} label="8" onClick={() => onKeyAction?.('8')} />
              <SideKey theme={theme} label="9" onClick={() => onKeyAction?.('9')} />
              <SideKey theme={theme} label="+" onClick={() => onKeyAction?.('+')} className="row-span-2 h-full" />

              <SideKey theme={theme} label="4" onClick={() => onKeyAction?.('4')} />
              <SideKey theme={theme} label="5" onClick={() => onKeyAction?.('5')} />
              <SideKey theme={theme} label="6" onClick={() => onKeyAction?.('6')} />

              <SideKey theme={theme} label="1" onClick={() => onKeyAction?.('1')} />
              <SideKey theme={theme} label="2" onClick={() => onKeyAction?.('2')} />
              <SideKey theme={theme} label="3" onClick={() => onKeyAction?.('3')} />
              <SideKey theme={theme} label="Enter" onClick={() => onKeyAction?.('Enter')} className="row-span-2 h-full" />

              <SideKey theme={theme} label="0" onClick={() => onKeyAction?.('0')} className="col-span-2" />
              <SideKey theme={theme} label="." onClick={() => onKeyAction?.('.')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
