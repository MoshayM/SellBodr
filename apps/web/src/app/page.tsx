'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';

const FEATURES = [
  { icon: '🎯', title: 'AI Opportunity Scoring', desc: 'Every product scored 0–100 across demand, competition, margin, trend, saturation, shipping, and marketplace fit — instantly.', accent: '#7C3AED' },
  { icon: '💰', title: 'Landed-Cost Profit Model', desc: 'Full P&L: product cost + freight + duties + marketplace fees + ad spend = real net profit per unit.', accent: '#10B981' },
  { icon: '🔬', title: 'Deep Market Research', desc: 'Competitor analysis, review mining, price trends, and saturation scores across 76+ global marketplaces.', accent: '#06B6D4' },
  { icon: '🗺', title: 'Global Supplier Map', desc: 'Interactive satellite map pins every verified supplier worldwide. Click for precise coordinates and direct Google Maps links.', accent: '#F59E0B' },
  { icon: '⚡', title: 'Live AI Scan Progress', desc: 'Watch 7 AI stages run in real time — Discovering → Demand → Competition → Suppliers → Profit → Scoring → Verdicts.', accent: '#EC4899' },
  { icon: '🚀', title: 'AI Launch Assets', desc: 'SEO-optimised title, bullets, description, keywords, and pricing — generated and ready to publish in seconds.', accent: '#6366F1' },
];

const CARDS = [
  { product: 'Brass Diyas Set', score: 91, market: 'Amazon US', profit: '+$18.40', trend: '+34%', color: '#10B981' },
  { product: 'Pashmina Shawl',  score: 87, market: 'Etsy UK',   profit: '+$22.10', trend: '+28%', color: '#7C3AED' },
  { product: 'Marble Coasters', score: 83, market: 'Amazon DE', profit: '+$14.80', trend: '+19%', color: '#06B6D4' },
];

const STEPS = [
  { n: '01', title: 'Scout the market', desc: 'Pick a marketplace (Amazon, Etsy, eBay…) and a product keyword. Watch 7 live AI stages discover, score, and rank every opportunity in real time.' },
  { n: '02', title: 'Analyse & compare', desc: 'Every result shows a 0–100 Opportunity Score, full P&L model, verified India suppliers on a live satellite map, and a Launch / Hold / Reject verdict.' },
  { n: '03', title: 'Launch with confidence', desc: 'Generate SEO-optimised titles, bullet points, keywords, and pricing in one click — then contact suppliers directly from within the platform.' },
];

const STATS = [
  { value: '76+', label: 'Marketplace platforms' },
  { value: '19',  label: 'Countries (Amazon)' },
  { value: '7',   label: 'AI scoring dimensions' },
  { value: '< 60s', label: 'First opportunity scored' },
];

function OpportunityCard({ card, delay, className }: { card: typeof CARDS[0]; delay: number; className?: string }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -12, y: ((e.clientX - r.left) / r.width - 0.5) * 12 });
  };

  return (
    <div ref={ref} className={className} onMouseMove={handleMove} onMouseLeave={() => setTilt({ x: 0, y: 0 })} style={{ perspective: '800px' }}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0, rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ delay, duration: 0.7, ease: 'easeOut', rotateX: { duration: 0.2 }, rotateY: { duration: 0.2 } }}
        style={{ transformStyle: 'preserve-3d', boxShadow: `0 24px 64px rgba(0,0,0,0.15), 0 4px 16px ${card.color}25` }}
        className="bg-white rounded-2xl p-4 w-56 select-none cursor-default border border-slate-200"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-slate-400 font-semibold tracking-widest">EXAMPLE</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: card.color }}>{card.market}</span>
        </div>
        <div className="text-sm font-semibold text-slate-900 mb-3">{card.product}</div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">AI Score</span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${card.score}%` }}
                transition={{ delay: delay + 0.5, duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg,${card.color},#6366F1)` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-900">{card.score}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-emerald-600 font-bold text-sm">{card.profit}</span>
          <span className="text-emerald-600 text-xs font-medium">↑ {card.trend}</span>
        </div>
      </motion.div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function LandingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const heroY      = useTransform(scrollYProgress, [0, 0.25], [0, -60]);

  const [proPrice, setProPrice] = useState('19');
  const [proINR, setProINR] = useState(1499);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    // Detect country first, then set currency and pricing
    fetch('/api/v1/geo')
      .then(r => r.json())
      .then((g: any) => {
        if (g.country === 'IN') {
          setCurrency('INR');
          setProINR(99);
        } else {
          setCurrency('USD');
          fetch('/api/v1/platform/settings')
            .then(r => r.json())
            .then((s: any) => {
              if (s.pro_price_usd) setProPrice(String(s.pro_price_usd));
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        // Fallback: load platform settings for USD price
        fetch('/api/v1/platform/settings')
          .then(r => r.json())
          .then((s: any) => {
            if (s.pro_price_usd) setProPrice(String(s.pro_price_usd));
          })
          .catch(() => {});
      });
  }, []);

  const plans = [
    {
      key: 'free',
      name: 'Starter',
      priceINR: 0, priceUSD: 0,
      desc: 'Start scouting — no credit card, no commitment.',
      features: ['5 AI product scans (lifetime)', 'Up to 20 results per scan', 'Full 7-dimension Opportunity Score', 'Supplier list (up to 10 per product)', 'Wishlist — save products locally'],
      cta: 'Start free', ctaHref: '/register', highlight: false,
    },
    {
      key: 'pro',
      name: 'Pro',
      priceINR: proINR, priceUSD: Number(proPrice),
      desc: 'Unlimited scans. 200 results per scan. Premium AI. Full supplier intelligence.',
      features: ['Unlimited AI product scans', 'Up to 200 results per scan', 'Private & public search (My Scans)', 'Premium AI — Claude + Groq + Mistral', 'Full supplier list with contact details', 'All dashboards — Research, Profitability, Keywords', 'Export to CSV, Excel, PDF & Word', 'Priority email support'],
      cta: 'Go Pro', ctaHref: '/register?plan=pro', highlight: true,
    },
  ];

  useEffect(() => {
    const token = localStorage.getItem('bs_access_token');
    if (token) { router.replace('/opportunities'); } else { setChecked(true); }
  }, [router]);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) { setIsInstalled(true); return; }
    const captured = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null;
    if (captured) { (window as any).__pwaInstallPrompt = null; setInstallPrompt(captured); return; }
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setInstallPrompt(null);
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1B35' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-bounce-in"
            style={{ background: 'linear-gradient(135deg,#6366F1,#7C3AED)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
            <img src="/icons/icon.svg" alt="" className="w-7 h-7" style={{ filter: 'brightness(10)' }} />
          </div>
          <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">

      {/* ── Navbar — dark navy ─────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 lg:px-12 h-16"
        style={{
          background: 'rgba(13,27,53,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        }}>

        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/icons/icon.svg" alt="SellBodr"
            className="w-9 h-9 transition-transform duration-200 group-hover:scale-110"
            style={{ filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.9)) brightness(1.2)' }} />
          <div>
            <div className="text-[14px] font-black tracking-tight leading-none" style={{ color: '#ffffff' }}>
              SellBodr
            </div>
            <div className="hidden sm:block text-[8px] font-semibold uppercase tracking-[0.18em] leading-none mt-0.5"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              eCommerce Intelligence
            </div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <a href="#features" className="hover:text-white transition-colors duration-150">Features</a>
          <a href="#how" className="hover:text-white transition-colors duration-150">How it works</a>
          <a href="#pricing" className="hover:text-white transition-colors duration-150">Pricing</a>
          <Link href="/guide" className="hover:text-white transition-colors duration-150">User Guide</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium transition-colors duration-150 hover:text-white"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            Sign in
          </Link>
          <Link href="/register" className="btn-scout text-sm px-5 py-2.5">
            Get started →
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero — dark-to-light gradient ────────────────────── */}
      <motion.section
        ref={heroRef as any}
        style={{
          opacity: heroOpacity,
          y: heroY,
          background: 'linear-gradient(180deg,#0D1B35 0%,#111d38 18%,#162240 36%,#1c2d50 52%,#243460 74%,#ddd8ff 88%,#EEF2FF 94%,#FFFFFF 100%)',
        } as any}
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">

        {/* Dot-grid texture (dark zone) */}
        <div className="absolute top-0 left-0 right-0 h-[50%] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        {/* Ambient orbs */}
        <div className="absolute top-[5%] left-1/4 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.22),transparent 70%)' }} />
        <div className="absolute top-[8%] right-[15%] w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(124,58,237,0.18),transparent 70%)' }} />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-violet-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/60 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">

          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-8"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            AI-powered · 76+ marketplaces · 19 Amazon countries · Live data
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.8 }}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.05] tracking-tight mb-6"
            style={{ color: '#ffffff', textShadow: '0 2px 24px rgba(0,0,0,0.65), 0 0 48px rgba(0,0,0,0.4)' }}>
            Find Products
            <br />
            <span style={{
              background: 'linear-gradient(135deg,#818cf8 0%,#a78bfa 45%,#f472b6 85%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              filter: 'drop-shadow(0 2px 12px rgba(129,140,248,0.5))',
            }}>
              in India.
            </span>
            <br />
            Sell Globally.
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}>
            AI discovers high-margin cross-border products you can source in India and sell on Amazon, Etsy &amp; 74+ global marketplaces — with a full profit model, verified Indian suppliers on a live map, and a Launch / Hold / Reject verdict in under 60 seconds.
          </motion.p>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="flex justify-center mb-4">
            <Link href="/register" className="btn-scout text-base px-10 py-4 rounded-2xl"
              style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.55), 0 4px 12px rgba(99,102,241,0.3)' }}>
              Scout your first product →
            </Link>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}
            className="text-sm mb-12" style={{ color: 'rgba(255,255,255,0.82)', textShadow: '0 1px 12px rgba(0,0,0,0.75), 0 2px 6px rgba(0,0,0,0.5)' }}>
            Free to start · No credit card · Plans from {currency === 'INR' ? `₹${proINR}/mo` : `$${proPrice}/mo`}
          </motion.p>

          {/* Floating opportunity cards */}
          <div className="flex items-end justify-center gap-4 sm:gap-6 flex-wrap">
            {CARDS.map((c, i) => (
              <OpportunityCard key={c.product} card={c} delay={0.9 + i * 0.15}
                className={i === 1 ? 'mb-0' : i === 0 ? 'mb-0 sm:mb-8' : 'mb-0 sm:mb-4'} />
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span className="text-xs">Scroll to explore</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-px h-8" style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.35),transparent)' }} />
        </motion.div>
      </motion.section>

      {/* ── Stats — dark navy strip ────────────────────────────── */}
      <section className="py-16 px-6" style={{ background: '#0D1B35', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-5 text-center cursor-default transition-transform duration-200 hover:-translate-y-1"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-3xl sm:text-4xl font-black mb-1"
                style={{ background: 'linear-gradient(135deg,#a5b4fc,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {s.value}
              </div>
              <div className="text-[11px] font-medium leading-snug" style={{ color: 'rgba(255,255,255,0.42)' }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-sm text-violet-600 font-semibold mb-3 uppercase tracking-widest">Platform capabilities</div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900">
              Everything you need to <span className="text-gradient">sell globally</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              From product discovery to live listing — the complete AI stack for cross-border sellers.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="quick-tile p-6 cursor-default">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                  style={{ background: `${f.accent}14`, border: `1px solid ${f.accent}28` }}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how" className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-sm text-indigo-600 font-semibold mb-3 uppercase tracking-widest">Simple 3-step flow</div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900">
              From idea to <span className="text-gradient-purple">first sale</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5 relative">
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-px"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)' }} />
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="bg-white rounded-2xl p-6 relative border border-slate-200 shadow-sm hover:-translate-y-1 transition-transform duration-200 cursor-default">
                <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
                  style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.55),transparent)' }} />
                <div className="text-4xl font-black mb-4 leading-none text-gradient">{s.n}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                {i < 2 && <div className="hidden md:block absolute top-7 -right-3 z-10 text-slate-300 text-xl">→</div>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <div className="text-sm text-emerald-600 font-semibold mb-3 uppercase tracking-widest">Simple, transparent pricing</div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900">
              Cheaper than <span className="text-gradient">the competition.</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Jungle Scout starts at $49/mo. Helium 10 at $39/mo. SellBodr gives you more — cross-border India sourcing intelligence — for less.
            </p>
          </motion.div>

          {/* Toggles */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
              <button onClick={() => setCurrency('INR')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${currency === 'INR' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                ₹ INR
              </button>
              <button onClick={() => setCurrency('USD')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${currency === 'USD' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                $ USD
              </button>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
              <button onClick={() => setIsAnnual(false)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${!isAnnual ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                Monthly
              </button>
              <button onClick={() => setIsAnnual(true)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${isAnnual ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                Annual <span className="text-emerald-600 text-xs font-bold ml-1">−20%</span>
              </button>
            </div>
          </div>

          {/* Plans grid */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((p, i) => {
              const basePrice = currency === 'INR' ? p.priceINR : p.priceUSD;
              const effectivePrice = p.priceINR === 0 ? 0 : (isAnnual ? Math.round(basePrice * 0.8) : basePrice);
              const displayedPrice = p.priceINR === 0
                ? (currency === 'INR' ? '₹0' : '$0')
                : (currency === 'INR' ? `₹${effectivePrice.toLocaleString('en-IN')}` : `$${effectivePrice}`);
              const annualSaving = isAnnual && p.priceINR > 0
                ? (currency === 'INR'
                  ? `Save ₹${Math.round(p.priceINR * 0.2 * 12).toLocaleString('en-IN')}/yr`
                  : `Save $${Math.round(p.priceUSD * 0.2 * 12)}/yr`)
                : null;
              return (
                <motion.div
                  key={p.key}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className={`relative bg-white rounded-2xl p-7 flex flex-col border-2 ${
                    p.highlight ? 'border-violet-400 shadow-xl shadow-violet-100 pt-9' : 'border-slate-200 shadow-sm'
                  }`}>
                  <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl overflow-hidden"
                    style={{ background: p.highlight ? 'linear-gradient(90deg,transparent,#7C3AED,transparent)' : 'linear-gradient(90deg,transparent,#E2E8F0,transparent)' }} />
                  {p.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg z-10 whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)', boxShadow: '0 4px 14px rgba(99,102,241,0.45)' }}>
                      MOST POPULAR
                    </div>
                  )}
                  <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${p.highlight ? 'text-violet-600' : 'text-slate-500'}`}>
                    {p.name}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-black text-slate-900">{displayedPrice}</span>
                    {p.priceINR > 0 && <span className="text-slate-400 text-sm">/mo</span>}
                  </div>
                  {annualSaving
                    ? <div className="text-xs text-emerald-600 font-semibold mb-2">{annualSaving}</div>
                    : p.highlight && <div className="text-xs text-emerald-600 font-medium mb-2">Cancel anytime</div>}
                  <p className="text-slate-500 text-sm mb-6">{p.desc}</p>
                  <ul className="space-y-2.5 flex-1 mb-7">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                        <span className="text-emerald-500 text-base flex-shrink-0 font-bold">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <Link href={p.ctaHref}
                    className={p.highlight
                      ? 'btn-scout text-sm justify-center py-3 text-center w-full rounded-xl'
                      : 'inline-flex items-center justify-center text-sm py-3 px-6 rounded-xl font-semibold text-slate-700 border-2 border-slate-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all duration-200 w-full'}>
                    {p.cta}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center text-slate-400 text-xs mt-6">
            No credit card required for Starter · {currency === 'INR' ? 'Prices in INR' : 'Prices in USD'} · Cancel anytime
          </motion.p>
        </div>
      </section>

      {/* ── Install / PWA ──────────────────────────────────────── */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-4xl mb-4">📱</div>
            <h2 className="text-3xl font-black mb-3 text-slate-900">Available on every device</h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto">
              Install SellBodr as an app on Android, iOS, Mac, or Windows — works offline, loads instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {installPrompt ? (
                <button onClick={handleInstall}
                  className="bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-slate-600 hover:text-violet-700 transition-all touch-manipulation">
                  <span className="text-2xl">🤖</span>
                  <div className="text-left">
                    <div className="font-semibold text-slate-800 text-xs">Android / Chrome</div>
                    <div className="text-violet-600 text-xs">Tap here to install now ↓</div>
                  </div>
                </button>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-slate-600">
                  <span className="text-2xl">🤖</span>
                  <div className="text-left">
                    <div className="font-semibold text-slate-800 text-xs">Android</div>
                    <div className="text-slate-400 text-xs">Menu → Add to Home Screen</div>
                  </div>
                </div>
              )}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-slate-600">
                <span className="text-2xl"></span>
                <div className="text-left">
                  <div className="font-semibold text-slate-800 text-xs">iPhone / iPad</div>
                  <div className="text-slate-400 text-xs">Safari → Share ↑ → Add to Home</div>
                </div>
              </div>
              {installPrompt ? (
                <button onClick={handleInstall}
                  className="bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-slate-600 hover:text-violet-700 transition-all touch-manipulation">
                  <span className="text-2xl">💻</span>
                  <div className="text-left">
                    <div className="font-semibold text-slate-800 text-xs">Desktop</div>
                    <div className="text-violet-600 text-xs">Tap here to install now ↓</div>
                  </div>
                </button>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-slate-600">
                  <span className="text-2xl">💻</span>
                  <div className="text-left">
                    <div className="font-semibold text-slate-800 text-xs">Desktop</div>
                    <div className="text-slate-400 text-xs">Chrome → Install App icon ↑</div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center">
              <a href="https://github.com/MoshayM/SellBodr/releases/latest/download/SellBodr-Setup.exe"
                className="bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-slate-600 hover:text-blue-700 transition-all"
                download>
                <span className="text-2xl">🪟</span>
                <div className="text-left">
                  <div className="font-semibold text-slate-800 text-xs">Windows Desktop App</div>
                  <div className="text-blue-600 text-xs">Download .exe installer (64-bit)</div>
                </div>
              </a>
            </div>
            {isInstalled && (
              <p className="mt-4 text-sm text-emerald-600 font-medium">✓ SellBodr is installed on this device</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA — dark navy ──────────────────────────────── */}
      <section className="py-28 px-6 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg,#0D1B35 0%,#0F2040 100%)' }}>
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        {/* Center glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.22),transparent 70%)' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse,rgba(124,58,237,0.15),transparent 70%)' }} />

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative z-10 max-w-2xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-8"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.7)' }}>
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Join thousands of cross-border sellers
          </div>

          <h2 className="text-5xl sm:text-6xl font-black mb-6 leading-tight" style={{ color: '#ffffff' }}>
            Start scouting{' '}
            <span style={{
              background: 'linear-gradient(135deg,#a5b4fc 0%,#c4b5fd 50%,#f9a8d4 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              today
            </span>
          </h2>

          <p className="text-lg mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
            AI-powered intelligence to source in India and sell on the world&apos;s top marketplaces.
          </p>

          <Link href="/register" className="btn-scout text-lg px-10 py-5 rounded-2xl inline-flex"
            style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.55), 0 4px 12px rgba(99,102,241,0.3)' }}>
            Start scouting →
          </Link>

          <p className="text-sm mt-5" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Free to start · No credit card · Cancel anytime
          </p>

          {/* Stats row */}
          <div className="mt-14 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[['76+','Marketplaces'],['< 60s','To first score'],['5 free','Scans to start']].map(([v,l]) => (
              <div key={l} className="rounded-2xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-base font-black text-white">{v}</div>
                <div className="text-[10px] leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{l}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Footer — dark navy ─────────────────────────────────── */}
      <footer className="py-10 px-6" style={{ background: '#0A1525', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon.svg" alt="SellBodr" className="w-7 h-7"
              style={{ filter: 'drop-shadow(0 0 5px rgba(99,102,241,0.6)) brightness(1.1)' }} />
            <span className="font-bold" style={{ color: '#ffffff' }}>SellBodr</span>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.28)' }}>
            &copy; {new Date().getFullYear()} SellBodr. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <Link href="/guide"   className="hover:text-white transition-colors duration-150">User Guide</Link>
            <Link href="/privacy" className="hover:text-white transition-colors duration-150">Privacy</Link>
            <Link href="/terms"   className="hover:text-white transition-colors duration-150">Terms</Link>
            <Link href="/login"   className="hover:text-white transition-colors duration-150">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
