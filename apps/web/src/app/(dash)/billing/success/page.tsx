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
    <div className="min-h-[80vh] flex items-center justify-center px-4" style={{ background: '#F4F6FB' }}>
      <div className="animate-card-in stagger-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center max-w-sm w-full"
        style={{ boxShadow: '0 4px 24px rgba(99,102,241,0.08)' }}>

        {/* Animated icon container */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
          <img src="/icons/icon.svg" alt="SellBodr" className="w-10 h-10" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>

        {/* Success badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mb-4"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Payment confirmed
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-2">Credits added!</h1>
        <p className="text-slate-500 mb-1">
          <span className="font-semibold text-indigo-600">10 report credits</span> have been added to your account.
        </p>
        <p className="text-sm text-slate-400 mb-8">
          Use them to generate AI Reports, Ad copy, and Brand Builder assets.
        </p>

        <Link href="/opportunities" className="btn-scout w-full justify-center">
          Start Exploring →
        </Link>

        <p className="text-xs text-slate-400 mt-4">Redirecting automatically in 5 seconds…</p>
      </div>
    </div>
  );
}
