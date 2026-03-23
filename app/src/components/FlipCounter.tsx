import React, { useEffect, useState } from 'react';
import { KeyboardTheme } from './Keyboard';

// Inject flip keyframes once into the document
if (typeof document !== 'undefined' && !document.getElementById('flip-digit-style')) {
  const s = document.createElement('style');
  s.id = 'flip-digit-style';
  s.textContent = `
    @keyframes flipDown {
      0% { transform: rotateX(0deg); }
      100% { transform: rotateX(-90deg); }
    }
    @keyframes flipUp {
      0% { transform: rotateX(90deg); }
      100% { transform: rotateX(0deg); }
    }
    .flip-card {
      perspective: 200px;
    }
  `;
  document.head.appendChild(s);
}

// Mechanical split-flap digit like airport/train station displays
const FlipDigit: React.FC<{
  value: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  shadowColor: string;
}> = ({ value, bgColor, textColor, borderColor, shadowColor }) => {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (value !== current) {
      setPrevious(current);
      setCurrent(value);
      setIsFlipping(true);
      const timer = setTimeout(() => setIsFlipping(false), 350);
      return () => clearTimeout(timer);
    }
  }, [value, current]);

  const halfStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '50%',
    overflow: 'hidden',
    background: bgColor,
    border: `1px solid ${borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    fontSize: '1rem',
    fontWeight: 700,
    color: textColor,
    lineHeight: 1,
  };

  return (
    <div className="flip-card" style={{
      position: 'relative',
      width: '1.4rem',
      height: '1.8rem',
      flexShrink: 0,
    }}>
      {/* Static top half - shows CURRENT value */}
      <div style={{
        ...halfStyle,
        top: 0,
        borderRadius: '4px 4px 0 0',
        borderBottom: 'none',
        alignItems: 'flex-end',
        zIndex: 1,
      }}>
        <span style={{ transform: 'translateY(50%)' }}>{current}</span>
      </div>

      {/* Static bottom half - shows CURRENT value */}
      <div style={{
        ...halfStyle,
        bottom: 0,
        borderRadius: '0 0 4px 4px',
        borderTop: 'none',
        alignItems: 'flex-start',
        zIndex: 1,
      }}>
        <span style={{ transform: 'translateY(-50%)' }}>{current}</span>
      </div>

      {/* Animated flip - top half with PREVIOUS value flips down */}
      {isFlipping && (
        <div
          style={{
            ...halfStyle,
            top: 0,
            borderRadius: '4px 4px 0 0',
            borderBottom: 'none',
            alignItems: 'flex-end',
            transformOrigin: 'bottom',
            zIndex: 3,
            backfaceVisibility: 'hidden',
            animation: 'flipDown 0.18s ease-in forwards',
          }}
        >
          <span style={{ transform: 'translateY(50%)' }}>{previous}</span>
        </div>
      )}

      {/* Animated flip - bottom half with CURRENT value flips up */}
      {isFlipping && (
        <div
          style={{
            ...halfStyle,
            bottom: 0,
            borderRadius: '0 0 4px 4px',
            borderTop: 'none',
            alignItems: 'flex-start',
            transformOrigin: 'top',
            zIndex: 2,
            backfaceVisibility: 'hidden',
            animation: 'flipUp 0.18s ease-out 0.16s forwards',
            transform: 'rotateX(90deg)',
          }}
        >
          <span style={{ transform: 'translateY(-50%)' }}>{current}</span>
        </div>
      )}

      {/* Center shadow line for depth */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: '1px',
        background: shadowColor,
        zIndex: 10,
        pointerEvents: 'none',
      }} />
    </div>
  );
};

interface FlipCounterProps {
  count: number;
  theme: KeyboardTheme;
}

export const FlipCounter: React.FC<FlipCounterProps> = ({ count, theme }) => {
  const digits = String(Math.min(count, 99999)).padStart(5, '0').split('');

  const bgColor = {
    glass:    'rgba(20,20,25,0.9)',
    retro:    '#d0d0d0',
    cyberpunk:'rgba(10,10,15,0.95)',
    minimal:  'rgba(0,0,0,0.08)',
    amoled:   '#0a0a0a',
    pink:     '#fce7f3',
  }[theme] ?? 'rgba(20,20,25,0.9)';

  const textColor = {
    glass:    'rgba(255,255,255,0.9)',
    retro:    '#222',
    cyberpunk:'rgba(0,255,136,0.9)',
    minimal:  'rgba(0,0,0,0.8)',
    amoled:   'rgba(255,255,255,0.85)',
    pink:     '#831843',
  }[theme] ?? 'rgba(255,255,255,0.9)';

  const borderColor = {
    glass:    'rgba(255,255,255,0.15)',
    retro:    'rgba(0,0,0,0.25)',
    cyberpunk:'rgba(0,255,136,0.3)',
    minimal:  'rgba(0,0,0,0.15)',
    amoled:   'rgba(255,255,255,0.1)',
    pink:     '#f9a8d4',
  }[theme] ?? 'rgba(255,255,255,0.15)';

  const shadowColor = {
    glass:    'rgba(0,0,0,0.5)',
    retro:    'rgba(0,0,0,0.3)',
    cyberpunk:'rgba(0,0,0,0.7)',
    minimal:  'rgba(0,0,0,0.2)',
    amoled:   'rgba(0,0,0,0.6)',
    pink:     'rgba(131,24,67,0.2)',
  }[theme] ?? 'rgba(0,0,0,0.5)';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.3rem 0.5rem',
      borderRadius: '6px',
      background: theme === 'glass' ? 'rgba(255,255,255,0.05)' :
                  theme === 'cyberpunk' ? 'rgba(0,255,136,0.05)' :
                  theme === 'pink' ? 'rgba(236,72,153,0.1)' :
                  theme === 'minimal' ? 'rgba(0,0,0,0.03)' :
                  'transparent',
    }}>
      {digits.map((d, i) => (
        <FlipDigit
          key={i}
          value={d}
          bgColor={bgColor}
          textColor={textColor}
          borderColor={borderColor}
          shadowColor={shadowColor}
        />
      ))}
    </div>
  );
};
