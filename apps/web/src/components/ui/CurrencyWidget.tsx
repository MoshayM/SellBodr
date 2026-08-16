'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ── Currency catalogue ────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar',          flag: '🇺🇸', symbol: '$'   },
  { code: 'GBP', name: 'British Pound',      flag: '🇬🇧', symbol: '£'   },
  { code: 'EUR', name: 'Euro',               flag: '🇪🇺', symbol: '€'   },
  { code: 'INR', name: 'Indian Rupee',       flag: '🇮🇳', symbol: '₹'   },
  { code: 'AUD', name: 'Australian Dollar',  flag: '🇦🇺', symbol: 'A$'  },
  { code: 'CAD', name: 'Canadian Dollar',    flag: '🇨🇦', symbol: 'C$'  },
  { code: 'SGD', name: 'Singapore Dollar',   flag: '🇸🇬', symbol: 'S$'  },
  { code: 'AED', name: 'UAE Dirham',         flag: '🇦🇪', symbol: 'AED' },
  { code: 'JPY', name: 'Japanese Yen',       flag: '🇯🇵', symbol: '¥'   },
  { code: 'CNY', name: 'Chinese Yuan',       flag: '🇨🇳', symbol: '¥'   },
  { code: 'SAR', name: 'Saudi Riyal',        flag: '🇸🇦', symbol: 'SAR' },
  { code: 'MYR', name: 'Malaysian Ringgit',  flag: '🇲🇾', symbol: 'RM'  },
  { code: 'BRL', name: 'Brazilian Real',     flag: '🇧🇷', symbol: 'R$'  },
  { code: 'MXN', name: 'Mexican Peso',       flag: '🇲🇽', symbol: 'MX$' },
  { code: 'PLN', name: 'Polish Złoty',       flag: '🇵🇱', symbol: 'zł'  },
  { code: 'SEK', name: 'Swedish Krona',      flag: '🇸🇪', symbol: 'kr'  },
  { code: 'NOK', name: 'Norwegian Krone',    flag: '🇳🇴', symbol: 'kr'  },
  { code: 'KRW', name: 'South Korean Won',   flag: '🇰🇷', symbol: '₩'   },
  { code: 'THB', name: 'Thai Baht',          flag: '🇹🇭', symbol: '฿'   },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦', symbol: 'R'   },
];

const CODES = CURRENCIES.map(c => c.code);

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtVal(sym: string, val: number): string {
  if (!isFinite(val) || isNaN(val)) return '—';
  if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 10_000)    return `${sym}${(val / 1_000).toFixed(1)}K`;
  if (val >= 100)       return `${sym}${val.toFixed(0)}`;
  if (val >= 1)         return `${sym}${val.toFixed(2)}`;
  return `${sym}${val.toFixed(4)}`;
}

function timeAgo(d: Date): string {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 5)   return 'just now';
  if (s < 60)  return `${s}s ago`;
  if (s < 120) return '1 min ago';
  return `${Math.floor(s / 60)}m ago`;
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function CurrencyWidget() {
  const [open, setOpen]           = useState(false);
  const [amount, setAmount]       = useState('100');
  const [base, setBase]           = useState('USD');
  const [rates, setRates]         = useState<Record<string, number>>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [fetching, setFetching]   = useState(false);
  const [error, setError]         = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [tick, setTick]           = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Re-render timestamp display every 5 s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  // Load cached rates from localStorage on mount so the grid is never blank
  useEffect(() => {
    try {
      const cached = localStorage.getItem('sb_fx_rates');
      if (cached) {
        const { rates: r, at } = JSON.parse(cached);
        setRates(r);
        setUpdatedAt(new Date(at));
      }
    } catch { /* ignore */ }
  }, []);

  const fetchRates = useCallback(async () => {
    setFetching(true);
    setError(false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch('/api/v1/fx-rates', { signal: controller.signal });
      if (!res.ok) throw new Error('upstream error');
      const data = await res.json();
      if (data.error) throw new Error('api error');
      setRates(data);
      setUpdatedAt(new Date());
      try { localStorage.setItem('sb_fx_rates', JSON.stringify({ rates: data, at: Date.now() })); } catch { /* ignore */ }
    } catch {
      setError(true);
    } finally {
      clearTimeout(timer);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const id = setInterval(fetchRates, 60_000);
    return () => clearInterval(id);
  }, [fetchRates]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.select(), 80);
  }, [open]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  // ── Conversion helpers ──────────────────────────────────────────────────────

  function convert(code: string): string {
    const br = rates[base] ?? 0;
    const tr = rates[code] ?? 0;
    if (!br || !tr) return '…';
    const amt = parseFloat(amount) || 0;
    const cur = CURRENCIES.find(c => c.code === code)!;
    return fmtVal(cur.symbol, (amt / br) * tr);
  }

  function rateLabel(code: string): string {
    const br = rates[base] ?? 0;
    const tr = rates[code] ?? 0;
    if (!br || !tr) return '';
    const cur  = CURRENCIES.find(c => c.code === code)!;
    const bCur = CURRENCIES.find(c => c.code === base)!;
    return `1 ${bCur.symbol} = ${fmtVal(cur.symbol, tr / br)}`;
  }

  const hasRates = Object.keys(rates).length > 0;
  const baseInfo = CURRENCIES.find(c => c.code === base)!;

  // ── Panel ───────────────────────────────────────────────────────────────────

  const panel = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-end sm:justify-end">

          {/* Backdrop — invisible, click-to-close only */}
          <div className="absolute inset-0" onClick={() => setOpen(false)} />

          {/* Panel */}
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className="relative w-full sm:w-[440px] sm:mr-6 sm:mb-6 max-h-[92vh] sm:max-h-[86vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-black/70"
            style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.09)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8 shrink-0"
              style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(99,102,241,0.04))' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.35),rgba(99,102,241,0.2))', border: '1px solid rgba(124,58,237,0.35)' }}>
                  💱
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-none">Live Currency Rates</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${fetching ? 'bg-amber-400 animate-pulse' : error ? 'bg-red-400' : 'bg-emerald-400'}`} />
                    <span className="text-[10px] text-white/30">
                      {fetching ? 'Fetching ECB rates…' : error ? 'Could not fetch — showing cached' : updatedAt ? `Updated ${timeAgo(updatedAt)}` : 'Loading…'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-white/35 hover:bg-white/8 hover:text-white transition-colors text-lg shrink-0">
                ✕
              </button>
            </div>

            {/* Amount + base currency input */}
            <div className="px-4 pt-4 pb-3 border-b border-white/8 shrink-0">
              <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Convert from</div>
              <div className="flex items-center gap-2">

                {/* Base currency pill */}
                <div className="relative shrink-0">
                  <select value={base} onChange={e => setBase(e.target.value)}
                    className="appearance-none pl-8 pr-7 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/60 [&>option]:bg-[#0d1225]"
                    style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base leading-none pointer-events-none">
                    {baseInfo.flag}
                  </span>
                  <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-violet-400/60 pointer-events-none" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Amount input */}
                <div className="flex-1 relative">
                  <input ref={inputRef}
                    type="number" min="0" step="any"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-2xl font-black text-white tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-500/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    placeholder="0"
                  />
                </div>

                {/* Refresh button */}
                <button onClick={fetchRates} disabled={fetching} title="Refresh rates"
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-white/40 hover:text-violet-300 disabled:opacity-40 transition-colors shrink-0"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <svg className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} viewBox="0 0 16 16" fill="none">
                    <path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M14 2v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              <div className="mt-2 text-[10px] text-white/25 pl-0.5">
                {baseInfo.name} · Tap any result card to set it as the base
              </div>
            </div>

            {/* Currency grid */}
            <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
              {!hasRates ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <svg className="w-6 h-6 text-violet-500/50 animate-spin" viewBox="0 0 16 16" fill="none">
                    <path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs text-white/30">Fetching live rates…</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {CURRENCIES.filter(c => c.code !== base).map(cur => (
                    <button key={cur.code} type="button"
                      onClick={() => setBase(cur.code)}
                      className="text-left rounded-xl p-3 transition-all duration-150 group hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: 'rgba(255,255,255,0.028)', border: '1px solid rgba(255,255,255,0.07)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.07)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.028)'; }}>

                      {/* Top row: flag + code + swap hint */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base leading-none">{cur.flag}</span>
                          <span className="text-[11px] font-bold text-white/55">{cur.code}</span>
                        </div>
                        <svg className="w-3 h-3 text-white/15 group-hover:text-violet-400/50 transition-colors" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>

                      {/* Converted amount */}
                      <div className="text-[17px] font-black tabular-nums text-white leading-none">
                        {convert(cur.code)}
                      </div>

                      {/* Rate label */}
                      <div className="text-[9px] text-white/20 mt-1.5 truncate">{rateLabel(cur.code)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/6 shrink-0 flex items-center justify-between"
              style={{ background: 'rgba(0,0,0,0.25)' }}>
              <span className="text-[9px] text-white/20">Powered by Frankfurter · European Central Bank</span>
              <span className="text-[9px] text-white/20">Auto-refresh every 60s</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-20 right-3 lg:bottom-6 lg:right-5 z-[100] flex items-center gap-2 rounded-2xl px-3 py-2 shadow-lg transition-shadow duration-200"
        style={{
          background: open ? 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(99,102,241,0.2))' : 'rgba(10,15,30,0.92)',
          border: open ? '1px solid rgba(124,58,237,0.55)' : '1px solid rgba(124,58,237,0.28)',
          boxShadow: open ? '0 4px 24px rgba(124,58,237,0.35)' : '0 4px 16px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
        }}>
        <span className="text-base leading-none">💱</span>
        <div className="hidden sm:block text-left">
          <div className="text-[11px] font-bold text-violet-200 leading-none">Live FX</div>
          <div className="text-[9px] leading-none mt-0.5 tabular-nums"
            style={{ color: fetching ? '#fbbf24' : error ? '#f87171' : '#34d399' }}>
            {fetching ? 'updating…' : error ? 'cached' : updatedAt ? `${timeAgo(updatedAt)}` : '…'}
          </div>
        </div>
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${fetching ? 'bg-amber-400 animate-pulse' : error ? 'bg-red-400' : 'bg-emerald-400'}`} />
      </motion.button>

      {createPortal(panel, document.body)}
    </>
  );
}
