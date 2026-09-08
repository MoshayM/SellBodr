'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ── Guide content ─────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'scout',
    icon: '🔭',
    title: 'Scout the Market',
    accent: '#a78bfa',
    accentBg: 'rgba(124,58,237,0.12)',
    accentBorder: 'rgba(124,58,237,0.2)',
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
    accent: '#34d399',
    accentBg: 'rgba(16,185,129,0.10)',
    accentBorder: 'rgba(16,185,129,0.2)',
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
    icon: '⚡',
    title: 'New Scan vs. Scan for More',
    accent: '#38bdf8',
    accentBg: 'rgba(6,182,212,0.10)',
    accentBorder: 'rgba(6,182,212,0.2)',
    steps: [
      { title: 'New Scan (top purple button)', body: 'Runs a broad AI discovery across all categories and trend profiles for the selected marketplace. Best for exploring new product ideas without constraints.' },
      { title: 'Scan for More — smart mode', body: 'When you have active filters (category, trend strength 🔥 Hot/📈 Rising, or channel), the bottom button turns purple and narrows its search to exactly what you are filtering for.' },
      { title: 'No filters active?', body: 'If no filters are set, "Scan for More ↓" runs a broad scan just like New Scan — adding more diverse results to the existing list.' },
      { title: 'Filter results', body: 'Use the filter bar (Opportunity score/signal, Category, Source channel, Trend strength, Date range) to narrow the visible list. Active filters also guide the Scan for More AI.' },
      { title: 'Result limits', body: 'Each scan returns up to 8 results — the highest-scoring products after AI validation. Free accounts are limited to 5 total scans. Pro users run unlimited scans.' },
    ],
  },
  {
    id: 'suppliers',
    icon: '🏭',
    title: 'Suppliers & the Global Map',
    accent: '#fbbf24',
    accentBg: 'rgba(245,158,11,0.10)',
    accentBorder: 'rgba(245,158,11,0.2)',
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
    accent: '#f472b6',
    accentBg: 'rgba(236,72,153,0.10)',
    accentBorder: 'rgba(236,72,153,0.2)',
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
    accent: '#818cf8',
    accentBg: 'rgba(99,102,241,0.10)',
    accentBorder: 'rgba(99,102,241,0.2)',
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
    title: 'Plans & Account',
    accent: '#94a3b8',
    accentBg: 'rgba(148,163,184,0.08)',
    accentBorder: 'rgba(148,163,184,0.15)',
    steps: [
      { title: 'Free plan', body: 'Free accounts get up to 5 AI product scans (up to 8 results each), full 7-dimension Opportunity Score, supplier list (up to 10 per product), and profit calculator. No credit card required.' },
      { title: 'Pro plan', body: 'Pro unlocks unlimited AI scans, premium AI models (Claude + Groq + Mistral) for higher quality results, full supplier list with no cap, all dashboard tools, and priority support. India users get ₹99/mo; other countries see the USD rate.' },
      { title: 'Upgrade to Pro', body: 'Click the "Upgrade to Pro" button in the sidebar, or click any 🔒 locked feature. Payment is processed securely via Razorpay — no mobile number required.' },
      { title: 'Settings', body: 'Go to Settings → Marketplaces to enable/disable target markets. Change your password or manage passkeys under Settings → Security.' },
    ],
  },
];

const QUICK_QUESTIONS = [
  'How do I run my first product search?',
  'What does the Opportunity Score mean?',
  'How does Scan for More with filters work?',
  'What is included in the Pro plan?',
  'How do I contact a supplier?',
  'How does the profit model work?',
  'What is the Launch / Hold / Reject verdict?',
  'How do I generate an AI listing?',
  'How do I upgrade to Pro?',
  'How do I read the supplier map?',
];

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
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
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
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed z-50 bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] max-w-[420px] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{ maxHeight: 'calc(100dvh - 8rem)', background: 'rgba(8,14,35,0.98)', border: '1px solid rgba(124,58,237,0.28)', backdropFilter: 'blur(24px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'linear-gradient(135deg,rgba(124,58,237,0.18),rgba(79,70,229,0.08))' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>✦</div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">SellBodr Guide AI</div>
                  <div className="text-[10px] leading-none" style={{ color: 'rgba(255,255,255,0.35)' }}>Ask anything about the app</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button onClick={() => setMessages([])}
                    className="text-[10px] px-2 py-1 rounded-lg transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                    Clear
                  </button>
                )}
                <button onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-lg leading-none transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}>
                  ×
                </button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="px-4 py-2 text-[10px] leading-snug border-b shrink-0"
              style={{ color: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.05)' }}>
              AI responses are for guidance only. Not financial or legal advice.{' '}
              <Link href="/terms" className="underline hover:opacity-70">Terms</Link>
              {' · '}
              <Link href="/privacy" className="underline hover:opacity-70">Privacy</Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <p className="text-xs text-center leading-snug" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Ask me anything about using SellBodr
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {QUICK_QUESTIONS.map(q => (
                      <button key={q} onClick={() => send(q)}
                        className="text-left text-xs px-3 py-2 rounded-lg transition-all leading-snug"
                        style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.35)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
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
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>✦</div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user' ? 'text-white rounded-br-sm' : 'rounded-bl-sm'
                  }`}
                    style={m.role === 'user'
                      ? { background: 'linear-gradient(135deg,rgba(124,58,237,0.85),rgba(79,70,229,0.85))' }
                      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)' }
                    }>
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mr-2 mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>✦</div>
                  <div className="px-3.5 py-3 rounded-2xl rounded-bl-sm"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="flex gap-1 items-center">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {charWarn && <p className="text-[10px] text-rose-400 mb-1.5">Question is too long (max {MAX_CHARS} characters)</p>}
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
                    className="w-full resize-none rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all leading-snug disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '100px', overflowY: 'auto' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
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
              <p className="text-[9px] mt-1.5 text-center leading-snug" style={{ color: 'rgba(255,255,255,0.18)' }}>
                Only answers questions about SellBodr · Shift+Enter for new line
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
  const router = useRouter();
  const [active, setActive]     = useState('scout');
  const [chatOpen, setChatOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('bs_access_token'));
  }, []);

  function handleClose() {
    if (window.history.length > 1) router.back();
    else router.push('/opportunities');
  }

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg,#0D1B35 0%,#0a1120 100%)' }}>

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 lg:px-10 h-16"
        style={{ background: 'rgba(13,27,53,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>

        {/* Brand */}
        <Link href={isLoggedIn ? '/opportunities' : '/'} className="flex items-center gap-2.5 group">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-8 h-8 transition-transform duration-200 group-hover:scale-105"
            style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.8)) brightness(1.15)' }} />
          <div className="flex items-center gap-2">
            <span className="text-sm font-black" style={{ color: '#fff' }}>SellBodr</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>User Guide</span>
          </div>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setChatOpen(o => !o)}
            className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
            style={chatOpen
              ? { background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.45)', color: '#c4b5fd' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}>
            <span>✦</span>
            Ask AI
          </button>

          {isLoggedIn ? (
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}>
              <span style={{ fontSize: '16px', lineHeight: 1 }}>×</span>
              <span>Close</span>
            </button>
          ) : (
            <Link href="/register"
              className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}>
              Get Started →
            </Link>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 pt-28 pb-20 flex gap-8">

        {/* Sidebar TOC */}
        <aside className="hidden lg:flex flex-col gap-0.5 w-52 shrink-0 sticky top-28 self-start">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Contents</p>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => {
              setActive(s.id);
              document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
              className="text-left px-3 py-2 rounded-xl text-sm transition-all"
              style={active === s.id
                ? { background: 'rgba(124,58,237,0.15)', color: '#fff', fontWeight: 600, border: '1px solid rgba(124,58,237,0.25)' }
                : { color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }}
              onMouseOver={e => { if (active !== s.id) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}}
              onMouseOut={e => { if (active !== s.id) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}}>
              <span className="mr-2">{s.icon}</span>{s.title}
            </button>
          ))}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <Link href="/opportunities"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ color: '#a78bfa' }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              Open Scout →
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-8">

          {/* Hero header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold mb-5"
              style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.28)', color: '#a78bfa' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#a78bfa' }} />
              SellBodr User Guide
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
              How to use{' '}
              <span style={{ background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                SellBodr
              </span>
            </h1>
            <p className="text-lg leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Everything you need to find products in India and sell them profitably on global marketplaces — from your first search to your first sale.
            </p>

            {/* AI ask banner */}
            <motion.button
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              onClick={() => setChatOpen(true)}
              className="mt-6 w-full sm:max-w-xl flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left group transition-all"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.22)' }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.45)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.12)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.22)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>✦</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">Ask the Guide AI anything</div>
                <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>How does the Opportunity Score work? How do I contact a supplier?…</div>
              </div>
              <div className="text-xs font-semibold shrink-0" style={{ color: '#a78bfa' }}>Ask →</div>
            </motion.button>
          </motion.div>

          {/* Mobile quick-links */}
          <div className="lg:hidden flex flex-wrap gap-2">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                {s.icon} {s.title}
              </button>
            ))}
          </div>

          {/* Sections */}
          {SECTIONS.map((section, si) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: 0.04 }}
              onViewportEnter={() => setActive(section.id)}
              className="rounded-2xl p-6 sm:p-8"
              style={{ background: section.accentBg, border: `1px solid ${section.accentBorder}` }}
            >
              {/* Section header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: `${section.accentBg}`, border: `1px solid ${section.accentBorder}` }}>
                  {section.icon}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: section.accent }}>
                    Step {si + 1} of {SECTIONS.length}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">{section.title}</h2>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {section.steps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                      style={{ color: section.accent, border: `1px solid ${section.accent}`, opacity: 0.65 }}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white mb-1">{step.title}</div>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick-ask link */}
              <button
                onClick={() => setChatOpen(true)}
                className="mt-5 text-xs flex items-center gap-1.5 transition-opacity opacity-50 hover:opacity-100"
                style={{ color: section.accent }}>
                <span>✦</span>
                <span>Have a question about {section.title.toLowerCase()}? Ask the Guide AI →</span>
              </button>
            </motion.section>
          ))}

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl p-8 text-center"
            style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.14),rgba(79,70,229,0.07))', border: '1px solid rgba(124,58,237,0.22)' }}
          >
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-2xl font-black text-white mb-3">Ready to scout your first opportunity?</h2>
            <p className="mb-6 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Free account takes 30 seconds. No credit card. Start finding products to sell globally today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isLoggedIn ? (
                <Link href="/opportunities"
                  className="px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
                  Go to Scout →
                </Link>
              ) : (
                <Link href="/register"
                  className="px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
                  Create Free Account →
                </Link>
              )}
              <Link href="/opportunities"
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{ color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; }}>
                Open Scout
              </Link>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.28)' }}>
          <Link href={isLoggedIn ? '/opportunities' : '/'} className="hover:opacity-60 transition-opacity">SellBodr</Link>
          {' · '}
          <Link href="/privacy" className="hover:opacity-60 transition-opacity">Privacy</Link>
          {' · '}
          <Link href="/terms" className="hover:opacity-60 transition-opacity">Terms</Link>
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
            className="fixed bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl font-semibold text-sm text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.45)' }}>
            <span className="text-base leading-none">✦</span>
            <span>Ask Guide AI</span>
          </motion.button>
        )}
      </AnimatePresence>

      <GuideChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
