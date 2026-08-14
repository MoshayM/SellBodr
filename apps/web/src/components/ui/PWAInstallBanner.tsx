'use client';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    // Previously dismissed this session
    if (sessionStorage.getItem('pwa-banner-dismissed')) {
      setDismissed(true);
      return;
    }

    // iOS detection (Safari doesn't fire beforeinstallprompt)
    const ua = navigator.userAgent;
    const isIOSDevice = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    if (isIOSDevice) { setIsIOS(true); return; }

    // beforeinstallprompt fires before React hydrates — captured globally in layout.tsx
    const captured = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null;
    if (captured) {
      (window as any).__pwaInstallPrompt = null;
      setPrompt(captured);
      return;
    }

    // Fallback: listen in case event hasn't fired yet
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem('pwa-banner-dismissed', '1');
    setDismissed(true);
    setIsIOS(false);
    setPrompt(null);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    dismiss();
  }

  if (installed || dismissed || (!prompt && !isIOS)) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="glass border border-violet-500/20 rounded-2xl p-4 shadow-2xl shadow-black/60">
        <div className="flex items-start gap-3">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-10 h-10 rounded-xl shadow shadow-violet-500/30 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white mb-0.5">Install SellBodr</div>
            {isIOS ? (
              <p className="text-xs text-white/50 leading-snug">
                Tap <strong className="text-white/70">Share</strong> then <strong className="text-white/70">Add to Home Screen</strong> to install on your iPhone or iPad.
              </p>
            ) : (
              <p className="text-xs text-white/50 leading-snug">
                Add to your home screen for a faster, native app experience — works offline too.
              </p>
            )}
            {!isIOS && (
              <button onClick={install}
                className="mt-2.5 w-full btn-primary text-xs py-2 min-h-0 shadow-lg shadow-violet-500/25">
                Install App
              </button>
            )}
          </div>
          <button onClick={dismiss}
            className="text-white/25 hover:text-white/60 transition-colors text-lg leading-none shrink-0 -mt-0.5">
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}
