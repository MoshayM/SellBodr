'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isPro, api } from '@/lib/api';

declare global {
  interface Window { Razorpay: any; }
}

const BENEFITS = [
  { icon: '🔍', title: 'Unlimited AI Scans', desc: 'Run as many product scans as you need — no monthly cap.' },
  { icon: '🏭', title: 'Full Supplier Intel', desc: 'Real-time search across IndiaMART, Alibaba & 8 more platforms.' },
  { icon: '✍️', title: 'AI Listing Generator', desc: 'SEO-optimised titles, bullets, keywords, ready to paste.' },
  { icon: '📊', title: 'Complete Profit Model', desc: 'Landed cost, fees, ads, duties — full P&L per product.' },
  { icon: '📣', title: 'Ads & Growth Plans', desc: 'AI-generated PPC strategy and growth roadmap.' },
  { icon: '🎨', title: 'Brand Builder', desc: 'Logo concepts, brand story, palette in one click.' },
  { icon: '📦', title: 'Bundle Finder', desc: 'AI product bundles to maximise AOV and differentiation.' },
  { icon: '📈', title: 'Deep Reports', desc: 'Full opportunity deep-dives exported to PDF/Word.' },
];

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [proPrice, setProPrice] = useState('₹1,499');

  useEffect(() => {
    if (isPro()) { router.replace('/opportunities'); return; }
    fetch('/api/v1/platform/settings')
      .then(r => r.json())
      .then((s: any) => {
        if (s.pro_price_inr) setProPrice(`₹${Number(s.pro_price_inr).toLocaleString('en-IN')}`);
      })
      .catch(() => {});
  }, [router]);

  async function handleUpgrade() {
    setError(''); setLoading(true);
    try {
      // Load Razorpay SDK
      if (!window.Razorpay) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = () => res();
          s.onerror = () => rej(new Error('Failed to load Razorpay'));
          document.head.appendChild(s);
        });
      }

      // Create order
      const token = localStorage.getItem('bs_access_token') ?? '';
      const orderRes = await fetch('/api/v1/billing/razorpay/pro-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      const user = getUser();
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         orderData.keyId,
          amount:      orderData.amount,
          currency:    orderData.currency,
          order_id:    orderData.orderId,
          name:        'SellBodr',
          description: 'Pro Plan — Monthly Subscription',
          prefill:     { name: user?.name ?? '', email: user?.email ?? '' },
          theme:       { color: '#7c3aed' },
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch('/api/v1/billing/razorpay/pro-verify', {
                method:  'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body:    JSON.stringify(response),
              });
              const v = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(v.error || 'Verification failed');

              // Refresh token to get plan: 'pro' in JWT
              const rawRefresh = localStorage.getItem('bs_refresh_token');
              if (rawRefresh) {
                const rt = await fetch('/api/v1/auth/refresh', {
                  method:  'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body:    JSON.stringify({ refreshToken: rawRefresh }),
                });
                const rt2 = await rt.json();
                if (rt2.accessToken) {
                  localStorage.setItem('bs_access_token', rt2.accessToken);
                  const stored = localStorage.getItem('bs_user');
                  if (stored) {
                    try { localStorage.setItem('bs_user', JSON.stringify({ ...JSON.parse(stored), plan: 'pro' })); } catch {}
                  }
                }
              }
              resolve();
            } catch (err: any) { reject(err); }
          },
          modal: { ondismiss: () => reject(new Error('cancelled')) },
        });
        rzp.open();
      });

      setSuccess(true);
      setTimeout(() => router.push('/opportunities'), 2500);
    } catch (err: any) {
      if (err.message !== 'cancelled') setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-black text-white mb-2">You're now Pro!</h1>
          <p className="text-white/55 text-sm">All AI features are now unlocked. Redirecting you back…</p>
          <div className="mt-5 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-violet-500 animate-[grow_2.5s_ease-in-out_forwards]" style={{ width: '100%', transformOrigin: 'left', animation: 'width 2.5s linear' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-4"
          style={{ background: 'linear-gradient(135deg,#7c3aed22,#6366f122)', border: '1px solid #7c3aed44', color: '#a78bfa' }}>
          ⭐ UPGRADE TO PRO
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">
          Unlock the full SellBodr<br />AI intelligence suite
        </h1>
        <p className="text-white/55 text-sm leading-relaxed max-w-md mx-auto">
          One plan. Every AI feature. Unlimited product research.
        </p>
      </div>

      {/* Price card */}
      <div className="card-dark rounded-2xl p-6 mb-6 border border-violet-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg,#7c3aed,#6366f1,#8b5cf6)' }} />
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">Pro Plan</div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white">{proPrice}</span>
              <span className="text-white/40 text-sm">/month</span>
            </div>
          </div>
          <div className="text-4xl">🚀</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
          {BENEFITS.map(b => (
            <div key={b.title} className="flex items-start gap-2.5">
              <span className="text-base shrink-0 mt-0.5">{b.icon}</span>
              <div>
                <div className="text-xs font-bold text-white/85">{b.title}</div>
                <div className="text-[11px] text-white/40 leading-snug">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60"
          style={{ background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 20px rgba(124,58,237,0.45)' }}>
          {loading ? '⏳ Opening payment…' : `⭐ Upgrade to Pro — ${proPrice}/mo`}
        </button>

        <p className="text-center text-[10px] text-white/25 mt-3">
          Secure payment via Razorpay · Cancel anytime · No hidden fees
        </p>
      </div>

      <p className="text-center text-xs text-white/30">
        Questions?{' '}
        <a href="mailto:hello@sellbodr.com" className="text-violet-400 hover:text-violet-300 transition-colors">
          Contact support
        </a>
      </p>
    </div>
  );
}
