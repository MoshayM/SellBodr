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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg,#f8f6ff 0%,#f0f4ff 100%)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <img src="/icons/icon.svg" alt="SellBodr" className="w-8 h-8" />
            <span className="text-xl font-black" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SellBodr
            </span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8"
          style={{ boxShadow: '0 4px 24px rgba(99,102,241,0.08)' }}>

          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Check your email</h2>
              <p className="text-sm text-slate-500 mb-6">
                If <span className="font-semibold text-slate-700">{email}</span> is registered, you'll receive a reset link shortly. Check your spam folder if it doesn't arrive.
              </p>
              <Link href="/login" className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                ← Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-black text-slate-900 mb-1">Forgot password?</h2>
              <p className="text-sm text-slate-500 mb-6">Enter your email and we'll send you a reset link.</p>

              {error && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required autoFocus autoComplete="email" placeholder="you@example.com"
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  type="submit" disabled={loading || !email}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-5">
                <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700 transition-colors">← Back to login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
