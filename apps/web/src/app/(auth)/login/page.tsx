'use client';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api, saveAuth } from '@/lib/api';

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

function PinInput({ onComplete, disabled, resetKey }: {
  onComplete: (pin: string) => void;
  disabled?: boolean;
  resetKey?: number;
}) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    setDigits(['', '', '', '']);
    refs[0].current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  function handle(i: number, val: string) {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 3) refs[i + 1].current?.focus();
    if (next.every(v => v !== '')) onComplete(next.join(''));
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
  }

  return (
    <div className="flex gap-3 justify-center my-2">
      {digits.map((d, i) => (
        <input
          key={i} ref={refs[i]}
          type="password" inputMode="numeric" pattern="\d" maxLength={1}
          value={d} disabled={disabled}
          onChange={e => handle(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-14 h-14 text-center text-2xl font-black rounded-xl border-2 transition-all outline-none
            bg-white text-slate-900 border-slate-200
            focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]
            disabled:opacity-40 disabled:cursor-not-allowed"
          autoComplete="off"
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [mode, setMode]         = useState<'pin' | 'password'>('pin');
  const [canFingerprint, setCanFingerprint] = useState(false);
  const [pinResetKey, setPinResetKey] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS]       = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('bs_access_token')) router.replace('/opportunities');
  }, [router]);

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

  useEffect(() => { detectFingerprint().then(setCanFingerprint); }, []);

  async function loginWithPin(pin: string) {
    if (!email.trim()) { setError('Enter your email first'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.pin.login(email.trim(), pin) as any;
      saveAuth(res); router.push('/opportunities');
    } catch (err: any) {
      setError(err?.message || 'Wrong PIN. Please try again.');
      setPinResetKey(k => k + 1);
    } finally { setLoading(false); }
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
      if (err?.name === 'NotAllowedError') {
        setError('Fingerprint scan cancelled. Enter your PIN instead.');
      } else {
        setError(err?.message || 'Fingerprint login failed. Use your PIN.');
      }
    } finally { setFpLoading(false); }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
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

      {/* ── Left brand panel (large screens) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] relative overflow-hidden p-12 xl:p-16"
        style={{ background: 'linear-gradient(145deg, #6d28d9 0%, #7c3aed 35%, #4f46e5 70%, #3730a3 100%)' }}>

        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #67e8f9, transparent)', transform: 'translate(-30%, 30%)' }} />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-9 h-9"
            style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.5))' }} />
          <span className="text-white font-bold text-xl tracking-tight">SellBodr</span>
        </motion.div>

        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
            <div className="text-5xl mb-6">🌏</div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-5">
              Your next<br />
              <span style={{ color: '#c4b5fd' }}>winning product</span><br />
              is waiting.
            </h1>
            <p className="text-violet-100 text-lg leading-relaxed max-w-md opacity-90">
              AI scouts India-sourced products, scores each one across 7 dimensions, and gives you a Launch / Hold / Reject decision with supplier contacts ready.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="mt-10 grid grid-cols-3 gap-3">
            {[{ val: '76+', label: 'Marketplaces' }, { val: '19', label: 'Countries' }, { val: '< 60s', label: 'Scan to verdict' }].map(s => (
              <div key={s.label} className="rounded-2xl p-4 text-center"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div className="text-2xl font-black text-white mb-1">{s.val}</div>
                <div className="text-violet-200 text-xs leading-snug">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="relative z-10 rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <p className="text-violet-100 text-sm leading-relaxed italic">
            &ldquo;Found a ₹380 product sourcing in Jaipur, listed it on Amazon US for $28. Margin after fees: 61%.&rdquo;
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <p className="text-violet-200 text-xs font-medium">Real seller result · Verified via SellBodr</p>
          </div>
        </motion.div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-50">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-2.5">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-8 h-8"
            style={{ filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.5))' }} />
          <span className="text-slate-900 font-bold text-lg">SellBodr</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md">

          {/* Form card */}
          <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/80 border border-slate-200">

            {/* Top accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(124,58,237,0.4),transparent)' }} />

            <div className="text-center mb-7">
              <h2 className="text-2xl font-black text-slate-900 mb-1.5">Welcome back</h2>
              <p className="text-slate-500 text-sm">Sign in to your SellBodr account</p>
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                Email address
              </label>
              <input
                type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                autoComplete="email" inputMode="email" placeholder="you@example.com"
                className="input-dark"
              />
            </div>

            <AnimatePresence mode="wait">
              {mode === 'pin' ? (
                <motion.div key="pin-mode" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

                  {canFingerprint && (
                    <motion.button type="button" onClick={loginWithFingerprint}
                      disabled={fpLoading || loading}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="w-full mb-4 py-3 rounded-xl flex items-center justify-center gap-2.5 text-sm font-semibold text-slate-600 hover:text-violet-700 transition-all border border-slate-200 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      {fpLoading ? (
                        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full block" />
                      ) : <FingerprintIcon className="w-5 h-5 text-violet-500" />}
                      {fpLoading ? 'Scanning…' : 'Use fingerprint'}
                    </motion.button>
                  )}

                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {canFingerprint ? 'Or enter your 4-digit PIN' : 'Enter your 4-digit PIN'}
                    </label>
                    <button type="button" onClick={() => { setMode('password'); setError(''); }}
                      className="text-xs text-violet-600 hover:text-violet-700 transition-colors font-medium">
                      Forgot PIN?
                    </button>
                  </div>

                  <PinInput onComplete={loginWithPin} disabled={loading} resetKey={pinResetKey} />

                  {loading && (
                    <div className="flex items-center justify-center gap-2 mt-3 text-slate-500 text-sm">
                      <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full block" />
                      Verifying…
                    </div>
                  )}

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm text-center">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex items-center gap-4 my-5">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-slate-400 text-xs">OR</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <button type="button" onClick={() => { setMode('password'); setError(''); }}
                    className="w-full text-center text-sm text-slate-500 hover:text-slate-700 transition-colors py-2 rounded-xl hover:bg-slate-50 font-medium">
                    Use password instead →
                  </button>
                </motion.div>
              ) : (
                <motion.div key="pw-mode" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <form onSubmit={submitPassword} className="space-y-4" noValidate>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
                        <a href="#" className="text-xs text-violet-600 hover:text-violet-700 transition-colors font-medium">
                          Forgot password?
                        </a>
                      </div>
                      <div className="relative">
                        <input
                          type={showPw ? 'text' : 'password'} value={password}
                          onChange={e => setPassword(e.target.value)}
                          autoComplete="current-password" placeholder="••••••••"
                          className="input-dark pr-12"
                        />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors text-sm select-none">
                          {showPw ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                        {error}
                      </motion.div>
                    )}

                    <motion.button type="submit" disabled={loading}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="btn-primary w-full text-base py-3.5 min-h-0 disabled:opacity-60 disabled:cursor-not-allowed">
                      {loading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full block" />
                          Signing in…
                        </span>
                      ) : 'Sign in →'}
                    </motion.button>
                  </form>

                  <button type="button" onClick={() => { setMode('pin'); setError(''); setPinResetKey(k => k + 1); }}
                    className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors mt-4 font-medium">
                    ← Use PIN instead
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-center text-slate-500 text-sm mt-7">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-violet-600 hover:text-violet-700 font-semibold transition-colors">
                Start free →
              </Link>
            </p>

            {!isInstalled && (
              installPrompt ? (
                <motion.button onClick={handleInstall} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="mt-5 w-full p-3.5 rounded-2xl flex items-center gap-3 text-left touch-manipulation border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors">
                  <div className="relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-violet-100 border border-violet-200">
                    <img src="/icons/icon.svg" alt="" className="w-7 h-7"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(124,58,237,0.5))' }} />
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-500 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-violet-900 leading-snug">Install SellBodr App</div>
                    <div className="text-[11px] text-violet-600 leading-snug mt-0.5">Works offline · Loads instantly · No app store needed</div>
                  </div>
                  <motion.span animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                    className="text-violet-500 text-base shrink-0">↓</motion.span>
                </motion.button>
              ) : isIOS ? (
                <div className="mt-5 p-3.5 rounded-2xl flex items-center gap-3 bg-slate-50 border border-slate-200">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-violet-50 border border-violet-100">
                    <img src="/icons/icon.svg" alt="" className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-700 leading-snug">Add to iPhone / iPad</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      In Safari: tap <span className="text-slate-700 font-medium">Share ↑</span> → <span className="text-slate-700 font-medium">Add to Home Screen</span>
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
            {[{ icon: '🔒', text: '256-bit SSL' }, { icon: '🛡️', text: 'SOC2 ready' }, { icon: '🌍', text: '99.9% uptime' }].map(b => (
              <span key={b.text} className="flex items-center gap-1.5 text-slate-400 text-xs">
                <span>{b.icon}</span>{b.text}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/privacy" className="text-slate-400 text-xs hover:text-slate-600 transition-colors">Privacy Policy</Link>
            <span className="text-slate-300 text-xs">·</span>
            <Link href="/terms" className="text-slate-400 text-xs hover:text-slate-600 transition-colors">Terms of Service</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FingerprintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 17c1 0 1.5-.5 2-1s1-1 2-1 1.5.5 2 1 1 1 2 1 1.5-.5 2-1 1-1 2-1" />
      <path d="M20 11c0 2-1.5 6.5-3 8" />
      <path d="M6 11a6 6 0 0 1 12 0c0 1.5 0 3-.5 5" />
    </svg>
  );
}
