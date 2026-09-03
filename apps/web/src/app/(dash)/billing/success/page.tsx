'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BillingSuccessPage() {
  const router = useRouter();
  useEffect(() => {
    // Auto-redirect after 5s
    const t = setTimeout(() => router.push('/opportunities'), 5000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-5">🎉</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Credits added!</h1>
        <p className="text-slate-600 mb-1">
          <span className="font-semibold text-indigo-600">10 report credits</span> have been added to your account.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Use them to generate AI Reports, Ad copy, and Brand Builder assets.
        </p>
        <Link href="/opportunities"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}>
          Start Exploring →
        </Link>
        <p className="text-xs text-slate-400 mt-4">Redirecting automatically in 5 seconds…</p>
      </div>
    </div>
  );
}
