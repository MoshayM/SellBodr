'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, saveAuth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand panel — full width on mobile, half on desktop */}
      <div className="bg-gradient-to-br from-green-700 to-green-900 text-white px-8 py-10 lg:flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-base">B</span>
          </div>
          <div>
            <div className="font-bold text-base">BorderScout AI</div>
            <div className="text-green-300 text-xs">Intelligence Platform</div>
          </div>
        </div>
        <div className="hidden lg:block">
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Discover cross-border<br />opportunities with AI
          </h1>
          <p className="text-green-200 text-sm leading-relaxed max-w-sm">
            Analyse demand, competition, margins, and supplier feasibility across global marketplaces — all in one platform.
          </p>
          <div className="flex flex-col gap-3 mt-8">
            {['AI-powered product scoring', 'Landed-cost profit modelling', 'Global supplier sourcing', 'Automated listing optimisation'].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-green-100">
                <span className="text-green-400">✓</span>{f}
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block text-xs text-green-400">
          &copy; {new Date().getFullYear()} BorderScout AI
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 lg:px-12 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-400 mb-7">Welcome back — enter your credentials</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" inputMode="email"
                placeholder="you@company.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[48px]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[48px]" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary disabled:opacity-60 min-h-[48px]">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-green-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
