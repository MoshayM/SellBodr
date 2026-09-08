'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Something went wrong'); return; }
      setSent(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#F4F6FB' }}>

      {/* Logo */}
      <Link href="/" className="flex flex-col items-center gap-2 mb-8 group">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #0D1B35, #162240)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <img src="/icons/icon.svg" alt="SellBodr" className="w-7 h-7"
            style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.8)) brightness(1.2)' }} />
        </div>
        <span className="text-slate-900 font-black text-lg tracking-tight">SellBodr</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl border border-slate-200/80"
          style={{ boxShadow: '0 4px 6px -1px rgba(15,23,42,0.05), 0 20px 48px -8px rgba(15,23,42,0.13)' }}>

          {sent ? (
            <>
              {/* Success — body */}
              <div className="px-8 py-10 sm:px-10 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-[1.4rem] font-black text-slate-900 leading-tight mb-3">Check your email</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  If <span className="font-semibold text-slate-700">{email}</span> is registered, you&apos;ll receive a reset link shortly. Check your spam folder if it doesn&apos;t arrive.
                </p>
              </div>
              {/* Success — footer */}
              <div className="px-8 py-5 sm:px-10 border-t border-slate-100 text-center rounded-b-3xl bg-slate-50/60">
                <Link href="/login" className="text-sm font-bold text-violet-600 hover:text-violet-700 transition-colors">
                  ← Back to login
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Card header */}
              <div className="px-8 pt-9 pb-7 sm:px-10 sm:pt-10 sm:pb-8 text-center border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <h2 className="text-[1.4rem] font-black text-slate-900 leading-tight mb-2">Forgot password?</h2>
                <p className="text-slate-400 text-[13.5px] leading-relaxed">Enter your email and we&apos;ll send you a reset link.</p>
              </div>

              {/* Card body */}
              <div className="px-8 py-8 sm:px-10 sm:py-9">
                {error && (
                  <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center font-medium">{error}</div>
                )}
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Email</label>
                    <input
                      type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                      required autoFocus autoComplete="email" placeholder="you@example.com"
                      className="input-dark"
                    />
                  </div>
                  <button
                    type="submit" disabled={loading || !email}
                    className="btn-primary w-full text-base py-3.5 min-h-0 disabled:opacity-50">
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
              </div>

              {/* Card footer */}
              <div className="px-8 py-5 sm:px-10 border-t border-slate-100 text-center rounded-b-3xl bg-slate-50/60">
                <Link href="/login" className="text-sm font-bold text-violet-600 hover:text-violet-700 transition-colors">
                  ← Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
