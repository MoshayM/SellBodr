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
  { value: '19', label: 'Countries (Amazon)' },
  { value: '7', label: 'AI scoring dimensions' },
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
        style={{ transformStyle: 'preserve-3d', boxShadow: `0 20px 60px rgba(0,0,0,0.1), 0 4px 16px ${card.color}20` }}
        className="bg-white rounded-2xl p-4 w-56 select-none cursor-default border border-slate-200"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-slate-400 font-semibold tracking-widest">EXAMPLE</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: card.color }}>{card.market}</span>
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
                style={{ background: `linear-gradient(90deg, ${card.color}, #6366F1)` }}
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
  const heroY = useTransform(scrollYProgress, [0, 0.25], [0, -60]);

  const [proPrice, setProPrice] = useState('18');
  const [creditBundle, setCreditBundle] = useState({ size: '10', price: '5' });
  useEffect(() => {
    fetch('/api/v1/platform/settings')
      .then(r => r.json())
      .then((s: any) => {
        if (s.pro_price_usd) setProPrice(String(s.pro_price_usd));
        if (s.credit_bundle_size || s.credit_bundle_price_usd) {
          setCreditBundle({
            size:  String(s.credit_bundle_size        ?? '10'),
            price: String(s.credit_bundle_price_usd   ?? '5'),
          });
        }
      })
      .catch(() => {});
  }, []);

  const plans = [
    {
      name: 'Starter', price: '$0', period: '',
      desc: 'Start scouting — no credit card, no commitment',
      features: ['Up to 5 AI product scans', 'Up to 8 results per scan', 'Full 7-dimension Opportunity Score', 'Supplier list (up to 10 per product)', 'Wishlist — save products locally'],
      cta: 'Start scouting free', ctaHref: '/register', highlight: false,
    },
    {
      name: 'Pro', price: `$${proPrice}`, period: '/mo',
      desc: 'Unlimited scans. Premium AI. Full supplier intelligence.',
      features: ['Unlimited AI product scans', 'Premium AI models — Claude + GPT-4 + Groq', 'Full supplier list, no cap', 'Real-time supplier search (IndiaMART, Alibaba & more)', 'Export to CSV, Excel, PDF & Word', 'All dashboard tools — Research, Profitability, Keywords', 'Priority support'],
      cta: 'Go Pro', ctaHref: '/register?plan=pro', highlight: true,
    },
  ];

  const aiCreditNote = `AI content generation (Reports · Ads · Brand · Listing Copy · Growth Playbooks) — 1 credit per use. Buy ${creditBundle.size} credits for $${creditBundle.price}. Works on any plan.`;

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 lg:px-12 h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200"
        style={{ boxShadow: '0 1px 0 #E2E8F0, 0 4px 16px rgba(15,23,42,0.05)' }}>

        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/icons/icon.svg" alt="SellBodr"
            className="w-9 h-9 transition-transform duration-200 group-hover:scale-110"
            style={{ filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.5))' }} />
          <div>
            <div className="text-[14px] font-black tracking-tight leading-none"
              style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              SellBodr
            </div>
            <div className="hidden sm:block text-[8px] font-semibold text-slate-400 uppercase tracking-[0.18em] leading-none mt-0.5">
              eCommerce Intelligence
            </div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-slate-500">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          <Link href="/guide" className="hover:text-slate-900 transition-colors">User Guide</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary text-sm px-5 py-2.5 min-h-0 rounded-xl">
            Get started
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <motion.section ref={heroRef} style={{ opacity: heroOpacity, y: heroY, background: 'linear-gradient(180deg, #F5F3FF 0%, #EEF2FF 30%, #FFFFFF 70%)' }}
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">

        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #7C3AED 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-200/50 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 text-xs text-slate-600 mb-8 border border-slate-200 shadow-sm">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            AI-powered · 76+ marketplaces · 19 Amazon countries · Live data
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.8 }}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.05] tracking-tight mb-6 text-slate-900">
            Find Products
            <br />
            <span className="text-gradient">in India.</span>
            <br />
            Sell Globally.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            AI discovers high-margin cross-border products you can source in India and sell on Amazon, Etsy &amp; 74+ global marketplaces — with a full profit model, verified suppliers, and a Launch / Hold / Reject verdict in under 60 seconds.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="flex justify-center mb-4">
            <Link href="/register" className="btn-primary text-base px-10 py-4 min-h-0 rounded-2xl">
              Scout your first product →
            </Link>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="text-slate-500 text-sm mb-12">
            Free to start · No credit card · Cancel anytime
          </motion.p>

          {/* Floating opportunity cards */}
          <div className="flex items-end justify-center gap-4 sm:gap-6 flex-wrap">
            {CARDS.map((c, i) => (
              <OpportunityCard key={c.product} card={c} delay={0.9 + i * 0.15}
                className={i === 1 ? 'mb-0' : i === 0 ? 'mb-0 sm:mb-8' : 'mb-0 sm:mb-4'} />
            ))}
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400">
          <span className="text-xs">Scroll to explore</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-px h-8 bg-gradient-to-b from-slate-400 to-transparent" />
        </motion.div>
      </motion.section>

      {/* ── Stats ── */}
      <section className="py-16 px-6 border-y border-slate-100 bg-slate-50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-5 text-center border border-slate-200 shadow-sm hover:-translate-y-1 transition-transform duration-200">
              <div className="text-3xl sm:text-4xl font-black text-gradient mb-1">{s.value}</div>
              <div className="text-xs text-slate-500 leading-snug">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
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
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-white rounded-2xl p-6 cursor-default transition-all duration-300 border border-slate-200 group"
                style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.05)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                  style={{ background: `${f.accent}14`, border: `1px solid ${f.accent}25` }}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-sm text-indigo-600 font-semibold mb-3 uppercase tracking-widest">Simple 3-step flow</div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900">
              From idea to <span className="text-gradient-purple">first sale</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-px bg-gradient-to-r from-slate-200 via-violet-300 to-slate-200" />
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="bg-white rounded-2xl p-6 relative border border-slate-200 shadow-sm hover:-translate-y-1 transition-transform duration-200">
                <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
                  style={{ background: 'linear-gradient(90deg,transparent,rgba(124,58,237,0.4),transparent)' }} />
                <div className="text-4xl font-black mb-4 leading-none text-gradient">{s.n}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                {i < 2 && <div className="hidden md:block absolute top-7 -right-3 z-10 text-slate-300 text-xl">→</div>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-sm text-emerald-600 font-semibold mb-3 uppercase tracking-widest">Simple pricing</div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-slate-900">
              Start free. Scale at <span className="text-gradient">your own pace.</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              {`5 free scans to start — no card needed. Go Pro for $${proPrice}/mo for unlimited scans and premium AI models. Pay only for AI content you generate — $${creditBundle.price} for ${creditBundle.size} credits.`}
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`relative bg-white rounded-2xl p-7 flex flex-col overflow-hidden border-2 ${
                  p.highlight ? 'border-violet-400 shadow-xl shadow-violet-100' : 'border-slate-200 shadow-sm'
                }`}>

                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: p.highlight ? 'linear-gradient(90deg,transparent,#7C3AED,transparent)' : 'linear-gradient(90deg,transparent,#E2E8F0,transparent)' }} />

                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-violet-500/30 z-10">
                    MOST POPULAR
                  </div>
                )}

                <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${p.highlight ? 'text-violet-600' : 'text-slate-500'}`}>
                  {p.name}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black text-slate-900">{p.price}</span>
                  <span className="text-slate-400 text-sm">{p.period}</span>
                </div>
                {p.highlight && <div className="text-xs text-emerald-600 font-medium mb-2">Cancel anytime</div>}
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
                    ? 'btn-primary text-sm justify-center min-h-0 py-3 text-center'
                    : 'inline-flex items-center justify-center text-sm py-3 px-6 rounded-xl font-semibold text-slate-700 border-2 border-slate-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all duration-200 w-full'}>
                  {p.cta}
                </Link>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="mt-8 max-w-2xl mx-auto rounded-2xl border border-violet-100 bg-violet-50/60 px-6 py-4 text-center">
            <p className="text-sm font-semibold text-violet-700 mb-1">⚡ AI Generation Credits</p>
            <p className="text-xs text-slate-500">{aiCreditNote}</p>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center text-slate-400 text-xs mt-4">
            No credit card required for Starter · Prices in USD · Credits never expire
          </motion.p>
        </div>
      </section>

      {/* ── Install / PWA ── */}
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

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 text-center relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-50 via-indigo-50 to-violet-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-200/40 rounded-full blur-3xl" />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-5xl sm:text-6xl font-black mb-6 leading-tight text-slate-900">
            Start scouting <span className="text-gradient">today</span>
          </h2>
          <p className="text-slate-600 text-lg mb-10">
            AI-powered intelligence to source in India and sell on the world&apos;s top marketplaces.
          </p>
          <Link href="/register" className="btn-primary text-lg px-10 py-5 min-h-0 rounded-2xl inline-flex shadow-xl shadow-violet-500/25">
            Start scouting →
          </Link>
          <p className="text-slate-500 text-sm mt-5">Free to start · No credit card · Cancel anytime</p>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 py-10 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon.svg" alt="SellBodr" className="w-7 h-7"
              style={{ filter: 'drop-shadow(0 0 4px rgba(124,58,237,0.4))' }} />
            <span className="font-bold text-slate-900">SellBodr</span>
          </div>
          <p className="text-slate-400 text-sm">&copy; {new Date().getFullYear()} SellBodr. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/guide" className="hover:text-slate-900 transition-colors">User Guide</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/login" className="hover:text-slate-900 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
