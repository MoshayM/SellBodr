'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api, saveAuth } from '@/lib/api';
import { ParticleCanvas } from '@/components/ui/ParticleCanvas';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [showPw, setShowPw]         = useState(false);

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.auth.login(email, password) as any;
      saveAuth(res);
      router.push('/opportunities');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
    } finally { setLoading(false); }
  }

  async function loginWithPasskey() {
    setError(''); setPasskeyLoading(true);
    try {
      const beginData = await api.passkeys.loginBegin(email || undefined);
      const { challengeId, ...options } = beginData;

      const { startAuthentication } = await import('@simplewebauthn/browser');
      const assnResp = await startAuthentication(options);

      const auth = await api.passkeys.loginComplete(challengeId, assnResp) as any;
      saveAuth(auth);
      router.push('/opportunities');
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setError('Passkey prompt was cancelled or timed out. Please try again.');
      } else {
        setError(err?.message || 'Passkey login failed. Try password instead.');
      }
    } finally { setPasskeyLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#020817] flex">

      {/* ── Left panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] relative overflow-hidden p-12 xl:p-16">
        <ParticleCanvas className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/70 via-indigo-950/50 to-[#020817]" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-0 w-60 h-60 bg-cyan-600/15 rounded-full blur-3xl" />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-9 h-9 rounded-xl shadow-lg shadow-violet-500/40" />
          <span className="text-white font-bold text-xl">SellBodr</span>
        </motion.div>

        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
            <div className="text-5xl mb-6">🌏</div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-5">
              Your next<br />
              <span className="text-gradient">winning product</span><br />
              is waiting.
            </h1>
            <p className="text-white/45 text-lg leading-relaxed max-w-md">
              AI scouts 10,000+ India-sourced products, scores each one across 7 dimensions, and gives you a Launch / Hold / Reject decision with supplier contacts ready.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-10 grid grid-cols-3 gap-4">
            {[{ val: '91', label: 'Avg score top picks' }, { val: '76', label: 'Marketplaces' }, { val: '48h', label: 'To first listing' }].map(s => (
              <div key={s.label} className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-gradient mb-1">{s.val}</div>
                <div className="text-white/35 text-xs leading-snug">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="relative z-10 glass rounded-xl p-5">
          <p className="text-white/50 text-sm italic leading-relaxed">"Found a $22 net-margin product in 30 minutes. Used to take weeks of research."</p>
          <p className="text-white/30 text-xs mt-2">— Rahul M., Amazon US seller</p>
        </motion.div>
      </div>

      {/* ── Right panel ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#020817] via-violet-950/10 to-[#020817] lg:hidden" />

        <div className="lg:hidden relative z-10 mb-8 flex items-center gap-2.5">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-8 h-8 rounded-lg shadow shadow-violet-500/30" />
          <span className="text-white font-bold text-lg">SellBodr</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white mb-2">Welcome back</h2>
            <p className="text-white/40 text-sm">Sign in to your SellBodr account</p>
          </div>

          {/* Passkey button */}
          <motion.button
            onClick={loginWithPasskey}
            disabled={passkeyLoading || loading}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="btn-primary w-full text-base py-4 min-h-0 shadow-xl shadow-violet-500/30 mb-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3">
            {passkeyLoading ? (
              <>
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full block shrink-0" />
                Waiting for passkey…
              </>
            ) : (
              <>
                <FingerprintIcon className="w-5 h-5 shrink-0" />
                Sign in with Passkey
              </>
            )}
          </motion.button>
          <p className="text-center text-white/25 text-xs mb-6">
            Fingerprint, Face ID, PIN or security key
          </p>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-white/25 text-xs">OR USE PASSWORD</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <form onSubmit={submitPassword} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" inputMode="email" placeholder="you@example.com"
                className="input-dark"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Password</label>
                <a href="#" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password" placeholder="••••••••"
                  className="input-dark pr-12"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-sm select-none">
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </motion.div>
            )}

            <motion.button type="submit" disabled={loading || passkeyLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="btn-secondary w-full text-base py-3.5 min-h-0 mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full block" />
                  Signing in...
                </span>
              ) : 'Sign in with Password →'}
            </motion.button>
          </form>

          <p className="text-center text-white/35 text-sm mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Start free →
            </Link>
          </p>

          <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
            {['🔒 256-bit SSL', '🛡️ SOC2 ready', '🌍 99.9% uptime'].map(b => (
              <span key={b} className="text-white/20 text-xs">{b}</span>
            ))}
          </div>

          <div className="mt-5 p-3 rounded-xl bg-white/[0.03] border border-white/8 flex items-center gap-3">
            <img src="/icons/icon.svg" alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white/60 leading-snug">Install SellBodr</div>
              <div className="text-[10px] text-white/30 leading-snug mt-0.5">
                Android: tap <span className="text-white/50">⋮ → Add to Home Screen</span> &nbsp;·&nbsp;
                iOS: tap <span className="text-white/50">Share → Add to Home Screen</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <Link href="/privacy" className="text-white/20 text-xs hover:text-white/40 transition-colors">Privacy Policy</Link>
            <span className="text-white/10 text-xs">·</span>
            <Link href="/terms" className="text-white/20 text-xs hover:text-white/40 transition-colors">Terms of Service</Link>
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
