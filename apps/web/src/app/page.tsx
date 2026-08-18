'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ParticleCanvas } from '@/components/ui/ParticleCanvas';

const FEATURES = [
  { icon: '🎯', title: 'AI Opportunity Scoring', desc: 'Every product scored 0–100 across demand, competition, margin, trend, saturation, shipping, and marketplace fit — instantly.', color: 'from-violet-500/20 to-purple-500/10' },
  { icon: '💰', title: 'Landed-Cost Profit Model', desc: 'Full P&L: product cost + freight + duties + marketplace fees + ad spend = real net profit per unit.', color: 'from-emerald-500/20 to-green-500/10' },
  { icon: '🔬', title: 'Deep Market Research', desc: 'Competitor analysis, review mining, price trends, and saturation scores across 9 major global marketplaces.', color: 'from-cyan-500/20 to-blue-500/10' },
  { icon: '🗺', title: 'Global Supplier Map', desc: 'Interactive satellite map pins every verified supplier worldwide. Click for precise coordinates, city, and direct Google Maps links.', color: 'from-orange-500/20 to-amber-500/10' },
  { icon: '⚡', title: 'Live AI Scan Progress', desc: 'Watch 7 AI stages run in real time — Discovering → Demand → Competition → Suppliers → Profit → Scoring → Verdicts.', color: 'from-pink-500/20 to-rose-500/10' },
  { icon: '🚀', title: 'AI Launch Assets', desc: 'SEO-optimised title, bullets, description, keywords, and pricing — generated and ready to publish in seconds.', color: 'from-indigo-500/20 to-blue-500/10' },
];

const CARDS = [
  { product: 'Brass Diyas Set', score: 91, market: 'Amazon US', profit: '+$18.40', trend: '+34%', badge: 'bg-emerald-500' },
  { product: 'Pashmina Shawl', score: 87, market: 'Etsy UK', profit: '+$22.10', trend: '+28%', badge: 'bg-violet-500' },
  { product: 'Marble Coasters', score: 83, market: 'Amazon DE', profit: '+$14.80', trend: '+19%', badge: 'bg-cyan-500' },
];

const STEPS = [
  { n: '01', title: 'Scout the market', desc: 'Pick a marketplace (Amazon, Etsy, eBay…) and a product keyword. Watch 7 live AI stages discover, score, and rank every opportunity in real time.' },
  { n: '02', title: 'Analyse & compare', desc: 'Every result shows a 0–100 Opportunity Score, full P&L model, verified India suppliers on a live satellite map, and a Launch / Hold / Reject verdict.' },
  { n: '03', title: 'Launch with confidence', desc: 'Generate SEO-optimised titles, bullet points, keywords, and pricing in one click — then contact suppliers directly from within the platform.' },
];

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    period: '',
    desc: 'Explore the platform with no commitment',
    features: [
      '3 AI product scans per month',
      'Opportunity Score preview',
      'Top 5 results per scan',
      'Basic profit indicator',
      'Wishlist — save up to 10 products',
    ],
    cta: 'Start scouting',
    ctaHref: '/register',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/mo',
    desc: 'Full AI intelligence. Unlimited scans. Real profits.',
    features: [
      'Unlimited AI product scans',
      'Full 7-dimension Opportunity Score',
      'Complete India supplier database',
      'AI listing generator (title, bullets, keywords)',
      'Landed-cost profit model with full P&L',
      'Unlimited wishlist & CSV export',
      'Priority support',
    ],
    cta: 'Try Pro free for 7 days',
    ctaHref: '/register?plan=pro',
    highlight: true,
  },
];

const STATS = [
  { value: '9', label: 'Marketplace platforms' },
  { value: '37', label: 'Countries covered' },
  { value: '7', label: 'AI scoring dimensions' },
  { value: '< 60s', label: 'First opportunity scored' },
];

function OpportunityCard({ card, delay, className }: { card: typeof CARDS[0]; delay: number; className?: string }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -16, y: ((e.clientX - r.left) / r.width - 0.5) * 16 });
  };

  return (
    <div ref={ref} className={`${className}`} onMouseMove={handleMove} onMouseLeave={() => setTilt({ x: 0, y: 0 })} style={{ perspective: '800px' }}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0, rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ delay, duration: 0.7, ease: 'easeOut', rotateX: { duration: 0.2 }, rotateY: { duration: 0.2 } }}
        style={{ transformStyle: 'preserve-3d' }}
        className="glass-card rounded-2xl p-4 w-56 select-none cursor-default shadow-2xl animate-pulse-glow"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-white/35 font-medium tracking-widest">EXAMPLE</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${card.badge}`}>{card.market}</span>
        </div>
        <div className="text-sm font-semibold text-white mb-3">{card.product}</div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/50">AI Score</span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${card.score}%` }}
                transition={{ delay: delay + 0.5, duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full"
              />
            </div>
            <span className="text-xs font-bold text-white">{card.score}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-emerald-400 font-bold text-sm">{card.profit}</span>
          <span className="text-emerald-400 text-xs font-medium">↑ {card.trend}</span>
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
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white overflow-x-hidden">

      {/* ── Navbar ──────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 lg:px-12 h-16 glass border-b border-white/5"
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/icons/icon.svg" alt="SellBodr"
            className="w-9 h-9 transition-transform duration-200 group-hover:scale-110"
            style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.75)) drop-shadow(0 0 3px rgba(219,39,119,0.4))' }} />
          <div>
            <div className="text-[14px] font-black tracking-tight leading-none"
              style={{ background: 'linear-gradient(135deg,#fff 20%,#c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              SellBodr
            </div>
            <div className="hidden sm:block text-[8px] font-semibold text-white/60 uppercase tracking-[0.18em] leading-none mt-0.5">
              eCommerce Intelligence
            </div>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/50 hover:text-white/80 transition-colors">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary text-sm px-5 py-2.5 min-h-0 rounded-lg shadow-lg shadow-violet-500/30">
            Get started
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <motion.section ref={heroRef} style={{ opacity: heroOpacity, y: heroY }} className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
        <div className="absolute inset-0">
          <ParticleCanvas className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020817]" />
          {/* Ambient glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-white/70 mb-8 border border-white/10"
          >
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            AI-powered · 9 marketplaces · 37 countries · Live data
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8 }}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.05] tracking-tight mb-6"
          >
            Find Products
            <br />
            <span className="text-gradient">in India.</span>
            <br />
            Sell Globally.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="text-lg sm:text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            AI discovers high-margin cross-border opportunities. Score demand, model profits, source suppliers, and launch optimised listings — all in one platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center mb-4"
          >
            <Link href="/register" className="btn-primary text-base px-10 py-4 min-h-0 rounded-xl shadow-xl shadow-violet-500/30">
              Scout your first product →
            </Link>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            className="text-white/50 text-sm mb-12"
          >
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

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30"
        >
          <span className="text-xs">Scroll to explore</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
        </motion.div>
      </motion.section>

      {/* ── Stats ───────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-2xl p-5 text-center relative overflow-hidden group hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'radial-gradient(circle at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
              <div className="text-3xl sm:text-4xl font-black text-gradient mb-1">{s.value}</div>
              <div className="text-xs text-white/60 leading-snug">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-sm text-violet-400 font-medium mb-3 uppercase tracking-widest">Platform capabilities</div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Everything you need to <span className="text-gradient">sell globally</span></h2>
            <p className="text-white/65 text-lg max-w-2xl mx-auto">From product discovery to live listing — the complete AI stack for cross-border sellers.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`glass-card rounded-2xl p-6 cursor-default bg-gradient-to-br ${f.color} transition-all duration-300 group`}
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-gradient transition-all">{f.title}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section id="how" className="py-24 px-6 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-sm text-cyan-400 font-medium mb-3 uppercase tracking-widest">Simple 3-step flow</div>
            <h2 className="text-4xl sm:text-5xl font-black">From idea to <span className="text-gradient-purple">first sale</span></h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: 'linear-gradient(90deg,transparent,rgba(124,58,237,0.4),transparent)' }} />
                <div className="text-5xl font-black mb-4 leading-none"
                  style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(99,102,241,0.1))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {s.n}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{s.desc}</p>
                {i < 2 && <div className="hidden md:block absolute top-8 -right-3 z-10 text-white/20 text-xl">→</div>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-sm text-emerald-400 font-medium mb-3 uppercase tracking-widest">Simple pricing</div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Full AI power for <span className="text-gradient">less than a coffee</span></h2>
            <p className="text-white/65 text-lg max-w-xl mx-auto">Start free — no credit card. Upgrade to Pro for $9/mo and unlock unlimited AI scans, full scoring, and live supplier data.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {PLANS.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative glass-card rounded-2xl p-7 flex flex-col overflow-hidden ${p.highlight ? 'border-violet-500/40 animate-pulse-glow' : ''}`}
              >
                {/* Accent top line */}
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: p.highlight ? 'linear-gradient(90deg,transparent,rgba(124,58,237,0.8),rgba(99,102,241,0.6),transparent)' : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }} />
                {/* Pro inner glow */}
                {p.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-24 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />
                )}
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-violet-500/40 z-10">
                    MOST POPULAR
                  </div>
                )}
                <div className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: p.highlight ? 'rgba(196,181,253,0.9)' : 'rgba(255,255,255,0.7)' }}>{p.name}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black text-white">{p.price}</span>
                  <span className="text-white/40 text-sm">{p.period}</span>
                </div>
                {p.highlight && (
                  <div className="text-xs text-emerald-400/80 mb-2">7-day free trial · Cancel anytime</div>
                )}
                <p className="text-white/65 text-sm mb-6">{p.desc}</p>
                <ul className="space-y-2.5 flex-1 mb-7">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/80">
                      <span className="text-emerald-400 text-base flex-shrink-0">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href={p.ctaHref}
                  className={p.highlight
                    ? 'btn-primary text-sm justify-center min-h-0 py-3'
                    : 'inline-flex items-center justify-center text-sm py-3 px-6 rounded-xl font-semibold text-white border-2 border-white/35 hover:border-violet-400/70 hover:bg-violet-500/8 hover:text-white transition-all duration-200 w-full'}>
                  {p.cta}
                </Link>
              </motion.div>
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center text-white/50 text-xs mt-6">
            No credit card required for Starter · Pro includes a 7-day free trial · Prices in USD
          </motion.p>
        </div>
      </section>

      {/* ── Install / PWA ───────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto glass-card rounded-3xl p-8 sm:p-12 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-4xl mb-4">📱</div>
            <h2 className="text-3xl font-black mb-3">Available on every device</h2>
            <p className="text-white/65 mb-8 max-w-lg mx-auto">Install SellBodr as an app on Android, iOS, Mac, or Windows — works offline, loads instantly.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Android / Chrome — clickable if prompt available */}
              {installPrompt ? (
                <button onClick={handleInstall}
                  className="glass rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-white/70 hover:bg-violet-500/10 hover:border-violet-500/30 border border-transparent transition-all touch-manipulation">
                  <span className="text-2xl">🤖</span>
                  <div className="text-left">
                    <div className="font-semibold text-white text-xs">Android / Chrome</div>
                    <div className="text-violet-400/80 text-xs">Tap here to install now ↓</div>
                  </div>
                </button>
              ) : (
                <div className="glass rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-white/70">
                  <span className="text-2xl">🤖</span>
                  <div className="text-left">
                    <div className="font-semibold text-white text-xs">Android</div>
                    <div className="text-white/40 text-xs">Menu → Add to Home Screen</div>
                  </div>
                </div>
              )}

              {/* iPhone / iPad — always instructions */}
              <div className="glass rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-white/70">
                <span className="text-2xl"></span>
                <div className="text-left">
                  <div className="font-semibold text-white text-xs">iPhone / iPad</div>
                  <div className="text-white/40 text-xs">Safari → Share ↑ → Add to Home</div>
                </div>
              </div>

              {/* Desktop — clickable if prompt available */}
              {installPrompt ? (
                <button onClick={handleInstall}
                  className="glass rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-white/70 hover:bg-violet-500/10 hover:border-violet-500/30 border border-transparent transition-all touch-manipulation">
                  <span className="text-2xl">💻</span>
                  <div className="text-left">
                    <div className="font-semibold text-white text-xs">Desktop</div>
                    <div className="text-violet-400/80 text-xs">Tap here to install now ↓</div>
                  </div>
                </button>
              ) : (
                <div className="glass rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-white/70">
                  <span className="text-2xl">💻</span>
                  <div className="text-left">
                    <div className="font-semibold text-white text-xs">Desktop</div>
                    <div className="text-white/40 text-xs">Chrome → Install App icon ↑</div>
                  </div>
                </div>
              )}
            </div>

            {/* Windows .exe download */}
            <div className="mt-4 pt-4 border-t border-white/8 flex justify-center">
              <a
                href="https://github.com/MoshayM/SellBodr/releases/latest/download/SellBodr-Setup.exe"
                className="glass rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-white/70 hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent transition-all"
                download
              >
                <span className="text-2xl">🪟</span>
                <div className="text-left">
                  <div className="font-semibold text-white text-xs">Windows Desktop App</div>
                  <div className="text-blue-400/80 text-xs">Download .exe installer (64-bit)</div>
                </div>
              </a>
            </div>

            {isInstalled && (
              <p className="mt-4 text-sm text-emerald-400 font-medium">✓ SellBodr is installed on this device</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/20 via-indigo-900/20 to-cyan-900/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-5xl sm:text-6xl font-black mb-6 leading-tight">
            Start scouting <span className="text-gradient">today</span>
          </h2>
          <p className="text-white/65 text-lg mb-10">AI-powered intelligence to source in India and sell on the world's top marketplaces.</p>
          <Link href="/register" className="btn-primary text-lg px-10 py-5 min-h-0 rounded-2xl shadow-2xl shadow-violet-500/30 inline-flex">
            Start scouting →
          </Link>
          <p className="text-white/50 text-sm mt-5">Free to start · No credit card · Cancel anytime</p>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon.svg" alt="SellBodr" className="w-7 h-7"
              style={{ filter: 'drop-shadow(0 0 5px rgba(124,58,237,0.6))' }} />
            <span className="font-bold text-white">SellBodr</span>
          </div>
          <p className="text-white/25 text-sm">&copy; {new Date().getFullYear()} SellBodr. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-white/55">
            <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
