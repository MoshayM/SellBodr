'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ── Guide content ─────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'scout',
    icon: '🔭',
    title: 'Scout the Market',
    color: 'from-violet-500/20 to-purple-500/10',
    accent: 'text-violet-400',
    border: 'border-violet-500/20',
    steps: [
      { title: 'Go to Scout', body: 'Navigate to the Scout page from the left sidebar. This is your main search hub.' },
      { title: 'Pick a marketplace', body: 'Select your target marketplace (Amazon US/UK/DE/CA/AU, Etsy, eBay, Walmart, TikTok Shop) from the dropdown.' },
      { title: 'Enter a product idea', body: 'Type any product keyword — "brass diyas", "yoga mat", "handmade candles". The more specific, the better.' },
      { title: 'Watch the AI scan', body: 'Click Scan. A live 7-stage progress panel shows exactly what the AI is doing: Discovering → Demand → Competition → Suppliers → Profit → Scoring → Verdicts.' },
      { title: 'Browse results', body: 'Results appear as cards ranked by Opportunity Score. Each card shows score, recommendation badge, net profit estimate, and key sub-scores.' },
    ],
  },
  {
    id: 'scores',
    icon: '🎯',
    title: 'Understanding Opportunity Scores',
    color: 'from-emerald-500/20 to-green-500/10',
    accent: 'text-emerald-400',
    border: 'border-emerald-500/20',
    steps: [
      { title: 'The Opportunity Score (0–100)', body: 'A composite score across 7 dimensions. 80+ = strong opportunity. 60–79 = promising. Below 60 = proceed with caution.' },
      { title: 'Demand score', body: 'How much buyers are searching for this product right now. Based on search volume, trend direction, and seasonal patterns.' },
      { title: 'Competition score', body: 'How crowded the market is. Lower seller count and review count = higher score.' },
      { title: 'Margin score', body: 'Net profit after product cost, freight, import duties, marketplace fees, and estimated ad spend.' },
      { title: 'Launch / Hold / Reject', body: 'The AI verdict. Launch = all key metrics pass. Hold = some risk factors present. Reject = does not meet profitability thresholds.' },
      { title: 'Confidence %', body: 'How certain the AI is about its verdict. Above 80% means the data is strong and consistent across sources.' },
    ],
  },
  {
    id: 'more',
    icon: '🎯',
    title: 'New Scan vs. Scan for More',
    color: 'from-cyan-500/20 to-blue-500/10',
    accent: 'text-cyan-400',
    border: 'border-cyan-500/20',
    steps: [
      { title: 'New Scan (top purple button)', body: 'Runs a broad AI discovery across all categories and trend profiles for the selected marketplace. Best for exploring new product ideas without constraints.' },
      { title: 'Scan for More (bottom button) — smart mode', body: 'When you have active filters (category, trend strength 🔥 Hot/📈 Rising, or channel), the bottom button turns purple and changes label — e.g. "Scan More 🔥 Hot · Wall Art 🎯". The AI narrows its search to exactly what you are filtering for.' },
      { title: 'No filters active?', body: 'If no filters are set, "Scan for More ↓" runs a broad scan just like New Scan — adding more diverse results to the existing list.' },
      { title: 'Filter results', body: 'Use the filter bar (Opportunity score/signal, Category, Source channel, Trend strength, Date range) to narrow the visible list. Active filters also guide the Scan for More AI.' },
      { title: 'Result limits', body: 'Free accounts see up to 10 results per marketplace. A 🔒 tag shows how many are locked. Pro users see all results and can run unlimited Scan for More passes.' },
    ],
  },
  {
    id: 'suppliers',
    icon: '🏭',
    title: 'Suppliers & the Global Map',
    color: 'from-orange-500/20 to-amber-500/10',
    accent: 'text-amber-400',
    border: 'border-amber-500/20',
    steps: [
      { title: 'Open an opportunity', body: 'Click any opportunity card to open the full detail page. Switch to the Suppliers tab to see all sourcing candidates.' },
      { title: 'Read the supplier table', body: 'Each row shows supplier name, country 🇮🇳, platform (IndiaMART, Alibaba…), unit cost, trust score, MOQ, lead time, and ease rating.' },
      { title: 'View a supplier profile', body: 'Click a row or the View button to open the Supplier Profile drawer — full contact details, outreach tools (email, WhatsApp), and RFQ generator.' },
      { title: 'Search More Suppliers', body: 'Scroll below the table and click "🔍 Search More Suppliers" to fetch additional candidates. Pro users get unlimited results; free users are capped at 10 per product.' },
      { title: 'Expand the map', body: 'The Global Supplier Map below the table shows every supplier pinned on a live map. Click "Expand Map" for a full-screen view.' },
      { title: 'Satellite & precise location', body: 'Inside the map, click "🛰 Satellite" to switch to aerial view. Click any pin for 5-decimal GPS coordinates and direct Google Maps links.' },
    ],
  },
  {
    id: 'profit',
    icon: '💰',
    title: 'Profitability Model',
    color: 'from-pink-500/20 to-rose-500/10',
    accent: 'text-pink-400',
    border: 'border-pink-500/20',
    steps: [
      { title: 'Open Profitability tab', body: 'On any opportunity detail page, click the Profitability tab to see the full cost waterfall.' },
      { title: 'Cost waterfall chart', body: 'A butterfly chart shows: Sale Price → Source Cost → Shipping → Packaging → Import Duty → Landed Cost → Marketplace Fees → Ad Spend → Net Profit.' },
      { title: 'Net margin & ROI', body: 'The summary shows net margin %, ROI on sourcing cost, breakeven units, and monthly/annual profit projection at 50 sales/month.' },
      { title: 'Duty & compliance', body: 'The Research tab shows import duty rates, HS codes, GST, DGFT status, and required export documentation for your product category.' },
    ],
  },
  {
    id: 'launch',
    icon: '🚀',
    title: 'AI Launch Assets',
    color: 'from-indigo-500/20 to-blue-500/10',
    accent: 'text-indigo-400',
    border: 'border-indigo-500/20',
    steps: [
      { title: 'Generate assets', body: 'On any opportunity detail page, click "✨ Generate Launch Assets" at the top right. The AI writes everything for the selected marketplace.' },
      { title: 'Listing tab', body: 'Go to the Listing tab to see the full AI-written title, 5 bullet points, product description, and a backend keyword list — all SEO-optimised.' },
      { title: 'Ads tab', body: 'The Ads tab generates a PPC campaign structure: suggested bids, exact/broad/phrase match keywords, and ad copy for sponsored product ads.' },
      { title: 'Copy & publish', body: 'Use the Copy buttons to paste directly into Amazon Seller Central, Etsy, or whichever marketplace you selected. No reformatting needed.' },
    ],
  },
  {
    id: 'account',
    icon: '⚙️',
    title: 'Plans, Credits & Account',
    color: 'from-slate-500/20 to-gray-500/10',
    accent: 'text-slate-400',
    border: 'border-slate-500/20',
    steps: [
      { title: 'Free plan', body: 'Free accounts get up to 5 AI product scans, see the top 10 results per scan, view all 7 sub-scores, access the supplier list, and use the profit calculator. No credit card required.' },
      { title: 'Pro plan ($9/mo)', body: 'Pro unlocks unlimited AI scans, all results per scan, the full supplier map, profitability waterfall, and advanced research tools. Upgrade from the avatar menu.' },
      { title: 'AI Generation Credits ($5 = 10 credits)', body: 'Generating AI content — Full Reports, Ad Campaigns, Brand Identity, Listing Copy, Growth Playbooks, or Bundle Strategy — costs 1 credit per generation. Buy 10 credits for $5 from the credits chip in the sidebar or any "Buy Credits" prompt. Admin accounts always generate for free.' },
      { title: 'Upgrade', body: 'Click any 🔒 locked feature or open the avatar menu and tap "Upgrade to Pro". Credits can be purchased separately at any time — they never expire.' },
      { title: 'Settings', body: 'Go to Settings → Marketplaces to enable/disable target markets. Admins can manage AI provider keys under Settings → AI Keys.' },
    ],
  },
];

const QUICK_QUESTIONS = [
  'How do I run my first product search?',
  'What does the Opportunity Score mean?',
  'How does Scan for More with filters work?',
  'How do AI generation credits work?',
  'How do I contact a supplier?',
  'What is included in the Pro plan?',
  'How does the profit model work?',
  'What is the Launch / Hold / Reject verdict?',
  'How do I generate an AI listing?',
  'How do I buy credits for AI generation?',
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Message = { role: 'user' | 'assistant'; content: string };

// ── AI Chat Panel ─────────────────────────────────────────────────────────────
function GuideChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [charWarn, setCharWarn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const MAX_CHARS = 600;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    if (q.length > MAX_CHARS) { setCharWarn(true); return; }
    setCharWarn(false);
    setInput('');

    const next: Message[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/guide/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history: messages.slice(-6) }),
      });
      const data = await res.json().catch(() => ({ answer: 'Something went wrong. Please try again.' }));
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'Sorry, no response.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please check your connection and try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — mobile only */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed z-50 bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] max-w-[420px] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{ maxHeight: 'calc(100dvh - 8rem)', background: 'rgba(8,12,30,0.97)', border: '1px solid rgba(124,58,237,0.25)', backdropFilter: 'blur(20px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0"
              style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.1))' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                  ✦
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">SellBodr Guide AI</div>
                  <div className="text-[10px] text-white/40 leading-none">Ask anything about the app</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button onClick={() => setMessages([])}
                    className="text-[10px] text-white/30 hover:text-white/60 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                    Clear
                  </button>
                )}
                <button onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none">
                  ×
                </button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="px-4 py-2 text-[10px] text-white/30 leading-snug border-b border-white/5 shrink-0">
              AI responses are for guidance only. Not financial or legal advice.{' '}
              <Link href="/terms" className="underline hover:text-white/50">Terms</Link>
              {' · '}
              <Link href="/privacy" className="underline hover:text-white/50">Privacy</Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <p className="text-xs text-white/40 text-center leading-snug">
                    Ask me anything about using SellBodr
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {QUICK_QUESTIONS.map(q => (
                      <button key={q} onClick={() => send(q)}
                        className="text-left text-xs px-3 py-2 rounded-lg text-white/55 hover:text-white border border-white/8 hover:border-violet-500/30 hover:bg-violet-500/8 transition-all leading-snug">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mr-2 mt-0.5 self-start"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                      ✦
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'text-white rounded-br-sm'
                      : 'text-white/80 border border-white/8 rounded-bl-sm'
                  }`}
                    style={m.role === 'user'
                      ? { background: 'linear-gradient(135deg,rgba(124,58,237,0.85),rgba(79,70,229,0.85))' }
                      : { background: 'rgba(255,255,255,0.04)' }
                    }>
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mr-2 mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                    ✦
                  </div>
                  <div className="px-3.5 py-3 rounded-2xl rounded-bl-sm border border-white/8"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-white/8 shrink-0">
              {charWarn && (
                <p className="text-[10px] text-rose-400 mb-1.5">Question is too long (max {MAX_CHARS} characters)</p>
              )}
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => { setInput(e.target.value); if (charWarn) setCharWarn(false); }}
                    onKeyDown={handleKey}
                    placeholder="Ask about SellBodr…"
                    rows={1}
                    maxLength={MAX_CHARS + 20}
                    disabled={loading}
                    className="w-full resize-none bg-white/5 border border-white/10 focus:border-violet-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors leading-snug disabled:opacity-50"
                    style={{ maxHeight: '100px', overflowY: 'auto' }}
                    onInput={e => {
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
                    }}
                  />
                  {input.length > MAX_CHARS * 0.8 && (
                    <span className={`absolute bottom-1.5 right-2 text-[9px] tabular-nums ${input.length >= MAX_CHARS ? 'text-rose-400' : 'text-white/25'}`}>
                      {input.length}/{MAX_CHARS}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => send(input)}
                  disabled={loading || !input.trim()}
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-[9px] text-white/20 mt-1.5 text-center leading-snug">
                Only answers questions about the SellBodr app · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GuidePage() {
  const [active, setActive]     = useState('scout');
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#020817] text-white">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 lg:px-12 h-16 border-b border-white/5"
        style={{ background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(12px)' }}>
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-8 h-8"
            style={{ filter: 'drop-shadow(0 0 7px rgba(124,58,237,0.7))' }} />
          <span className="text-sm font-black text-white/80 group-hover:text-white transition-colors">SellBodr</span>
          <span className="text-white/20 text-sm">/</span>
          <span className="text-sm font-semibold text-white/50">User Guide</span>
        </Link>
        <div className="flex items-center gap-3">
          {/* Ask AI — nav button */}
          <button
            onClick={() => setChatOpen(o => !o)}
            className={`hidden sm:flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg border transition-all ${
              chatOpen
                ? 'border-violet-500/50 text-violet-300 bg-violet-500/10'
                : 'border-white/10 text-white/60 hover:border-violet-500/30 hover:text-violet-300 hover:bg-violet-500/8'
            }`}>
            <span>✦</span>
            Ask AI
          </button>
          <Link href="/opportunities" className="text-sm text-white/50 hover:text-white transition-colors hidden sm:block">Open App</Link>
          <Link href="/register" className="text-xs px-4 py-2 rounded-lg font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            Get Started →
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20 flex gap-8">

        {/* Sidebar TOC */}
        <aside className="hidden lg:flex flex-col gap-1 w-56 shrink-0 sticky top-28 self-start">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-3 px-3">Contents</p>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => {
              setActive(s.id);
              document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${active === s.id
                ? 'bg-white/8 text-white font-semibold'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}>
              <span className="mr-2">{s.icon}</span>{s.title}
            </button>
          ))}
          <div className="mt-6 pt-4 border-t border-white/8 space-y-1">
            <Link href="/opportunities"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-violet-400 hover:bg-violet-500/10 transition-all font-semibold">
              Open Scout →
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-12">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-white/50 border border-white/10 mb-5">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
              SellBodr User Guide
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
              How to use{' '}
              <span style={{ background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                SellBodr
              </span>
            </h1>
            <p className="text-white/45 text-lg leading-relaxed max-w-2xl">
              Everything you need to find products in India and sell them profitably on global marketplaces — from your first search to your first sale.
            </p>

            {/* AI search call-to-action banner */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => setChatOpen(true)}
              className="mt-6 w-full sm:max-w-xl flex items-center gap-3 px-4 py-3.5 rounded-xl border border-violet-500/25 hover:border-violet-500/50 transition-all group text-left"
              style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(79,70,229,0.04))' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition-transform group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                ✦
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">Ask the Guide AI anything</div>
                <div className="text-xs text-white/35 truncate">How does the Opportunity Score work? How do I contact a supplier?…</div>
              </div>
              <div className="text-xs text-violet-400 font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform">Ask →</div>
            </motion.button>
          </motion.div>

          {/* Quick links — mobile */}
          <div className="lg:hidden flex flex-wrap gap-2">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-all">
                {s.icon} {s.title}
              </button>
            ))}
          </div>

          {/* Sections */}
          {SECTIONS.map((section, si) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: 0.05 }}
              onViewportEnter={() => setActive(section.id)}
              className={`rounded-2xl border bg-gradient-to-br ${section.color} ${section.border} p-6 sm:p-8`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl">{section.icon}</div>
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${section.accent} mb-0.5`}>
                    Step {si + 1} of {SECTIONS.length}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">{section.title}</h2>
                </div>
              </div>

              <div className="space-y-4">
                {section.steps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5 ${section.accent} border border-current opacity-60`}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white mb-1">{step.title}</div>
                      <p className="text-sm text-white/55 leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Per-section quick ask */}
              <button
                onClick={() => { setChatOpen(true); }}
                className={`mt-5 text-xs flex items-center gap-1.5 ${section.accent} opacity-60 hover:opacity-100 transition-opacity`}>
                <span>✦</span>
                <span>Have a question about {section.title.toLowerCase()}? Ask the Guide AI →</span>
              </button>
            </motion.section>
          ))}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-violet-500/20 p-8 text-center"
            style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(79,70,229,0.06))' }}
          >
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-2xl font-black text-white mb-3">Ready to scout your first opportunity?</h2>
            <p className="text-white/45 mb-6 max-w-md mx-auto">
              Free account takes 30 seconds. No credit card. Start finding products to sell globally today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register"
                className="px-6 py-3 rounded-xl font-bold text-white text-sm shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                Create Free Account →
              </Link>
              <Link href="/opportunities"
                className="px-6 py-3 rounded-xl font-semibold text-white/70 text-sm border border-white/10 hover:bg-white/5 hover:text-white transition-all">
                Open Scout
              </Link>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center">
        <p className="text-white/45 text-sm">
          <Link href="/" className="hover:text-white/50 transition-colors">SellBodr</Link>
          {' · '}
          <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
          {' · '}
          <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
        </p>
      </footer>

      {/* Floating Ask AI button */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl font-semibold text-sm text-white shadow-xl shadow-violet-500/30 transition-shadow hover:shadow-violet-500/50"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            <span className="text-base leading-none">✦</span>
            <span>Ask Guide AI</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <GuideChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
