'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ParticleCanvas } from '@/components/ui/ParticleCanvas';

const FEATURES = [
  { icon: '🎯', title: 'AI Opportunity Scoring', desc: 'Every product scored 0–100 across demand, competition, margin, and trend — instantly.', color: 'from-violet-500/20 to-purple-500/10' },
  { icon: '💰', title: 'Landed-Cost Profit Model', desc: 'Full P&L: product cost + freight + duties + marketplace fees + ads = real net profit.', color: 'from-emerald-500/20 to-green-500/10' },
  { icon: '🔬', title: 'Deep Market Research', desc: 'Competitor analysis, review mining, price trends, and saturation scores across 76 markets.', color: 'from-cyan-500/20 to-blue-500/10' },
  { icon: '🏭', title: 'India Supplier Sourcing', desc: 'Verified IndiaMART & Alibaba suppliers with MOQ, lead time, and export capability data.', color: 'from-orange-500/20 to-amber-500/10' },
  { icon: '📈', title: 'Trend Intelligence', desc: 'Google Trends, seasonal demand, and rising search queries across all target countries.', color: 'from-pink-500/20 to-rose-500/10' },
  { icon: '🚀', title: 'AI Launch Assets', desc: 'SEO-optimised title, bullets, description, keywords, and pricing — ready to publish.', color: 'from-indigo-500/20 to-blue-500/10' },
];

const CARDS = [
  { product: 'Brass Diyas Set', score: 91, market: 'Amazon US', profit: '+$18.40', trend: '+34%', badge: 'bg-emerald-500' },
  { product: 'Pashmina Shawl', score: 87, market: 'Etsy UK', profit: '+$22.10', trend: '+28%', badge: 'bg-violet-500' },
  { product: 'Marble Coasters', score: 83, market: 'Amazon DE', profit: '+$14.80', trend: '+19%', badge: 'bg-cyan-500' },
];

const STEPS = [
  { n: '01', title: 'Enter a product idea', desc: 'Type any product category or keyword. SellBodr searches 10,000+ India-sourced products.' },
  { n: '02', title: 'AI scores every opportunity', desc: 'Our 7-dimension AI engine scores demand, competition, margin, trend, shipping fit, and more.' },
  { n: '03', title: 'Launch with confidence', desc: 'Get supplier contacts, profit models, and AI-written listings — ready to publish in hours.' },
];

const PLANS = [
  { name: 'Starter', price: 'Free', period: '', desc: 'For individuals exploring cross-border opportunities', features: ['5 AI searches / month', '10 opportunity scores', 'Basic profit calculator', 'Email support'], cta: 'Get Started Free', highlight: false },
  { name: 'Pro', price: '$49', period: '/mo', desc: 'For serious sellers scaling globally', features: ['Unlimited AI searches', 'Full 7-dimension scoring', 'Supplier sourcing', 'AI listing generator', 'Priority support', 'Export reports'], cta: 'Start Free Trial', highlight: true },
  { name: 'Enterprise', price: 'Custom', period: '', desc: 'For agencies and large catalogues', features: ['Everything in Pro', 'API access', 'White-label reports', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee'], cta: 'Contact Sales', highlight: false },
];

const STATS = [
  { value: '10K+', label: 'Products analysed' },
  { value: '76', label: 'Marketplaces covered' },
  { value: '$2.4M', label: 'Seller profits tracked' },
  { value: '48h', label: 'From search to launch' },
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
          <span className="text-xs text-white/50 font-medium">OPPORTUNITY</span>
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

export default function LandingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.25], [0, -60]);

  useEffect(() => {
    const token = localStorage.getItem('bs_access_token');
    if (token) { router.replace('/opportunities'); } else { setChecked(true); }
  }, [router]);

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
        <div className="flex items-center gap-2.5">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-8 h-8 rounded-lg shadow-lg shadow-violet-500/30" />
          <span className="font-bold text-lg text-white">SellBodr</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2 hidden sm:block">Sign in</Link>
          <Link href="/register" className="btn-primary text-sm px-5 py-2.5 min-h-0 rounded-lg shadow-lg shadow-violet-500/30">
            Start Free →
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
            AI-powered · 76 marketplaces · Live data
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
            className="flex flex-col sm:flex-row gap-3 justify-center mb-16"
          >
            <Link href="/register" className="btn-primary text-base px-8 py-4 min-h-0 rounded-xl shadow-xl shadow-violet-500/30 text-center">
              Start Free Trial — No card needed
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-4 min-h-0 rounded-xl text-center">
              Sign In →
            </Link>
          </motion.div>

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
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl font-black text-gradient mb-1">{s.value}</div>
              <div className="text-sm text-white/40">{s.label}</div>
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
            <p className="text-white/40 text-lg max-w-2xl mx-auto">From product discovery to live listing — the complete AI stack for cross-border sellers.</p>
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
                <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
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
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="text-6xl font-black text-white/5 mb-4">{s.n}</div>
                <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                <p className="text-white/40 leading-relaxed">{s.desc}</p>
                {i < 2 && <div className="hidden md:block absolute top-8 right-0 translate-x-1/2 text-white/15 text-2xl">→</div>}
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
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Start free, <span className="text-gradient">scale fast</span></h2>
            <p className="text-white/40 text-lg">No credit card required for Starter. Cancel Pro anytime.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative glass-card rounded-2xl p-7 flex flex-col ${p.highlight ? 'border-violet-500/50 animate-pulse-glow' : ''}`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    MOST POPULAR
                  </div>
                )}
                <div className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-2">{p.name}</div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black text-white">{p.price}</span>
                  <span className="text-white/40 text-sm">{p.period}</span>
                </div>
                <p className="text-white/40 text-sm mb-6">{p.desc}</p>
                <ul className="space-y-2.5 flex-1 mb-7">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                      <span className="text-emerald-400 text-base flex-shrink-0">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href="/register"
                  className={p.highlight ? 'btn-primary text-sm justify-center min-h-0 py-3' : 'btn-secondary text-sm justify-center min-h-0 py-3'}>
                  {p.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Install / PWA ───────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto glass-card rounded-3xl p-8 sm:p-12 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-4xl mb-4">📱</div>
            <h2 className="text-3xl font-black mb-3">Available on every device</h2>
            <p className="text-white/40 mb-8 max-w-lg mx-auto">Install SellBodr as an app on Android, iOS, Mac, or Windows — works offline, loads instantly.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="glass rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-white/70">
                <span className="text-2xl">🤖</span>
                <div className="text-left">
                  <div className="font-semibold text-white text-xs">Android</div>
                  <div className="text-white/40 text-xs">Tap "Add to Home Screen"</div>
                </div>
              </div>
              <div className="glass rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-white/70">
                <span className="text-2xl"></span>
                <div className="text-left">
                  <div className="font-semibold text-white text-xs">iPhone / iPad</div>
                  <div className="text-white/40 text-xs">Safari → Share → Add to Home</div>
                </div>
              </div>
              <div className="glass rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-white/70">
                <span className="text-2xl">💻</span>
                <div className="text-left">
                  <div className="font-semibold text-white text-xs">Desktop</div>
                  <div className="text-white/40 text-xs">Chrome → Install App icon</div>
                </div>
              </div>
            </div>
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
          <p className="text-white/40 text-lg mb-10">Join 500+ sellers discovering India's best cross-border opportunities with AI.</p>
          <Link href="/register" className="btn-primary text-lg px-10 py-5 min-h-0 rounded-2xl shadow-2xl shadow-violet-500/30 inline-flex">
            Create Free Account →
          </Link>
          <p className="text-white/25 text-sm mt-5">No credit card · Cancel anytime · Free forever plan</p>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon.svg" alt="SellBodr" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-white">SellBodr</span>
          </div>
          <p className="text-white/25 text-sm">&copy; {new Date().getFullYear()} SellBodr. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
