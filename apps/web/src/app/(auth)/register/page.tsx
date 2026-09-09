'use client';
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api, saveAuth } from '@/lib/api';

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
  const [proPrice, setProPrice] = useState('19');

  useEffect(() => {
    fetch('/api/v1/platform/settings')
      .then(r => r.json())
      .then((s: any) => { if (s.pro_price_usd) setProPrice(String(s.pro_price_usd)); })
      .catch(() => {});
  }, []);

  const plans = useMemo(() => [
    {
      id: 'free', name: 'Starter', price: '$0',
      desc: 'Start scouting — no credit card needed',
      features: ['Up to 5 AI product scans (lifetime)', 'Up to 20 results per scan', 'Full 7-dimension Opportunity Score', 'Supplier list (up to 10 per product)', 'Save products to wishlist'],
      highlight: false, startLabel: 'Start for Free',
    },
    {
      id: 'pro', name: 'Pro', price: `$${proPrice}/mo`,
      desc: 'Unlimited scans. Premium AI. Full supplier intelligence.',
      features: ['Unlimited AI product scans', 'Up to 200 results per scan', 'Private searches — visible only to you (My Scans)', 'Premium AI — Claude + Groq + Mistral', 'Full supplier list, no cap', 'Real-time supplier search (IndiaMART, Alibaba & more)', 'Export to CSV, Excel, PDF & Word', 'All dashboard tools — Research, Profitability, Keywords', 'Priority support'],
      highlight: true, startLabel: 'Start Pro',
    },
  ], [proPrice]);

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#F4F6FB' }}>

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Link href="/" className="flex items-center gap-2.5 mb-10 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
            style={{ background: 'linear-gradient(135deg,#0D1B35,#162240)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <img src="/icons/icon.svg" alt="SellBodr" className="w-6 h-6"
              style={{ filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.8)) brightness(1.2)' }} />
          </div>
          <div>
            <div className="text-slate-900 font-black text-[15px] tracking-tight leading-none">SellBodr</div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400 leading-none mt-0.5">eCommerce Intelligence</div>
          </div>
        </Link>
      </motion.div>

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
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isActive ? 'text-white' : isDone ? 'text-white' : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                    style={isActive
                      ? { background: 'linear-gradient(135deg,#7C3AED,#6366F1)', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }
                      : isDone
                      ? { background: 'linear-gradient(135deg,#10B981,#059669)' }
                      : {}}>
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
              <div className="text-center mb-9">
                <h2 className="text-3xl font-black text-slate-900 leading-tight mb-3">Create your account</h2>
                <p className="text-slate-500 text-sm leading-relaxed">Free forever · Upgrade to Pro anytime · No credit card required to start</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-5 mb-7">
                {plans.map(p => (
                  <motion.button
                    key={p.id} onClick={() => setPlan(p.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`relative bg-white rounded-2xl p-6 pt-8 text-left transition-all duration-200 border-2 ${
                      plan === p.id
                        ? p.highlight ? 'border-violet-500 shadow-xl shadow-violet-100/80' : 'border-emerald-400 shadow-xl shadow-emerald-50'
                        : 'border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}>
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
                      style={{ background: plan === p.id
                        ? p.highlight ? 'linear-gradient(90deg,transparent,#7C3AED,transparent)' : 'linear-gradient(90deg,transparent,#10B981,transparent)'
                        : 'linear-gradient(90deg,transparent,#E2E8F0,transparent)' }} />
                    {p.id === 'free' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm"
                        style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
                        START HERE
                      </div>
                    )}
                    {p.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm"
                        style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)', boxShadow: '0 4px 10px rgba(99,102,241,0.4)' }}>
                        MOST POPULAR
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.name}</div>
                        <div className="text-2xl font-black text-slate-900 mt-1.5">{p.price}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${
                        plan === p.id ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
                      }`}>
                        {plan === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-slate-500 text-xs mb-4 leading-relaxed">{p.desc}</p>
                    <ul className="space-y-2">
                      {p.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-600 leading-snug">
                          <span className="text-emerald-500 text-sm font-bold flex-shrink-0 leading-none mt-[1px]">✓</span>{f}
                        </li>
                      ))}
                    </ul>
                  </motion.button>
                ))}
              </div>
              <motion.button onClick={() => setStep('form')} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="btn-primary w-full text-base py-4 min-h-0">
                {plans.find(p2 => p2.id === plan)?.startLabel ?? 'Continue'} →
              </motion.button>
              <p className="text-center text-slate-400 text-xs mt-4 leading-relaxed">
                {plan === 'free' ? 'Free forever — upgrade to Pro anytime.' : 'Cancel Pro anytime. No setup fee.'}
              </p>
            </motion.div>
          )}

          {/* Step 2 — Account details */}
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-md mx-auto">

              {/* ── Main card ── */}
              <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden relative"
                style={{ boxShadow: '0 4px 6px -1px rgba(15,23,42,0.05), 0 20px 48px -8px rgba(15,23,42,0.13)' }}>
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.5),transparent)' }} />

                {/* Card header */}
                <div className="px-8 pt-9 pb-7 sm:px-10 sm:pt-10 sm:pb-8 text-center border-b border-slate-100">
                  <h2 className="text-[1.6rem] font-black text-slate-900 leading-tight mb-2">Create your account</h2>
                  <p className="text-slate-500 text-[13.5px] leading-relaxed">
                    {plans.find(p2 => p2.id === plan)?.name} plan ·{' '}
                    <button onClick={() => setStep('plan')} className="text-violet-600 hover:text-violet-700 transition-colors font-semibold">
                      Change plan
                    </button>
                  </p>
                </div>

                {/* Card body */}
                <div className="px-8 py-8 sm:px-10 sm:py-9">
                  <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Full name</label>
                      <input type="text" value={form.name} onChange={setField('name')} required autoComplete="name" placeholder="Jane Smith" className="input-dark" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Email address</label>
                      <input type="email" value={form.email} onChange={setField('email')} required autoComplete="email" inputMode="email" placeholder="you@example.com" className="input-dark" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Password</label>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} value={form.password} onChange={setField('password')} required autoComplete="new-password" minLength={8} placeholder="Min 8 characters" className="input-dark pr-12" />
                        <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors text-sm select-none">
                          {showPw ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Confirm password</label>
                      <input type="password" value={form.confirm} onChange={setField('confirm')} required autoComplete="new-password" placeholder="Repeat password" className="input-dark" />
                    </div>

                    {error && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm text-center font-medium">
                        {error}
                      </motion.div>
                    )}

                    <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="btn-primary w-full text-base py-3.5 mt-1 min-h-0 disabled:opacity-60 disabled:cursor-not-allowed">
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

                {/* Card footer — sign in link */}
                <div className="px-8 py-5 sm:px-10 border-t border-slate-100 text-center rounded-b-3xl bg-slate-50/60">
                  <p className="text-slate-500 text-sm">
                    Already have an account?{' '}
                    <Link href="/login" className="text-violet-600 hover:text-violet-700 font-bold transition-colors">Sign in →</Link>
                  </p>
                </div>
              </div>

              {/* Terms — outside card */}
              <p className="text-center text-slate-400 text-xs mt-5 leading-relaxed">
                By creating an account you agree to our{' '}
                <Link href="/terms" className="text-slate-500 hover:text-slate-700 transition-colors font-medium">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-slate-500 hover:text-slate-700 transition-colors font-medium">Privacy Policy</Link>
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
