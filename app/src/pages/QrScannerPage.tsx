
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Html5Qrcode } from 'html5-qrcode';
import { RefreshCw } from 'lucide-react';
import { KeyboardTheme } from '../components/Keyboard';
import { StorageService } from '../services/platformService';
import QrPlugin from '../plugins/QrPlugin';

interface QrScannerPageProps {
  theme?: KeyboardTheme;
}

export const QrScannerPage: React.FC<QrScannerPageProps> = ({ theme = 'glass' }) => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';

  const handleScan = async (data: string) => {
    const match = data.match(/(?:https?:\/\/|hid:\/\/)?(\d{1,3}(?:\.\d{1,3}){3}):(\d+)/);
    if (match) {
      StorageService.setItem('scanned_device_data', JSON.stringify({ ip: match[1], port: match[2] }));
    }
    navigate(-1);
  };

  // ── iOS: native full-screen scanner ──────────────────────────────────────
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return;

    QrPlugin.scan()
      .then(({ value }) => handleScan(value))
      .catch((err) => {
        const code = err?.code ?? err?.message ?? '';
        if (code === 'CANCELLED') {
          navigate(-1);
        } else {
          setError(
            code === 'PERMISSION_DENIED'
              ? 'Camera access denied. Go to Settings > Privacy > Camera and enable access for this app.'
              : 'Could not open scanner. Please try again.'
          );
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Android / web: H5 fallback ────────────────────────────────────────────
  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') return;

    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        const element = document.getElementById(containerId);
        if (!element) return;

        scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (w: number, h: number) => {
              const s = Math.max(50, Math.floor(Math.min(w, h) * 0.7));
              return { width: s, height: s };
            },
          },
          (decoded) => { handleScan(decoded); },
          () => { /* silence per-frame scan errors */ }
        );
        setIsScanning(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isPermission = /permission|notallowed|denied/i.test(msg);
        setError(isPermission
          ? 'Camera access denied. Please check permissions.'
          : 'Could not access camera. Please try again.');
      }
    };

    startScanner();

    return () => {
      if (scanner?.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── iOS: just show a loading screen while the native overlay is open ──────
  if (Capacitor.getPlatform() === 'ios') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
        {error ? (
          <div className="flex flex-col items-center gap-[1rem] p-[2rem] text-center">
            <p className="text-rose-400 font-medium text-[0.9rem]">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-[1.5rem] py-[0.6rem] bg-white/10 rounded-full text-white text-[0.85rem] hover:bg-white/20 transition-all"
            >
              Go Back
            </button>
          </div>
        ) : (
          <RefreshCw className="animate-spin text-white/40" size={40} />
        )}
      </div>
    );
  }

  // ── H5 fallback UI ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-[1rem] py-[0.8rem]">
        <span className="text-white font-semibold text-[1rem]">Scan QR Code</span>
        <button
          onClick={() => navigate(-1)}
          className="text-white/60 hover:text-white text-[1.5rem] leading-none"
        >
          ✕
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div id={containerId} className="w-full h-full" />

        {!isScanning && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1rem]">
            <RefreshCw className="animate-spin text-white/40" size={48} />
            <p className="text-white/40 text-[0.9rem]">Initializing Camera…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-[2rem] text-center gap-[1rem]">
            <p className="text-rose-500 font-bold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-[1.5rem] py-[0.7rem] bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-white/40 text-[0.75rem] py-[0.8rem]">
        Point your camera at the QR code displayed on the PC client.
      </p>
    </div>
  );
};
