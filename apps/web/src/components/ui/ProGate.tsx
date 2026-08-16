'use client';
import Link from 'next/link';

interface ProGateProps {
  icon: string;
  feature: string;
  tagline: string;
  benefits: string[];
  compact?: boolean;
}

export function ProGate({ icon, feature, tagline, benefits, compact = false }: ProGateProps) {
  if (compact) {
    return (
      <div className="relative rounded-2xl overflow-hidden py-12 px-6 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.07) 0%, rgba(99,102,241,0.03) 100%)',
          border: '1px solid rgba(124,58,237,0.22)',
        }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-72 h-40 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.8) 0%, transparent 70%)', filter: 'blur(32px)' }} />
        </div>
        <div className="relative z-10">
          <div className="text-4xl mb-3">{icon}</div>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-violet-400 bg-violet-500/15 border border-violet-500/25 px-2.5 py-1 rounded-full uppercase tracking-widest mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Pro
          </span>
          <h3 className="text-lg font-black text-white mb-1.5">{feature}</h3>
          <p className="text-sm text-white/50 mb-5 max-w-sm mx-auto leading-relaxed">{tagline}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link href="/register?plan=pro"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 rounded-xl text-white bg-violet-600 hover:bg-violet-500 shadow-[0_0_14px_rgba(124,58,237,0.5)] hover:shadow-[0_0_22px_rgba(124,58,237,0.7)] transition-all duration-200 border border-violet-400/30">
              Upgrade to Pro →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.04) 100%)',
          border: '1px solid rgba(124,58,237,0.25)',
        }}>
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-64 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.22) 0%, transparent 70%)', filter: 'blur(48px)' }} />

        <div className="relative z-10 flex flex-col items-center text-center px-6 py-16 md:py-20">

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-400 bg-violet-500/15 border border-violet-500/30 px-3 py-1 rounded-full uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Pro Feature — Upgrade to unlock
          </div>

          {/* Icon + headline */}
          <div className="text-6xl mb-4 filter drop-shadow-lg">{icon}</div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">{feature}</h1>
          <p className="text-base text-white/55 max-w-lg mb-10 leading-relaxed">{tagline}</p>

          {/* Benefit grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-10 max-w-xl w-full text-left">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-white/[0.035] border border-white/8">
                <span className="text-violet-400 mt-0.5 shrink-0 text-xs">✦</span>
                <span className="text-sm text-white/70 leading-snug">{b}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link href="/register?plan=pro"
              className="inline-flex items-center gap-2 text-sm font-bold px-7 py-3.5 rounded-xl text-white bg-violet-600 hover:bg-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.5)] hover:shadow-[0_0_30px_rgba(124,58,237,0.75)] transition-all duration-200 border border-violet-400/30">
              Upgrade to Pro
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-8 text-xs text-white/25">
            <span>✓ From <strong className="text-white/40">$49/mo</strong></span>
            <span>✓ No setup fee</span>
            <span>✓ Cancel anytime</span>
            <span>✓ Includes all Pro features</span>
          </div>
        </div>
      </div>
    </div>
  );
}
