'use client';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api, saveAuth } from '@/lib/api';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

async function detectFingerprint(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (/Windows/i.test(navigator.userAgent)) return false;
  if (typeof PublicKeyCredential === 'undefined') return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

// ── SellBodr brand mark — inline SVG double-arrow exchange symbol ──────────
function SellBodrMark({ size = 40, gradId = 'sbm', opacity = 1 }: { size?: number; gradId?: string; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity }}>
      <defs>
        <linearGradient id={gradId} x1="20" y1="78" x2="74" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7c3aed"/>
          <stop offset="48%" stopColor="#db2777"/>
          <stop offset="100%" stopColor="#f59e0b"/>
        </linearGradient>
        <linearGradient id={`${gradId}d`} x1="20" y1="78" x2="74" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#1e0a3c"/>
          <stop offset="100%" stopColor="#431407"/>
        </linearGradient>
        <filter id={`${gradId}f`} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5"/>
        </filter>
      </defs>
      {/* Ambient glow */}
      <g filter={`url(#${gradId}f)`} opacity="0.5">
        <path d="M 20 65 C 15 35,53 17,62 19" stroke={`url(#${gradId})`} strokeWidth="12" strokeLinecap="round" fill="none"/>
        <polygon points="74,22 61,24 63,14" fill="#db2777"/>
        <path d="M 80 35 C 85 65,47 83,38 81" stroke={`url(#${gradId})`} strokeWidth="12" strokeLinecap="round" fill="none"/>
        <polygon points="26,78 39,76 37,86" fill="#7c3aed"/>
      </g>
      {/* 3D depth extrusion */}
      <g opacity="0.5">
        <path d="M 23 69 C 18 39,56 21,65 23" stroke={`url(#${gradId}d)`} strokeWidth="9" strokeLinecap="round" fill="none"/>
        <polygon points="77,26 64,28 66,17" fill={`url(#${gradId}d)`}/>
        <path d="M 83 39 C 88 69,50 87,41 85" stroke={`url(#${gradId}d)`} strokeWidth="9" strokeLinecap="round" fill="none"/>
        <polygon points="29,82 42,80 40,90" fill={`url(#${gradId}d)`}/>
      </g>
      {/* Main arrows */}
      <path d="M 20 65 C 15 35,53 17,62 19" stroke={`url(#${gradId})`} strokeWidth="8.5" strokeLinecap="round" fill="none"/>
      <polygon points="74,22 61,24 63,14" fill={`url(#${gradId})`}/>
      <path d="M 80 35 C 85 65,47 83,38 81" stroke={`url(#${gradId})`} strokeWidth="8.5" strokeLinecap="round" fill="none"/>
      <polygon points="26,78 39,76 37,86" fill={`url(#${gradId})`}/>
      {/* Top highlight */}
      <path d="M 20 65 C 15 35,53 17,62 19" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.25"/>
      <path d="M 80 35 C 85 65,47 83,38 81" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.25"/>
    </svg>
  );
}

// ── PWA Install CTA — platform + browser aware ────────────────────────────
function InstallCTA({ installPrompt, isIOS, onInstall }: {
  installPrompt: BeforeInstallPromptEvent | null;
  isIOS: boolean;
  onInstall: () => void;
}) {
  const [open, setOpen] = useState(false);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroid = /Android/.test(ua);
  const isChrome  = /Chrome/.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua);
  const isEdge    = /Edg\//.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSamsung = /SamsungBrowser/.test(ua);

  // ── Case 1: native install prompt available (Chrome/Edge desktop + Android) ─
  if (installPrompt) {
    const label = isAndroid ? 'Install Android App' : 'Install Desktop App';
    const sub   = isAndroid ? 'Tap to add to your home screen' : 'Add to taskbar · Works offline';
    return (
      <motion.button onClick={onInstall}
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        className="mt-5 w-full p-3.5 rounded-2xl flex items-center gap-3 text-left touch-manipulation border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors">
        <div className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
          <SellBodrMark size={30} gradId="install-mark" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-violet-900">{label}</div>
          <div className="text-[11px] text-violet-600 mt-0.5">{sub}</div>
        </div>
        <motion.span animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          className="text-violet-500 text-lg shrink-0">↓</motion.span>
      </motion.button>
    );
  }

  // ── Case 2: iOS (Safari only supports manual Add to Home Screen) ──────────
  if (isIOS) {
    return (
      <div className="mt-5">
        <button onClick={() => setOpen(o => !o)}
          className="w-full p-3.5 rounded-2xl flex items-center gap-3 text-left touch-manipulation border border-sky-200 bg-sky-50 hover:bg-sky-100 active:scale-[0.98] transition-all">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
            <span className="text-white text-xl">🍎</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-sky-900">Install on iPhone / iPad</div>
            <div className="text-[11px] text-sky-600 mt-0.5">Tap to see 4 quick steps</div>
          </div>
          <span className="text-sky-400 text-sm" style={{ transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▾</span>
        </button>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="mt-2 bg-white border border-sky-100 rounded-2xl p-4 space-y-2.5 shadow-sm">
            {[
              { n: 1, icon: '🧭', text: 'Open this page in Safari (not Chrome or Firefox)' },
              { n: 2, icon: '📤', text: 'Tap the Share button  (□↑)  at the bottom of the screen' },
              { n: 3, icon: '📲', text: 'Scroll down and tap "Add to Home Screen"' },
              { n: 4, icon: '✅', text: 'Tap "Add" in the top-right — app appears on your home screen!' },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0">{s.n}</div>
                <p className="text-sm text-slate-700">{s.icon} {s.text}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    );
  }

  // ── Case 3: Android without native prompt (Samsung, Firefox, etc.) ────────
  if (isAndroid) {
    const steps = isSamsung
      ? [
          { n: 1, text: 'Tap the ⋮ menu (top-right)' },
          { n: 2, text: 'Tap "Add page to" → "Home screen"' },
          { n: 3, text: 'Tap "Add" to confirm' },
        ]
      : isFirefox
      ? [
          { n: 1, text: 'Tap the ⋮ menu (top-right)' },
          { n: 2, text: 'Tap "Install"' },
          { n: 3, text: 'Tap "Add" to confirm' },
        ]
      : [
          { n: 1, text: 'Tap the ⋮ menu in Chrome (top-right)' },
          { n: 2, text: 'Tap "Add to Home screen"' },
          { n: 3, text: 'Tap "Install" or "Add" to confirm' },
        ];
    return (
      <div className="mt-5">
        <button onClick={() => setOpen(o => !o)}
          className="w-full p-3.5 rounded-2xl flex items-center gap-3 text-left touch-manipulation border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] transition-all">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            <span className="text-white text-xl">🤖</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-emerald-900">Install Android App</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Add to home screen — 3 quick steps</div>
          </div>
          <span className="text-emerald-400 text-sm" style={{ transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▾</span>
        </button>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="mt-2 bg-white border border-emerald-100 rounded-2xl p-4 space-y-2.5 shadow-sm">
            {steps.map(s => (
              <div key={s.n} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">{s.n}</div>
                <p className="text-sm text-slate-700">{s.text}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    );
  }

  // ── Case 4: Desktop (Windows / macOS / Linux) — Chrome, Edge, Firefox, Safari
  const browserSteps = (isChrome || isEdge)
    ? [
        { icon: '⋮', text: `Click the ${isEdge ? '…' : '⋮'} menu at the top-right of your browser` },
        { icon: '📲', text: 'Look for "Install SellBodr" or "Install app…" in the menu and click it' },
        { icon: '✅', text: 'Click "Install" in the popup — SellBodr opens as its own window!' },
        { icon: '💡', text: 'Not seeing "Install"? Use the site for ~30 seconds — Chrome enables it after brief engagement.' },
      ]
    : isFirefox
    ? [
        { icon: '☰', text: 'Click the ☰ menu at the top-right of Firefox' },
        { icon: '📲', text: 'Click "Install site as app…"' },
        { icon: '✅', text: 'Click "Install" in the dialog — done!' },
      ]
    : [
        { icon: '⚙️', text: 'Open Safari Preferences → Advanced → check "Show Develop menu in menu bar"' },
        { icon: '📌', text: 'Go to File menu → "Add to Dock"' },
        { icon: '✅', text: 'SellBodr appears in your Mac Dock as a standalone app!' },
      ];

  const browserLabel = isEdge ? 'Install on Edge' : isFirefox ? 'Install on Firefox' : isChrome ? 'Install on Chrome' : 'Install Desktop App';
  const browserColor = isEdge ? { border: '#93c5fd', bg: '#eff6ff', hover: '#dbeafe', icon: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', text: '#1e3a8a', sub: '#1d4ed8' }
    : isFirefox ? { border: '#fdba74', bg: '#fff7ed', hover: '#fed7aa', icon: 'linear-gradient(135deg,#ea580c,#f97316)', text: '#7c2d12', sub: '#c2410c' }
    : { border: '#a5b4fc', bg: '#eef2ff', hover: '#e0e7ff', icon: 'linear-gradient(135deg,#4338ca,#6366f1)', text: '#1e1b4b', sub: '#4338ca' };

  return (
    <div className="mt-5">
      <button onClick={() => setOpen(o => !o)}
        className="w-full p-3.5 rounded-2xl flex items-center gap-3 text-left touch-manipulation transition-all active:scale-[0.98]"
        style={{ border: `1px solid ${browserColor.border}`, background: open ? browserColor.hover : browserColor.bg }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: browserColor.icon }}>
          <SellBodrMark size={30} gradId="desktop-mark" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: browserColor.text }}>{browserLabel}</div>
          <div className="text-[11px] mt-0.5" style={{ color: browserColor.sub }}>Works offline · Runs as a native window</div>
        </div>
        <span style={{ color: browserColor.sub, transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▾</span>
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="mt-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5">
          {browserSteps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
              <p className="text-sm text-slate-700">{s.icon} {s.text}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ── Account-deletion recovery modal ───────────────────────────────────────
function DeletionRecoveryModal({
  email, password, expiresAt, onRestore, onPurge, onClose,
}: {
  email: string; password: string; expiresAt: number;
  onRestore: () => void; onPurge: () => void; onClose: () => void;
}) {
  const [action, setAction]   = useState<'restore' | 'purge' | null>(null);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = String(Math.floor(remaining / 3600000)).padStart(2, '0');
  const mm = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

  async function handle(choice: 'restore' | 'purge') {
    setAction(choice); setBusy(true); setErr('');
    try {
      const endpoint = choice === 'restore' ? '/auth/restore-account' : '/auth/purge-account';
      const res = await fetch(`/api/v1${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      if (choice === 'restore') {
        saveAuth(data);
        onRestore();
      } else {
        onPurge();
      }
    } catch (e: any) {
      setErr(e.message || 'Something went wrong');
      setBusy(false); setAction(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-2xl border border-slate-100">

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#fff1f2,#ffe4e6)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
        </div>

        <h3 className="text-center text-lg font-black text-slate-900 mb-1">Account Scheduled for Deletion</h3>
        <p className="text-center text-slate-500 text-sm mb-5 leading-relaxed">
          Your account is pending deletion. You can restore it or confirm permanent removal within the grace period.
        </p>

        {/* Countdown */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="text-rose-600 font-mono font-bold text-base tracking-widest">{hh}:{mm}:{ss}</span>
            <span className="text-rose-400 text-xs font-medium">remaining</span>
          </div>
        </div>

        {err && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-sm text-center">{err}</div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button onClick={() => handle('restore')} disabled={busy}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff', boxShadow: busy && action === 'restore' ? 'none' : '0 4px 14px rgba(124,58,237,0.35)' }}>
            {busy && action === 'restore' ? 'Restoring…' : 'Restore My Account'}
          </button>
          <button onClick={() => handle('purge')} disabled={busy}
            className="w-full py-3 rounded-2xl font-bold text-sm border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50">
            {busy && action === 'purge' ? 'Deleting…' : 'Delete Immediately'}
          </button>
          <button onClick={onClose} disabled={busy}
            className="w-full py-2.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Cancel
          </button>
        </div>

        <p className="text-center text-slate-400 text-[11px] mt-4 leading-relaxed">
          Transactions &amp; work history are retained for compliance regardless of choice.
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [showPw, setShowPw]               = useState(false);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fpLoading, setFpLoading]         = useState(false);
  const [canFingerprint, setCanFingerprint] = useState(false);
  const fpModuleRef    = useRef<Promise<typeof import('@simplewebauthn/browser')> | null>(null);
  const fpChallengeRef = useRef<{ data: any; fetchedAt: number } | null>(null);
  const [gsiReady, setGsiReady]           = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS]                 = useState(false);
  const [isInstalled, setIsInstalled]     = useState(false);

  // Pending deletion recovery state
  const [pendingDeletion, setPendingDeletion]     = useState<{ email: string; password: string; expiresAt: number } | null>(null);
  const [showDeletedBanner, setShowDeletedBanner] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('deleted') === '1')
      setShowDeletedBanner(true);
  }, []);

  useEffect(() => {
    if (localStorage.getItem('bs_access_token')) router.replace('/opportunities');
  }, [router]);

  useEffect(() => {
    detectFingerprint().then(ok => {
      setCanFingerprint(ok);
      if (!ok) return;
      // Pre-warm module immediately
      fpModuleRef.current = import('@simplewebauthn/browser');
      // Pre-fetch challenge immediately on page load — so fingerprint tap is instant
      api.passkeys.loginBegin(undefined)
        .then(data => { fpChallengeRef.current = { data, fetchedAt: Date.now() }; })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) { setIsInstalled(true); return; }
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream) { setIsIOS(true); return; }
    const captured = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null;
    if (captured) { (window as any).__pwaInstallPrompt = null; setInstallPrompt(captured); return; }
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    // Preconnect to Google domains so the script + auth handshake start sooner
    for (const origin of ['https://accounts.google.com', 'https://apis.google.com']) {
      const l = document.createElement('link');
      l.rel = 'preconnect'; l.href = origin; l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    }
    const el = document.createElement('script');
    el.src = 'https://accounts.google.com/gsi/client';
    el.async = true; el.defer = true;
    el.onload = () => setGsiReady(true);
    document.head.appendChild(el);
    return () => { try { document.head.removeChild(el); } catch {} };
  }, []);

  useEffect(() => {
    if (!gsiReady || !googleBtnRef.current || !GOOGLE_CLIENT_ID) return;
    const g = (window as any).google;
    if (!g) return;
    // If the user just signed out, revoke the Google hint now that GSI is loaded
    const pendingRevoke = localStorage.getItem('bs_pending_google_revoke');
    if (pendingRevoke) {
      localStorage.removeItem('bs_pending_google_revoke');
      g.accounts.id.revoke(pendingRevoke, () => {});
    }
    g.accounts.id.disableAutoSelect();
    g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential, auto_select: false });
    g.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline', size: 'large',
      width: googleBtnRef.current.offsetWidth || 400,
      text: 'signin_with', logo_alignment: 'left', shape: 'rectangular',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gsiReady]);

  async function handleGoogleCredential(response: { credential: string }) {
    setError(''); setGoogleLoading(true);
    try {
      const res = await api.auth.googleLogin(response.credential) as any;
      saveAuth(res); router.push('/opportunities');
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  }

  function triggerGoogleSignIn() {
    if (!GOOGLE_CLIENT_ID) { setError('Google Sign-In is not configured. Use email & password below.'); return; }
    const g = (window as any).google;
    if (!g) { setError('Google Sign-In failed to load. Please refresh.'); return; }
    g.accounts.id.prompt((n: any) => {
      if (n.isNotDisplayed() || n.isSkippedMoment())
        googleBtnRef.current?.querySelector('div[role=button]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  // Pre-fetch passkey challenge when email is entered so tap→scan is instant
  function prefetchFpChallenge(emailVal: string) {
    if (!canFingerprint) return;
    const CACHE_MS = 4 * 60 * 1000; // 4 min — challenge TTL is 5 min
    const cached = fpChallengeRef.current;
    if (cached && Date.now() - cached.fetchedAt < CACHE_MS) return;
    fpChallengeRef.current = null;
    api.passkeys.loginBegin(emailVal || undefined)
      .then(data => { fpChallengeRef.current = { data, fetchedAt: Date.now() }; })
      .catch(() => {});
  }

  async function loginWithFingerprint() {
    setError(''); setFpLoading(true);
    try {
      // Use pre-fetched challenge if fresh, otherwise fetch now
      const CACHE_MS = 4 * 60 * 1000;
      const cached = fpChallengeRef.current;
      const isFresh = cached && Date.now() - cached.fetchedAt < CACHE_MS;

      const [beginData, { startAuthentication }] = await Promise.all([
        isFresh ? Promise.resolve(cached!.data) : api.passkeys.loginBegin(email || undefined),
        fpModuleRef.current ?? import('@simplewebauthn/browser'),
      ]);
      fpChallengeRef.current = null; // consume it

      const { challengeId, ...options } = beginData;
      // Use server's userVerification setting — do NOT override with 'required'
      // 'required' causes "unknown error talking to credential manager" on Android
      const assnResp = await startAuthentication(options);
      const auth = await api.passkeys.loginComplete(challengeId, assnResp) as any;
      saveAuth(auth); router.push('/opportunities');
    } catch (err: any) {
      fpChallengeRef.current = null; // clear stale challenge on error
      const msg = err?.name === 'NotAllowedError'
        ? 'Fingerprint scan cancelled.'
        : err?.name === 'InvalidStateError' || err?.message?.includes('credential')
        ? 'Passkey not found on this device. Try signing in with email.'
        : (err?.message || 'Fingerprint login failed.');
      setError(msg);
    } finally { setFpLoading(false); }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.auth.login(email, password) as any;
      if (res?.pendingDeletion) {
        setPendingDeletion({ email, password, expiresAt: res.deletionExpiresAt });
        return;
      }
      saveAuth(res); router.push('/opportunities');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
    } finally { setLoading(false); }
  }

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setInstallPrompt(null);
  }

  return (
    <div className="min-h-screen flex bg-white">

      {/* Pending deletion recovery modal */}
      <AnimatePresence>
        {pendingDeletion && (
          <DeletionRecoveryModal
            email={pendingDeletion.email}
            password={pendingDeletion.password}
            expiresAt={pendingDeletion.expiresAt}
            onRestore={() => router.push('/opportunities')}
            onPurge={() => { setPendingDeletion(null); router.push('/register'); }}
            onClose={() => setPendingDeletion(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Left brand panel (desktop only) ─────────────────────── */}
      <div className="hidden lg:flex flex-col w-[46%] relative overflow-hidden p-12 xl:p-16 select-none"
        style={{ background: 'linear-gradient(145deg, #0D1B35 0%, #0F2040 35%, #162240 65%, #0D1B35 100%)' }}>

        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.28), transparent 70%)', transform: 'translate(35%, -35%)' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.22), transparent 70%)', transform: 'translate(-30%, 30%)' }} />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)', transform: 'translate(-50%, -50%)' }} />
        {/* Dot-grid texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.07) 1px, transparent 0)', backgroundSize: '28px 28px' }} />

        {/* Logo wordmark */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative z-10 flex items-center gap-3 mb-10">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-9 h-9 shrink-0"
            style={{ filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.9)) brightness(1.2)' }} />
          <div>
            <div className="text-white font-black text-[15px] tracking-tight leading-none">SellBodr</div>
            <div className="text-[8px] font-semibold uppercase tracking-[0.18em] leading-none mt-0.5"
              style={{ color: 'rgba(255,255,255,0.3)' }}>eCommerce Intelligence</div>
          </div>
          <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)', letterSpacing: '0.08em' }}>
            AI
          </span>
        </motion.div>

        {/* Hero content */}
        <motion.div className="relative z-10 flex-1 flex flex-col justify-center"
          initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.65 }}>

          {/* Live indicator */}
          <div className="inline-flex items-center gap-2 mb-7 px-3 py-1.5 rounded-full w-fit"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-violet-200 text-[11px] font-medium tracking-wider">AI-powered · Cross-Border eCommerce</span>
          </div>

          <h1 className="text-[2.4rem] xl:text-[2.8rem] font-black text-white leading-[1.08] mb-5">
            Source in India.<br />
            <span style={{ background: 'linear-gradient(90deg, #c4b5fd, #f9a8d4, #fcd34d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Sell everywhere.
            </span><br />
            Profit instantly.
          </h1>

          <p className="text-violet-200 text-[14.5px] leading-[1.75] opacity-75 mb-8">
            AI discovers products to source cheap in India and sell at 2–5× margin globally — verdict in under 60 seconds.
          </p>

          {/* Feature highlights */}
          <div className="space-y-3 mb-8">
            {[
              { icon: '🔭', label: 'Discover high-demand products in 13 global marketplaces' },
              { icon: '📊', label: 'Full profit model — fees, shipping, duties & ad spend' },
              { icon: '🎯', label: 'Launch / Hold / Reject verdict with confidence score' },
              { icon: '🏭', label: 'Real Indian suppliers with MOQ, lead time & location' },
            ].map((f, i) => (
              <motion.div key={f.label}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.45 }}
                className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {f.icon}
                </span>
                <span className="text-violet-200 text-[13px] leading-snug opacity-85">{f.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-6">
            {[
              { value: '13', label: 'Marketplaces' },
              { value: '60s', label: 'AI verdict' },
              { value: '2–5×', label: 'Avg margin' },
            ].map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 + i * 0.07, duration: 0.4 }}>
                <div className="text-white font-black text-xl leading-none">{s.value}</div>
                <div className="text-violet-400 text-[11px] font-medium mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonial */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="relative z-10 rounded-2xl px-5 py-4 mt-10"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)', backdropFilter: 'blur(10px)' }}>
          <div className="flex gap-0.5 mb-2.5">
            {[...Array(5)].map((_, i) => (
              <svg key={i} width="11" height="11" viewBox="0 0 12 12" fill="#fbbf24"><path d="M6 1l1.4 2.8 3.1.45-2.25 2.2.53 3.1L6 8.05 3.22 9.55l.53-3.1L1.5 4.25l3.1-.45z"/></svg>
            ))}
          </div>
          <p className="text-violet-100 text-[13px] leading-relaxed italic opacity-90">
            &ldquo;Found a ₹380 product in Jaipur, listed on Amazon US for $28. Margin after fees: 61%. Paid for itself in week one.&rdquo;
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}>R</div>
            <div className="min-w-0">
              <p className="text-violet-300 text-[11px] font-semibold leading-none">Rahul M. · Amazon FBA Seller</p>
              <p className="text-violet-500 text-[10px] mt-0.5">Verified SellBodr user</p>
            </div>
            <span className="ml-auto flex items-center gap-1 text-emerald-400 text-[10px] font-semibold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Verified
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 overflow-y-auto" style={{ background: '#F4F6FB' }}>

        {/* Mobile header logo */}
        <div className="lg:hidden mb-8 flex flex-col items-center gap-2.5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0D1B35, #162240)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <img src="/icons/icon.svg" alt="SellBodr" className="w-9 h-9"
              style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.8)) brightness(1.2)' }} />
          </div>
          <span className="text-slate-900 font-black text-xl tracking-tight">SellBodr</span>
          <span className="text-slate-500 text-xs">Cross-Border eCommerce Intelligence</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="w-full max-w-[420px]">

          {/* ── Main card ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80"
            style={{ boxShadow: '0 4px 6px -1px rgba(15,23,42,0.05), 0 20px 48px -8px rgba(15,23,42,0.13)' }}>

            {/* Card header */}
            <div className="px-8 pt-9 pb-7 sm:px-10 sm:pt-10 sm:pb-8 text-center border-b border-slate-100">
              {/* Account deletion scheduled banner */}
              {showDeletedBanner && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-left">
                  <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <p className="text-amber-800 text-sm font-semibold leading-snug">Account deletion scheduled</p>
                    <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                      You have <strong>24 hours</strong> to sign back in and restore your account, or confirm permanent deletion.
                    </p>
                  </div>
                </div>
              )}
              <h2 className="text-[1.6rem] font-black text-slate-900 leading-tight mb-2">Welcome back</h2>
              <p className="text-slate-400 text-[13.5px] leading-relaxed">Your next winning product is one scan away</p>
            </div>

            {/* Card body */}
            <div className="px-8 py-8 sm:px-10 sm:py-9">

              {/* Quick login methods */}
              <div className="space-y-3">
                {/* Google Sign-In */}
                {GOOGLE_CLIENT_ID ? (
                  <div ref={googleBtnRef} className="w-full min-h-[48px] flex items-center justify-center"
                    style={{ opacity: gsiReady ? 1 : 0.5, transition: 'opacity 0.3s' }} />
                ) : (
                  <button type="button" onClick={triggerGoogleSignIn} disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 font-semibold text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                    {googleLoading ? <Spinner className="text-violet-500" /> : <GoogleIcon />}
                    {googleLoading ? 'Signing in…' : 'Continue with Google'}
                  </button>
                )}

                {/* Fingerprint */}
                {canFingerprint && (
                  <motion.button type="button" onClick={loginWithFingerprint}
                    disabled={fpLoading || loading || googleLoading}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-sm font-semibold text-slate-600 hover:text-violet-700 transition-all border border-slate-200 hover:border-violet-300 hover:bg-violet-50 bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                    {fpLoading ? <Spinner className="text-violet-500" /> : <FingerprintIcon className="w-5 h-5 text-violet-500" />}
                    {fpLoading ? 'Scanning…' : 'Use fingerprint / Face ID'}
                  </motion.button>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-7">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-slate-400 text-xs font-medium whitespace-nowrap">or continue with email</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Email + Password form */}
              <form onSubmit={submitPassword} className="space-y-5" noValidate>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">
                    Email
                  </label>
                  <input type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    onBlur={e => prefetchFpChallenge(e.target.value)}
                    autoComplete="email" inputMode="email" placeholder="you@example.com"
                    className="input-dark" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Password</label>
                    <a href="/forgot-password" className="text-xs text-violet-600 hover:text-violet-700 transition-colors font-semibold">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      autoComplete="current-password" placeholder="••••••••"
                      className="input-dark pr-11" />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors text-sm select-none">
                      {showPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm text-center font-medium">
                    {error}
                  </motion.div>
                )}

                <motion.button type="submit" disabled={loading || googleLoading}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="btn-primary w-full text-base py-3.5 mt-1 min-h-0 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading
                    ? <span className="flex items-center gap-2 justify-center"><Spinner className="text-white/80" /> Signing in…</span>
                    : 'Sign in →'}
                </motion.button>
              </form>
            </div>

            {/* Card footer — register link */}
            <div className="px-8 py-5 sm:px-10 border-t border-slate-100 text-center rounded-b-3xl bg-slate-50/60">
              <p className="text-slate-500 text-sm">
                No account?{' '}
                <Link href="/register" className="text-violet-600 hover:text-violet-700 font-bold transition-colors">
                  Create one free →
                </Link>
              </p>
            </div>
          </div>

          {/* PWA install CTA — outside main card, visually separated */}
          {!isInstalled && (
            <div className="mt-4">
              <InstallCTA installPrompt={installPrompt} isIOS={isIOS} onInstall={handleInstall} />
            </div>
          )}

          {/* Trust + legal row */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {[
                { icon: <LockIcon />, text: '256-bit SSL' },
                { icon: <ShieldIcon />, text: 'SOC2 ready' },
                { icon: <UptimeIcon />, text: '99.9% uptime' },
              ].map(b => (
                <span key={b.text} className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <span className="text-slate-300">{b.icon}</span>{b.text}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-slate-400 text-xs hover:text-slate-600 transition-colors">Privacy</Link>
              <span className="text-slate-200">·</span>
              <Link href="/terms" className="text-slate-400 text-xs hover:text-slate-600 transition-colors">Terms</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Icon components ────────────────────────────────────────────────────────

function Spinner({ className = '' }: { className?: string }) {
  return (
    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
      className={`w-4 h-4 border-2 border-t-transparent rounded-full block ${className}`}
      style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }} />
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function FingerprintIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
      <path d="M2 12a10 10 0 0 1 18-6"/>
      <path d="M2 17c1 0 1.5-.5 2-1s1-1 2-1 1.5.5 2 1 1 1 2 1 1.5-.5 2-1 1-1 2-1"/>
      <path d="M20 11c0 2-1.5 6.5-3 8"/>
      <path d="M6 11a6 6 0 0 1 12 0c0 1.5 0 3-.5 5"/>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}


function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function UptimeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
