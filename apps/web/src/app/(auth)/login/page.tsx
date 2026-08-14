'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api, saveAuth } from '@/lib/api';
import { ParticleCanvas } from '@/components/ui/ParticleCanvas';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  async function submit(e: FormEvent) {
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

  return (
    <div className="min-h-screen bg-[#020817] flex">

      {/* ── Left panel — value proposition ─────────────────── */}
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

      {/* ── Right panel — form ───────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#020817] via-violet-950/10 to-[#020817] lg:hidden" />

        {/* Mobile logo */}
        <div className="lg:hidden relative z-10 mb-8 flex items-center gap-2.5">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-8 h-8 rounded-lg shadow shadow-violet-500/30" />
          <span className="text-white font-bold text-lg">SellBodr</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white mb-2">Welcome back</h2>
            <p className="text-white/40 text-sm">Sign in to your SellBodr account</p>
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
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

            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="btn-primary w-full text-base py-4 min-h-0 shadow-xl shadow-violet-500/30 mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full block" />
                  Signing in...
                </span>
              ) : 'Sign in →'}
            </motion.button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-white/25 text-xs">OR</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <button className="btn-secondary w-full text-sm py-3 min-h-0 gap-3">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-white/35 text-sm mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Start free →
            </Link>
          </p>

          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
            {['🔒 256-bit SSL', '🛡️ SOC2 ready', '🌍 99.9% uptime'].map(b => (
              <span key={b} className="text-white/20 text-xs">{b}</span>
            ))}
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
