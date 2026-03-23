
import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { audioService } from '../services/audioService';

import { HID_CODES } from '../constants';

export type KeyboardTheme = 'glass' | 'retro' | 'cyberpunk' | 'minimal' | 'amoled' | 'pink';

interface KeyProps {
  label: string;
  subLabel?: string;
  fnLabel?: string;
  width: number; // in units (u)
  row: number;
  col: number;
  isShiftActive?: boolean;
  isCapsLockActive?: boolean;
  isFnActive?: boolean;
  lastInteraction: { x: number; y: number; time: number } | null;
  onPress: (label: string, subLabel?: string, x?: number, y?: number) => void;
  onRelease?: (label: string) => void;
  theme: KeyboardTheme;
  accentColor: string;
  isRippleEnabled?: boolean;
}

const Key: React.FC<KeyProps> = ({
  label, subLabel, fnLabel, width, row, col,
  isShiftActive, isCapsLockActive, isFnActive,
  lastInteraction, onPress, onRelease,
  theme, accentColor, isRippleEnabled = true
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const activePointers = useRef<Set<number>>(new Set());

  // Calculate distance from the interaction point
  const getDistance = () => {
    if (!lastInteraction) return 1000;
    
    // Use Euclidean distance to determine layers
    const dx = col - lastInteraction.x;
    const dy = row - lastInteraction.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // We want up to 3 layers. 
    // In our grid, 1 layer is roughly 1u distance.
    if (dist <= 3.2) {
      return dist;
    }
    
    return 1000;
  };

  const distance = getDistance();
  const shouldRipple = distance <= 3.2;
  const delay = distance * 0.08; // Speed of the wave

  const isSpecialShift = (label === 'Shift' || label === 'L-Shift' || label === 'R-Shift') && isShiftActive;

  const getThemeStyles = () => {
    switch (theme) {
      case 'retro':
        return `
          bg-[#e0e0e0] border-b-[4px] border-r-[4px] border-black/40 rounded-[0.2rem] 
          ${(isPressed || isSpecialShift) ? 'translate-y-[2px] translate-x-[2px] border-b-[1px] border-r-[1px] bg-[#d0d0d0]' : ''}
          text-[#333] font-serif
        `;
      case 'cyberpunk':
        return `
          bg-black/80 border border-[${accentColor}]/30 rounded-[0.3rem]
          ${(isPressed || isSpecialShift) ? 'bg-white/10 border-white/60 scale-95 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : `shadow-[0_0_8px_${accentColor}22]`}
          text-[${accentColor}] font-mono
        `;
      case 'minimal':
        return `
          bg-white border border-black/5 rounded-[0.8rem] shadow-sm
          ${(isPressed || isSpecialShift) ? 'bg-black/5 scale-95 shadow-none' : 'hover:shadow-md'}
          text-black font-sans
        `;
      case 'amoled':
        return `
          bg-black border border-white/20 rounded-[0.4rem]
          ${(isPressed || isSpecialShift) ? 'bg-white/20 border-white/40 scale-95' : ''}
          text-white font-sans
        `;
      case 'pink':
        return `
          bg-[#fce7f3] border border-[#fbcfe8] rounded-[0.8rem] shadow-sm
          ${(isPressed || isSpecialShift) ? 'bg-[#f9a8d4] scale-95 shadow-none' : 'hover:shadow-md'}
          text-[#831843] font-sans
        `;
      default: // glass
        return `
          glass-effect rounded-[0.5rem]
          ${(isPressed || isSpecialShift) ? 'bg-white/40 border-white/60 scale-95' : 'bg-white/10'}
          text-white
        `;
    }
  };

  return (
    <div
      className="relative select-none key-element"
      style={{ 
        gridColumn: `span ${Math.round(width * 4)}`,
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        activePointers.current.add(e.pointerId);
        if (activePointers.current.size === 1) {
          setIsPressed(true);
          onPress(label, subLabel, col, row);
        }
      }}
      onPointerUp={(e) => {
        activePointers.current.delete(e.pointerId);
        if (activePointers.current.size === 0) {
          setIsPressed(false);
          onRelease?.(label);
        }
      }}
      onPointerCancel={(e) => {
        activePointers.current.delete(e.pointerId);
        if (activePointers.current.size === 0) {
          setIsPressed(false);
          onRelease?.(label);
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <motion.div
        className={`
          w-full h-full flex flex-col items-center justify-center 
          font-medium transition-all duration-150
          ${getThemeStyles()}
          cursor-pointer overflow-hidden relative
        `}
        style={theme === 'cyberpunk' ? { color: accentColor, borderColor: `${accentColor}44` } : {}}
      >
        {/* Ripple Glow Effect */}
        <AnimatePresence mode="wait">
          {lastInteraction && shouldRipple && isRippleEnabled && theme !== 'retro' && (
            <motion.div
              key={lastInteraction.time}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 1 - (distance * 0.25), 0],
                backgroundColor: theme === 'cyberpunk' ? [`${accentColor}00`, `${accentColor}44`, `${accentColor}00`] :
                                theme === 'amoled' ? ["rgba(255,255,255,0)", "rgba(255,255,255,0.2)", "rgba(255,255,255,0)"] :
                                theme === 'minimal' || theme === 'pink' ? ["rgba(0,0,0,0)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0)"] :
                                ["rgba(255,255,255,0)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0)"]
              }}
              transition={{
                duration: 0.7,
                delay: delay,
                ease: "easeOut"
              }}
              className="absolute inset-0 pointer-events-none rounded-[0.5rem]"
              style={{
                boxShadow: theme === 'cyberpunk'
                  ? `inset 0 0 ${15 - distance * 3}px ${accentColor}66`
                  : theme === 'minimal' || theme === 'pink'
                  ? `inset 0 0 ${15 - distance * 3}px rgba(0,0,0,${0.3 - distance * 0.08})`
                  : `inset 0 0 ${15 - distance * 3}px rgba(255,255,255,${0.6 - distance * 0.15})`
              }}
            />
          )}
        </AnimatePresence>
        
        {/* Key Labels */}
        <div className="flex flex-col items-center justify-center h-full relative z-10">
          {subLabel && <span className="text-[0.6rem] opacity-50 leading-none mb-[0.1rem]">{subLabel}</span>}
          <span className={`relative z-10 leading-none ${subLabel ? 'text-[0.9rem]' : 'text-[0.8rem]'}`}>
            {label === 'L-Shift' || label === 'R-Shift' ? 'Shift' : label}
          </span>
          
          {/* Side-printed Fn label */}
          {fnLabel && (
            <div 
              className={`absolute bottom-[0.2rem] right-[0.3rem] text-[0.5rem] font-bold transition-all duration-300 ${
                isFnActive && fnLabel
                ? 'opacity-100 scale-110' : 'opacity-0'
              }`}
              style={{ color: isFnActive ? accentColor : undefined }}
            >
              {fnLabel}
            </div>
          )}
        </div>
        
        {/* Caps Lock Indicator Dot */}
        {label === 'Caps' && (
          <div className="absolute top-[0.4rem] left-[0.4rem] flex items-center justify-center">
            <div
              className={`
                w-[0.3rem] h-[0.3rem] rounded-full transition-all duration-300
                ${isCapsLockActive
                  ? 'bg-[#00ff00] shadow-[0_0_8px_#00ff00]'
                  : 'bg-white/10'}
              `}
            />
          </div>
        )}

        {/* Home-row tactile bump (F and J keys) */}
        {(label === 'F' || label === 'J') && (
          <div className="absolute bottom-[0.25rem] left-1/2 -translate-x-1/2 pointer-events-none">
            <div className={`w-[0.7rem] h-[0.15rem] rounded-full ${
              theme === 'minimal' ? 'bg-black/30' :
              theme === 'retro'   ? 'bg-black/40' :
              theme === 'pink'    ? 'bg-[#f9a8d4]/60' :
              'bg-white/40'
            }`} />
          </div>
        )}
      </motion.div>
    </div>
  );
};

interface KeyboardProps {
  onKeyAction?: (key: string, isRelease?: boolean) => void;
  soundVariant?: 'classic' | 'modern' | 'click';
  accentColor?: string;
  theme?: KeyboardTheme;
  isRippleEnabled?: boolean;
  isSoundEnabled?: boolean;
}

export const Keyboard: React.FC<KeyboardProps> = ({ 
  onKeyAction, 
  soundVariant = 'modern',
  accentColor = '#10b981',
  theme = 'glass',
  isRippleEnabled = true,
  isSoundEnabled = true
}) => {
  const [lastInteraction, setLastInteraction] = useState<{ x: number; y: number; time: number } | null>(null);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [isCapsLockActive, setIsCapsLockActive] = useState(false);
  const [isFnActive, setIsFnActive] = useState(false);

  const handleKeyPress = useCallback((label: string, subLabel?: string, x?: number, y?: number) => {
    let targetLabel = label;

    // Handle Fn combinations (F1-F12, WASD Arrows, and others)
    if (isFnActive) {
      if (label === '1') targetLabel = 'F1';
      else if (label === '2') targetLabel = 'F2';
      else if (label === '3') targetLabel = 'F3';
      else if (label === '4') targetLabel = 'F4';
      else if (label === '5') targetLabel = 'F5';
      else if (label === '6') targetLabel = 'F6';
      else if (label === '7') targetLabel = 'F7';
      else if (label === '8') targetLabel = 'F8';
      else if (label === '9') targetLabel = 'F9';
      else if (label === '0') targetLabel = 'F10';
      else if (label === '-') targetLabel = 'F11';
      else if (label === '=') targetLabel = 'F12';
      else if (label === 'W') targetLabel = 'Up';
      else if (label === 'A') targetLabel = 'Left';
      else if (label === 'S') targetLabel = 'Down';
      else if (label === 'D') targetLabel = 'Right';
      else if (label === 'Esc') targetLabel = '`';
      else if (label === 'Backspace') targetLabel = 'Del';
    }

    // Play mechanical click sound
    if (isSoundEnabled) {
      audioService.playClickSound(soundVariant as 'classic' | 'modern' | 'click');
    }

    if (x !== undefined && y !== undefined) {
      setLastInteraction({ x, y, time: Date.now() });
    }

    if (label === 'Fn') {
      setIsFnActive(true);
    }

    if (label === 'L-Shift' || label === 'R-Shift' || label === 'Shift') {
      setIsShiftActive(true);
    }

    if (label === 'Caps') {
      setIsCapsLockActive(!isCapsLockActive);
    }

    // Send all modifier keys (Fn, Shift, Ctrl, Alt, Win, Menu, Caps) directly
    const isModifier = ['Fn', 'L-Shift', 'R-Shift', 'Shift', 'Ctrl', 'Alt', 'Win', 'Menu', 'Caps'].includes(label);
    if (isModifier) {
      onKeyAction?.(label, false);
      return;
    }

    let displayKey = targetLabel;
    const isLetter = targetLabel.length === 1 && targetLabel.match(/[a-z]/i);

    if (isLetter) {
      // Caps Lock + Shift = Lowercase
      // Caps Lock OR Shift = Uppercase
      const shouldBeUpper = isCapsLockActive !== isShiftActive;
      displayKey = shouldBeUpper ? targetLabel.toUpperCase() : targetLabel.toLowerCase();
      
      onKeyAction?.(displayKey);
    } else {
      if (isShiftActive && subLabel) {
        onKeyAction?.(subLabel);
      } else {
        onKeyAction?.(targetLabel);
      }
    }
  }, [isShiftActive, isCapsLockActive, isFnActive, onKeyAction, soundVariant, isSoundEnabled]);

  const handleKeyRelease = useCallback((label: string) => {
    if (label === 'L-Shift' || label === 'R-Shift' || label === 'Shift') {
      setIsShiftActive(false);
    }
    if (label === 'Fn') {
      setIsFnActive(false);
    }
    // Send release event for modifier keys
    const isModifier = ['Fn', 'L-Shift', 'R-Shift', 'Shift', 'Ctrl', 'Alt', 'Win', 'Menu', 'Caps'].includes(label);
    if (isModifier) {
      onKeyAction?.(label, true);
    }
  }, [onKeyAction]);

  // 61-key layout definition (60% layout)
  const layout = [
    // Row 1: Numbers with Shift symbols
    [
      { label: 'Esc', w: 1, fn: '`' }, { label: '1', subLabel: '!', w: 1, fn: 'F1' }, { label: '2', subLabel: '@', w: 1, fn: 'F2' }, { label: '3', subLabel: '#', w: 1, fn: 'F3' },
      { label: '4', subLabel: '$', w: 1, fn: 'F4' }, { label: '5', subLabel: '%', w: 1, fn: 'F5' }, { label: '6', subLabel: '^', w: 1, fn: 'F6' }, { label: '7', subLabel: '&', w: 1, fn: 'F7' },
      { label: '8', subLabel: '*', w: 1, fn: 'F8' }, { label: '9', subLabel: '(', w: 1, fn: 'F9' }, { label: '0', subLabel: ')', w: 1, fn: 'F10' }, { label: '-', subLabel: '_', w: 1, fn: 'F11' },
      { label: '=', subLabel: '+', w: 1, fn: 'F12' }, { label: 'Backspace', w: 2, fn: 'Del' }
    ],
    // Row 2
    [
      { label: 'Tab', w: 1.5 }, { label: 'Q', w: 1 }, { label: 'W', w: 1, fn: '↑' }, { label: 'E', w: 1 },
      { label: 'R', w: 1 }, { label: 'T', w: 1 }, { label: 'Y', w: 1 }, { label: 'U', w: 1 },
      { label: 'I', w: 1 }, { label: 'O', w: 1 }, { label: 'P', w: 1 }, { label: '[', subLabel: '{', w: 1 },
      { label: ']', subLabel: '}', w: 1 }, { label: '\\', subLabel: '|', w: 1.5 }
    ],
    // Row 3
    [
      { label: 'Caps', w: 1.75 }, { label: 'A', w: 1, fn: '←' }, { label: 'S', w: 1, fn: '↓' }, { label: 'D', w: 1, fn: '→' },
      { label: 'F', w: 1 }, { label: 'G', w: 1 }, { label: 'H', w: 1 }, { label: 'J', w: 1 },
      { label: 'K', w: 1 }, { label: 'L', w: 1 }, { label: ';', subLabel: ':', w: 1 }, { label: "'", subLabel: '"', w: 1 },
      { label: 'Enter', w: 2.25 }
    ],
    // Row 4
    [
      { label: 'L-Shift', w: 2.25 }, { label: 'Z', w: 1 }, { label: 'X', w: 1 }, { label: 'C', w: 1 },
      { label: 'V', w: 1 }, { label: 'B', w: 1 }, { label: 'N', w: 1 }, { label: 'M', w: 1 },
      { label: ',', subLabel: '<', w: 1 }, { label: '.', subLabel: '>', w: 1 }, { label: '/', subLabel: '?', w: 1 }, { label: 'R-Shift', w: 2.75 }
    ],
    // Row 5
    [
      { label: 'Ctrl', w: 1.25 }, { label: 'Win', w: 1.25 }, { label: 'Alt', w: 1.25 },
      { label: 'Space', w: 6.25 }, { label: 'Alt', w: 1.25 }, { label: 'Fn', w: 1.25 },
      { label: 'Menu', w: 1.25 }, { label: 'Ctrl', w: 1.25 }
    ]
  ];

  return (
    <div className={`w-full mx-auto p-[0.8rem] rounded-[1.5rem] shadow-2xl transition-all duration-500 ${
      theme === 'retro' ? 'bg-[#c0c0c0] border-[6px] border-[#a0a0a0]' :
      theme === 'cyberpunk' ? 'bg-black/90 border border-white/30' :
      theme === 'minimal' ? 'bg-[#f8f9fa] border border-black/5' :
      theme === 'amoled' ? 'bg-black border border-white/30' :
      theme === 'pink' ? 'bg-[#fce7f3] border-2 border-[#fbcfe8]' :
      'glass-effect bg-white/5'
    }`}>
      <div 
        className="flex flex-col gap-[0.4rem]"
        style={{ 
          containerType: 'inline-size',
          // Calculate 1u key height: (Width - 59 gaps) / 60 * 4 + 3 gaps
          // This ensures all keys have the same height as a 1u square key
          '--unit': 'calc((100cqw - 59 * 0.4rem) / 60)',
          '--key-h': 'calc(var(--unit) * 4 + 3 * 0.4rem)'
        } as React.CSSProperties}
      >
        {layout.map((row, rowIndex) => {
          let currentCol = 0;
          return (
            <div 
              key={rowIndex} 
              className="grid grid-cols-[repeat(60,1fr)] gap-[0.4rem]"
              style={{ gridAutoRows: 'var(--key-h)' }}
            >
              {row.map((key, keyIndex) => {
                const colPos = currentCol + key.w / 2;
                currentCol += key.w;
                return (
                  <Key
                    key={`${rowIndex}-${keyIndex}`}
                    label={key.label}
                    subLabel={key.subLabel}
                    fnLabel={(key as any).fn}
                    width={key.w}
                    row={rowIndex}
                    col={colPos}
                    isShiftActive={isShiftActive}
                    isCapsLockActive={isCapsLockActive}
                    isFnActive={isFnActive}
                    lastInteraction={lastInteraction}
                    onPress={handleKeyPress}
                    onRelease={handleKeyRelease}
                    theme={theme}
                    accentColor={accentColor}
                    isRippleEnabled={isRippleEnabled}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};



