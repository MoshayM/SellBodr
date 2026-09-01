'use client';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api, saveAuth } from '@/lib/api';

const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    price: '$0',
    desc: 'Explore the platform with no commitment',
    features: ['3 AI product scans per month', 'Opportunity Score preview', 'Top 5 results per scan', 'Basic profit indicator', 'Wishlist — save up to 10 products'],
    highlight: false,
    startLabel: 'Start for Free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9/mo',
    desc: 'Full AI intelligence. Unlimited scans. Real profits.',
    features: ['Unlimited AI product scans', 'Full 7-dimension Opportunity Score', 'Complete India supplier database', 'AI listing generator (title, bullets, keywords)', 'Landed-cost profit model with full P&L', 'Unlimited wishlist & CSV export', 'Priority support'],
    highlight: true,
    startLabel: 'Start Pro',
  },
];

function PinInput({ label, onComplete, disabled, resetKey }: {
  label: string;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  resetKey?: number;
}) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    setDigits(['', '', '', '']);
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
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider text-center">{label}</label>
      <div className="flex gap-3 justify-center">
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
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('bs_access_token')) router.replace('/opportunities');
  }, [router]);

  const [step, setStep]       = useState<'plan' | 'form' | 'pin'>('plan');
  const [plan, setPlan]       = useState('free');
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw]   = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [pin, setPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinResetKey, setPinResetKey] = useState(0);
  const [confirmResetKey, setConfirmResetKey] = useState(0);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState('');

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
      setTempToken(res.accessToken);
      if (usePassword) { saveAuth(res); router.push('/opportunities'); return; }
      setStep('pin');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  }

  async function handlePinSubmit() {
    if (!pin || pin.length !== 4) { setError('Please enter a 4-digit PIN'); return; }
    if (pin !== confirmPin) {
      setError('PINs do not match — please try again');
      setPin(''); setConfirmPin('');
      setPinResetKey(k => k + 1); setConfirmResetKey(k => k + 1);
      return;
    }
    setError(''); setLoading(true);
    try {
      const prevToken = localStorage.getItem('bs_access_token');
      localStorage.setItem('bs_access_token', tempToken);
      await api.pin.set(pin);
      if (prevToken === null) localStorage.removeItem('bs_access_token');
      else localStorage.setItem('bs_access_token', prevToken);
      const res = await api.pin.login(form.email, pin) as any;
      saveAuth(res); router.push('/opportunities');
    } catch (err: any) {
      setError(err?.message || 'Failed to set PIN. You can set it later in Settings → Security.');
      const res = await api.auth.login(form.email, form.password).catch(() => null) as any;
      if (res) { saveAuth(res); router.push('/opportunities'); }
    } finally { setLoading(false); }
  }

  function skipPin() {
    api.auth.login(form.email, form.password).then((res: any) => {
      saveAuth(res); router.push('/opportunities');
    }).catch(() => router.push('/login'));
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
          {['Choose plan', 'Create account', 'Set PIN'].map((label, i) => {
            const stepIdx = ['plan', 'form', 'pin'].indexOf(step);
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
                {i < 2 && <div className="w-10 h-px bg-slate-300" />}
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

                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" id="skipPin" checked={usePassword} onChange={e => setUsePassword(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 accent-violet-500" />
                    <label htmlFor="skipPin" className="text-xs text-slate-500 cursor-pointer select-none">
                      Password only — I&apos;ll set a PIN later in Settings
                    </label>
                  </div>

                  <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="btn-primary w-full text-base py-4 min-h-0 disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full block" />
                        Creating account…
                      </span>
                    ) : (usePassword ? 'Create account →' : 'Continue → Set fast login PIN')}
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

          {/* Step 3 — Set PIN */}
          {step === 'pin' && (
            <motion.div key="pin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-sm mx-auto text-center">
              <div className="text-4xl mb-4">🔑</div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Set your login PIN</h2>
              <p className="text-slate-500 text-sm mb-8">
                Choose a 4-digit PIN for fast login on any device.{' '}
                You can also use your fingerprint on mobile &amp; Mac.
              </p>

              <div className="bg-white rounded-2xl p-6 space-y-6 shadow-xl shadow-slate-200/80 border border-slate-200">
                <PinInput label="Choose a 4-digit PIN" onComplete={setPin} disabled={loading} resetKey={pinResetKey} />
                <PinInput label="Confirm PIN" onComplete={setConfirmPin} disabled={loading} resetKey={confirmResetKey} />

                {error && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                    {error}
                  </motion.div>
                )}

                <motion.button
                  onClick={handlePinSubmit}
                  disabled={loading || pin.length < 4 || confirmPin.length < 4}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="btn-primary w-full text-base py-4 min-h-0 disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full block" />
                      Saving PIN…
                    </span>
                  ) : 'Save PIN & Enter SellBodr →'}
                </motion.button>
              </div>

              <button type="button" onClick={skipPin}
                className="mt-5 text-sm text-slate-400 hover:text-slate-600 transition-colors font-medium">
                Skip for now — use password to sign in
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
