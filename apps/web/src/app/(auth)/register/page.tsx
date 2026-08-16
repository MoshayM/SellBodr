'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api, saveAuth } from '@/lib/api';

const PLANS = [
  { id: 'pro', name: 'Pro', price: '$49/mo', desc: 'Unlimited AI power', features: ['Unlimited AI searches', 'Supplier sourcing', 'AI listing builder', 'Full 7-dimension scores', 'Priority support'], color: 'border-violet-500/60', highlight: true },
  { id: 'enterprise', name: 'Organisation', price: 'Custom', desc: 'For agencies & teams', features: ['Everything in Pro', 'Multi-seat access', 'API access', 'White-label reports', 'Dedicated manager', 'SLA guarantee'], color: 'border-cyan-500/30' },
];

export default function RegisterPage() {
  const router = useRouter();

  // Already logged in → skip register page
  useEffect(() => {
    if (localStorage.getItem('bs_access_token')) router.replace('/opportunities');
  }, [router]);

  const [step, setStep]           = useState<'plan' | 'form'>('plan');
  const [plan, setPlan]           = useState('pro'); // default to Pro since no free tier registration
  const [form, setForm]           = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw]       = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => { setForm(f => ({ ...f, [field]: e.target.value })); setError(''); };
  }

  async function registerWithPasskey(platformOnly = true) {
    if (!form.name.trim()) { setError('Please enter your name'); return; }
    if (!form.email.trim()) { setError('Please enter your email'); return; }
    setError(''); setPasskeyLoading(true);
    try {
      const beginData = await api.passkeys.registerBegin(form.email.trim(), form.name.trim());
      const { challengeId, ...options } = beginData;

      const { startRegistration } = await import('@simplewebauthn/browser');
      // Platform-only: forces Windows Hello PIN/fingerprint or Touch ID — no USB prompt
      const finalOptions = platformOnly ? {
        ...options,
        authenticatorSelection: {
          ...(options.authenticatorSelection ?? {}),
          authenticatorAttachment: 'platform' as const,
        },
      } : options;
      const attResp = await startRegistration(finalOptions);

      const auth = await api.passkeys.registerComplete(
        challengeId,
        form.name.trim(),
        attResp,
        `${form.name.trim()}'s Organisation`,
      ) as any;
      saveAuth(auth);
      router.push('/opportunities');
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setError('Passkey setup was cancelled. You can use a password instead.');
      } else {
        setError(err?.message || 'Passkey setup failed. Please try again or use a password.');
      }
    } finally { setPasskeyLoading(false); }
  }

  async function registerWithPassword(e: FormEvent) {
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
    <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />

      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <img src="/icons/icon.svg" alt="SellBodr" className="w-9 h-9"
          style={{ filter: 'drop-shadow(0 0 10px rgba(124,58,237,0.85)) drop-shadow(0 0 4px rgba(219,39,119,0.5))' }} />
        <span className="text-white font-bold text-xl">SellBodr</span>
      </Link>

      <div className="w-full max-w-3xl">

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {['Choose plan', 'Create account'].map((label, i) => {
            const isActive = (i === 0 && step === 'plan') || (i === 1 && step === 'form');
            const isDone   = i === 0 && step === 'form';
            return (
              <div key={label} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive ? 'text-white' : isDone ? 'text-emerald-400' : 'text-white/30'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                    isActive ? 'bg-violet-600 border-violet-600 text-white' : isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-transparent border-white/20 text-white/30'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:block">{label}</span>
                </div>
                {i < 1 && <div className="w-12 h-px bg-white/15" />}
              </div>
            );
          })}
        </div>

        {/* Step 1 — Pick a plan */}
        {step === 'plan' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white mb-2">Choose your plan</h2>
              <p className="text-white/40 text-sm">Start free, upgrade anytime. No credit card for Starter.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {PLANS.map(p => (
                <motion.button
                  key={p.id} onClick={() => setPlan(p.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className={`relative glass-card rounded-2xl p-5 text-left transition-all duration-200 border-2 ${
                    plan === p.id ? (p.highlight ? 'border-violet-500 shadow-lg shadow-violet-500/25' : 'border-violet-400/60') : p.color
                  }`}>
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      POPULAR
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-xs font-semibold text-white/40 uppercase tracking-widest">{p.name}</div>
                      <div className="text-2xl font-black text-white mt-1">{p.price}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${plan === p.id ? 'border-violet-500 bg-violet-500' : 'border-white/20'}`}>
                      {plan === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-white/40 text-xs mb-3">{p.desc}</p>
                  <ul className="space-y-1.5">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-white/55">
                        <span className="text-emerald-400 text-sm">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                </motion.button>
              ))}
            </div>
            <motion.button onClick={() => setStep('form')} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="btn-primary w-full text-base py-4 min-h-0 shadow-xl shadow-violet-500/30">
              Continue with {PLANS.find(p2 => p2.id === plan)?.name} →
            </motion.button>
            <p className="text-center text-white/30 text-xs mt-4">Cancel Pro anytime. No credit card required to browse free.</p>
            <div className="mt-3 text-center">
              <Link href="/opportunities"
                className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/55 transition-colors group">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="M5 12h14M5 12l6 6M5 12l6-6"/></svg>
                Browse free without an account
              </Link>
            </div>
          </motion.div>
        )}

        {/* Step 2 — Account details */}
        {step === 'form' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white mb-2">Create your account</h2>
              <p className="text-white/40 text-sm">
                {PLANS.find(p2 => p2.id === plan)?.name} plan ·{' '}
                <button onClick={() => setStep('plan')} className="text-violet-400 hover:text-violet-300 transition-colors">Change plan</button>
              </p>
            </div>

            {/* Name + Email always shown */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Full name</label>
                <input type="text" value={form.name} onChange={setField('name')} required autoComplete="name" placeholder="Jane Smith" className="input-dark" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Email address</label>
                <input type="email" value={form.email} onChange={setField('email')} required autoComplete="email" inputMode="email" placeholder="you@example.com" className="input-dark" />
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </motion.div>
              )}

              {!usePassword ? (
                <>
                  {/* Primary: platform passkey (Windows Hello / Touch ID / PIN) */}
                  <motion.button
                    type="button"
                    onClick={() => registerWithPasskey(true)}
                    disabled={passkeyLoading || loading}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="btn-primary w-full text-base py-4 min-h-0 shadow-xl shadow-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                    {passkeyLoading ? (
                      <>
                        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full block shrink-0" />
                        Setting up passkey…
                      </>
                    ) : (
                      <>
                        <FingerprintIcon className="w-5 h-5 shrink-0" />
                        Create &amp; use passkey — PIN / fingerprint / face
                      </>
                    )}
                  </motion.button>
                  <p className="text-center text-white/25 text-xs -mt-1">
                    Works on laptops &amp; phones — uses your device PIN, fingerprint or face. No USB key needed.
                  </p>
                  <button type="button" onClick={() => { setUsePassword(true); setError(''); }}
                    className="w-full text-center text-sm text-white/30 hover:text-white/55 transition-colors">
                    Use a password instead →
                  </button>
                </>
              ) : (
                <form onSubmit={registerWithPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={form.password} onChange={setField('password')} required autoComplete="new-password" minLength={8} placeholder="Min 8 characters" className="input-dark pr-12" />
                      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-sm select-none">
                        {showPw ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Confirm password</label>
                    <input type="password" value={form.confirm} onChange={setField('confirm')} required autoComplete="new-password" placeholder="Repeat password" className="input-dark" />
                  </div>
                  <motion.button type="submit" disabled={loading || passkeyLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="btn-primary w-full text-base py-4 min-h-0 shadow-xl shadow-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full block" />
                        Creating account...
                      </span>
                    ) : 'Create account →'}
                  </motion.button>
                  <button type="button" onClick={() => { setUsePassword(false); setError(''); }}
                    className="w-full text-center text-sm text-white/35 hover:text-white/60 transition-colors">
                    ← Use passkey instead
                  </button>
                </form>
              )}

              <p className="text-center text-white/25 text-xs">
                By creating an account you agree to our{' '}
                <Link href="/terms" className="text-white/40 hover:text-white/60 transition-colors">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-white/40 hover:text-white/60 transition-colors">Privacy Policy</Link>
              </p>
            </div>

            <p className="text-center text-white/35 text-sm mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">Sign in →</Link>
            </p>
          </motion.div>
        )}
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
