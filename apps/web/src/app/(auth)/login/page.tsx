'use client';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  const [gsiReady, setGsiReady]           = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS]                 = useState(false);
  const [isInstalled, setIsInstalled]     = useState(false);

  useEffect(() => {
    if (localStorage.getItem('bs_access_token')) router.replace('/opportunities');
  }, [router]);

  useEffect(() => { detectFingerprint().then(setCanFingerprint); }, []);

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
    const el = document.createElement('script');
    el.src = 'https://accounts.google.com/gsi/client';
    el.async = true;
    el.onload = () => setGsiReady(true);
    document.head.appendChild(el);
    return () => { try { document.head.removeChild(el); } catch {} };
  }, []);

  useEffect(() => {
    if (!gsiReady || !googleBtnRef.current || !GOOGLE_CLIENT_ID) return;
    const g = (window as any).google;
    if (!g) return;
    g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
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

  async function loginWithFingerprint() {
    setError(''); setFpLoading(true);
    try {
      const beginData = await api.passkeys.loginBegin(email || undefined);
      const { challengeId, ...options } = beginData;
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const assnResp = await startAuthentication({ ...options, userVerification: 'required' });
      const auth = await api.passkeys.loginComplete(challengeId, assnResp) as any;
      saveAuth(auth); router.push('/opportunities');
    } catch (err: any) {
      setError(err?.name === 'NotAllowedError' ? 'Fingerprint scan cancelled.' : (err?.message || 'Fingerprint login failed.'));
    } finally { setFpLoading(false); }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.auth.login(email, password) as any;
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

      {/* ── Left brand panel (desktop only) ─────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] relative overflow-hidden p-12 xl:p-16 select-none"
        style={{ background: 'linear-gradient(145deg, #4c1d95 0%, #6d28d9 30%, #7c3aed 55%, #4338ca 80%, #312e81 100%)' }}>

        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.25), transparent 70%)', transform: 'translate(35%, -35%)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(219,39,119,0.18), transparent 70%)', transform: 'translate(-30%, 30%)' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08), transparent 70%)', transform: 'translate(-50%, -50%)' }} />
        {/* Dot-grid texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.07) 1px, transparent 0)', backgroundSize: '28px 28px' }} />

        {/* Logo wordmark */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)' }}>
            <SellBodrMark size={26} gradId="nav-mark" />
          </div>
          <span className="text-white font-black text-xl tracking-tight">SellBodr</span>
          <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#e9d5ff', border: '1px solid rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>
            AI
          </span>
        </motion.div>

        {/* Hero content */}
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.65 }}>

            {/* Tagline chip */}
            <div className="inline-flex items-center gap-1.5 mb-5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-violet-100 text-[11px] font-semibold tracking-widest uppercase">AI · Cross-Border · eCommerce</span>
            </div>

            <h1 className="text-4xl xl:text-[2.7rem] font-black text-white leading-[1.1] mb-5">
              Source in India.<br />
              <span style={{ background: 'linear-gradient(90deg, #c4b5fd, #f9a8d4, #fcd34d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Sell everywhere.
              </span><br />
              Profit instantly.
            </h1>

            <p className="text-violet-100 text-base leading-relaxed max-w-sm opacity-85 mb-7">
              AI finds products you can source cheap in India and sell at 2–5× margin on Amazon, Etsy, Walmart &amp; 73 more — with a Launch / Hold / Reject verdict in under 60 seconds.
            </p>

            {/* Feature highlights */}
            <div className="space-y-3">
              {[
                { icon: <SearchIcon />, text: 'AI scans 76+ marketplaces for high-demand, low-competition products' },
                { icon: <ScoreIcon />,  text: '7-dimension Opportunity Score with full profit model & landed cost' },
                { icon: <RocketIcon />, text: 'India supplier contacts + AI-generated listing copy, ready to launch' },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    {f.icon}
                  </div>
                  <p className="text-violet-100 text-sm leading-relaxed opacity-90">{f.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="mt-8 grid grid-cols-3 gap-2.5">
            {[
              { val: '76+', label: 'Marketplaces' },
              { val: '19', label: 'Countries' },
              { val: '< 60s', label: 'Scan to verdict' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3.5 text-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)' }}>
                <div className="text-xl font-black text-white mb-0.5"
                  style={{ background: 'linear-gradient(135deg, #e9d5ff, #fbcfe8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {s.val}
                </div>
                <div className="text-violet-200 text-[10px] leading-snug font-medium">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Testimonial */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
          className="relative z-10 rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)' }}>
          <div className="flex gap-0.5 mb-3">
            {[...Array(5)].map((_, i) => (
              <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="#fbbf24"><path d="M6 1l1.4 2.8 3.1.45-2.25 2.2.53 3.1L6 8.05 3.22 9.55l.53-3.1L1.5 4.25l3.1-.45z"/></svg>
            ))}
          </div>
          <p className="text-violet-100 text-sm leading-relaxed italic">
            &ldquo;Found a ₹380 product sourcing in Jaipur, listed it on Amazon US for $28.&nbsp;
            Margin after fees: 61%. SellBodr paid for itself in week one.&rdquo;
          </p>
          <div className="flex items-center gap-2.5 mt-3.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}>R</div>
            <div>
              <p className="text-violet-200 text-xs font-semibold">Rahul M. · Amazon FBA Seller</p>
              <p className="text-violet-400 text-[10px]">Verified SellBodr user</p>
            </div>
            <span className="ml-auto flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Verified
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 bg-slate-50">

        {/* Mobile header logo */}
        <div className="lg:hidden mb-7 flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
            <SellBodrMark size={38} gradId="mobile-logo-mark" />
          </div>
          <span className="text-slate-900 font-black text-xl tracking-tight">SellBodr</span>
          <span className="text-slate-500 text-xs">Cross-Border eCommerce Intelligence</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="w-full max-w-[420px]">

          <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-200"
            style={{ boxShadow: '0 4px 6px -1px rgba(15,23,42,0.04), 0 16px 40px -8px rgba(15,23,42,0.10)' }}>

            <div className="text-center mb-7">
              <h2 className="text-2xl font-black text-slate-900 mb-1">Welcome back</h2>
              <p className="text-slate-400 text-sm">Sign in to your SellBodr account</p>
            </div>

            {/* Google Sign-In */}
            <div className="mb-4">
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleBtnRef} className="w-full min-h-[44px] flex items-center justify-center"
                  style={{ opacity: gsiReady ? 1 : 0.5, transition: 'opacity 0.3s' }} />
              ) : (
                <button type="button" onClick={triggerGoogleSignIn} disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 font-semibold text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                  {googleLoading
                    ? <Spinner className="text-violet-500" />
                    : <GoogleIcon />}
                  {googleLoading ? 'Signing in…' : 'Continue with Google'}
                </button>
              )}
            </div>

            {/* Fingerprint */}
            {canFingerprint && (
              <motion.button type="button" onClick={loginWithFingerprint}
                disabled={fpLoading || loading || googleLoading}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full mb-4 py-3 rounded-xl flex items-center justify-center gap-2.5 text-sm font-semibold text-slate-600 hover:text-violet-700 transition-all border border-slate-200 hover:border-violet-300 hover:bg-violet-50 bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                {fpLoading ? <Spinner className="text-violet-500" /> : <FingerprintIcon className="w-5 h-5 text-violet-500" />}
                {fpLoading ? 'Scanning…' : 'Use fingerprint / Face ID'}
              </motion.button>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-slate-400 text-xs font-medium whitespace-nowrap">or sign in with email</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Email + Password */}
            <form onSubmit={submitPassword} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email" inputMode="email" placeholder="you@example.com"
                  className="input-dark" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
                  <a href="#" className="text-xs text-violet-600 hover:text-violet-700 transition-colors font-medium">
                    Forgot?
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
                className="btn-primary w-full text-base py-3.5 min-h-0 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading
                  ? <span className="flex items-center gap-2 justify-center"><Spinner className="text-white/80" /> Signing in…</span>
                  : 'Sign in →'}
              </motion.button>
            </form>

            <p className="text-center text-slate-400 text-sm mt-6">
              No account?{' '}
              <Link href="/register" className="text-violet-600 hover:text-violet-700 font-bold transition-colors">
                Start free →
              </Link>
            </p>

            {/* PWA install CTA — always visible when not already installed */}
            {!isInstalled && <InstallCTA installPrompt={installPrompt} isIOS={isIOS} onInstall={handleInstall} />}
          </div>

          {/* Trust row */}
          <div className="flex items-center justify-center gap-5 mt-5 flex-wrap">
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
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/privacy" className="text-slate-400 text-xs hover:text-slate-600 transition-colors">Privacy</Link>
            <span className="text-slate-200">·</span>
            <Link href="/terms" className="text-slate-400 text-xs hover:text-slate-600 transition-colors">Terms</Link>
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

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

function ScoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
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
