'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, saveAuth } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.auth.register(form.name, form.email, form.password) as any;
      saveAuth(res);
      router.push('/opportunities');
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="bg-gradient-to-br from-green-700 to-green-900 text-white px-8 py-10 lg:flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-base">B</span>
          </div>
          <div>
            <div className="font-bold text-base">SellBodr</div>
            <div className="text-green-300 text-xs">Intelligence Platform</div>
          </div>
        </div>
        <div className="hidden lg:block">
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Start scouting opportunities<br />in minutes
          </h1>
          <p className="text-green-200 text-sm leading-relaxed max-w-sm">
            Create your account and immediately start analysing products, marketplaces, and suppliers with AI-powered intelligence.
          </p>
          <div className="flex flex-col gap-3 mt-8">
            {['Free during beta', 'No credit card required', 'Full AI pipeline access', 'Multi-marketplace coverage'].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-green-100">
                <span className="text-green-400">✓</span>{f}
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block text-xs text-green-400">
          &copy; {new Date().getFullYear()} SellBodr
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 lg:px-12 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create account</h2>
          <p className="text-sm text-gray-400 mb-7">Get started with SellBodr</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                type="text" value={form.name} onChange={set('name')}
                required autoComplete="name"
                placeholder="Jane Smith"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[48px]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Work email</label>
              <input
                type="email" value={form.email} onChange={set('email')}
                required autoComplete="email" inputMode="email"
                placeholder="you@company.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[48px]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password" value={form.password} onChange={set('password')}
                required autoComplete="new-password" minLength={8}
                placeholder="Min 8 characters"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[48px]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input
                type="password" value={form.confirm} onChange={set('confirm')}
                required autoComplete="new-password"
                placeholder="Repeat password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[48px]" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary disabled:opacity-60 min-h-[48px]">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-green-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
