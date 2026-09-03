'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api, saveAuth } from '@/lib/api';

const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    price: '$0',
    desc: 'Start scouting — no credit card needed',
    features: ['Up to 5 AI product scans', 'Top 10 results per scan', 'Full 7-dimension Opportunity Score', 'Supplier list + profit calculator', 'Save unlimited products to wishlist'],
    highlight: false,
    startLabel: 'Start for Free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9/mo',
    desc: 'Unlimited intelligence. Unlimited scans. Real profits.',
    features: ['Unlimited AI product scans', 'All results — no caps', 'Complete India supplier map & database', 'Full profitability waterfall model', 'Advanced market research & keyword tools', 'Unlimited wishlist & CSV export', 'Priority support'],
    highlight: true,
    startLabel: 'Start Pro',
  },
];

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('bs_access_token')) router.replace('/opportunities');
  }, [router]);

  const [step, setStep]       = useState<'plan' | 'form'>('plan');
  const [plan, setPlan]       = useState('free');
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => { setForm(f => ({ ...f, [field]: e.target.value })); setError(''); };
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.auth.register(form.name, form.email, form.password) as any;
      saveAuth(res);
      router.push('/opportunities');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <img src="/icons/icon.svg" alt="SellBodr" className="w-9 h-9"
          style={{ filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.5))' }} />
        <span className="text-slate-900 font-bold text-xl">SellBodr</span>
      </Link>

      <div className="w-full max-w-3xl">

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {['Choose plan', 'Create account'].map((label, i) => {
            const stepIdx = ['plan', 'form'].indexOf(step);
            const isActive = stepIdx === i;
            const isDone   = stepIdx > i;
            return (
              <div key={label} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-slate-900' : isDone ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    isActive ? 'bg-violet-600 border-violet-600 text-white'
                    : isDone  ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:block">{label}</span>
                </div>
                {i < 1 && <div className="w-10 h-px bg-slate-300" />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">

          {/* Step 1 — Pick a plan */}
          {step === 'plan' && (
            <motion.div key="plan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Create your account</h2>
                <p className="text-slate-500 text-sm">Free forever · Upgrade to Pro anytime · No credit card required to start</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-5 mb-6">
                {PLANS.map(p => (
                  <motion.button
                    key={p.id} onClick={() => setPlan(p.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`relative bg-white rounded-2xl p-6 text-left transition-all duration-200 border-2 shadow-sm ${
                      plan === p.id
                        ? p.highlight ? 'border-violet-500 shadow-violet-100' : 'border-emerald-400 shadow-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}>
                    {p.id === 'free' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm">
                        START HERE
                      </div>
                    )}
                    {p.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm">
                        MOST POPULAR
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{p.name}</div>
                        <div className="text-2xl font-black text-slate-900 mt-1">{p.price}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${
                        plan === p.id ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
                      }`}>
                        {plan === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-slate-500 text-xs mb-3">{p.desc}</p>
                    <ul className="space-y-1.5">
                      {p.features.map(f => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="text-emerald-500 text-sm font-bold">✓</span>{f}
                        </li>
                      ))}
                    </ul>
                  </motion.button>
                ))}
              </div>
              <motion.button onClick={() => setStep('form')} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="btn-primary w-full text-base py-4 min-h-0">
                {PLANS.find(p2 => p2.id === plan)?.startLabel ?? 'Continue'} →
              </motion.button>
              <p className="text-center text-slate-400 text-xs mt-4">
                {plan === 'free' ? 'Free forever — upgrade to Pro anytime.' : 'Cancel Pro anytime. No setup fee.'}
              </p>
            </motion.div>
          )}

          {/* Step 2 — Account details */}
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Create your account</h2>
                <p className="text-slate-500 text-sm">
                  {PLANS.find(p2 => p2.id === plan)?.name} plan ·{' '}
                  <button onClick={() => setStep('plan')} className="text-violet-600 hover:text-violet-700 transition-colors font-medium">
                    Change plan
                  </button>
                </p>
              </div>

              <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-xl shadow-slate-200/80 border border-slate-200">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Full name</label>
                    <input type="text" value={form.name} onChange={setField('name')} required autoComplete="name" placeholder="Jane Smith" className="input-dark" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Email address</label>
                    <input type="email" value={form.email} onChange={setField('email')} required autoComplete="email" inputMode="email" placeholder="you@example.com" className="input-dark" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={form.password} onChange={setField('password')} required autoComplete="new-password" minLength={8} placeholder="Min 8 characters" className="input-dark pr-12" />
                      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors text-sm select-none">
                        {showPw ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Confirm password</label>
                    <input type="password" value={form.confirm} onChange={setField('confirm')} required autoComplete="new-password" placeholder="Repeat password" className="input-dark" />
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                      {error}
                    </motion.div>
                  )}

                  <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="btn-primary w-full text-base py-4 min-h-0 disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full block" />
                        Creating account…
                      </span>
                    ) : 'Create account →'}
                  </motion.button>
                </form>
              </div>

              <p className="text-center text-slate-500 text-sm mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-violet-600 hover:text-violet-700 font-semibold transition-colors">Sign in →</Link>
              </p>
              <p className="text-center text-slate-400 text-xs mt-3">
                By creating an account you agree to our{' '}
                <Link href="/terms" className="text-slate-500 hover:text-slate-700 transition-colors">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-slate-500 hover:text-slate-700 transition-colors">Privacy Policy</Link>
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
