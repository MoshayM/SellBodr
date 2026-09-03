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

// ── FX Icon SVG ───────────────────────────────────────────────────────────────

function FxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 7h11M11 4l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 13H6M9 10l-3 3 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
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

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5_000);
    return () => clearInterval(id);
  }, []);

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

  const statusColor = fetching ? '#D97706' : error ? '#DC2626' : '#10B981';
  const statusLabel = fetching ? 'Updating…' : error ? 'Cached' : updatedAt ? timeAgo(updatedAt) : '…';

  // ── Panel ───────────────────────────────────────────────────────────────────

  const panel = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-end sm:justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" onClick={() => setOpen(false)} />

          <motion.div
            initial={{ y: 32, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className="relative w-full sm:w-[420px] sm:mr-5 sm:mb-20 max-h-[82dvh] sm:max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8EDFB',
              boxShadow: '0 24px 64px rgba(79,70,229,0.18), 0 4px 16px rgba(15,23,42,0.1)',
            }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0"
              style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.05),rgba(124,58,237,0.03))' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
                  <FxIcon className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 leading-none">Live Currency Rates</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${fetching ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: statusColor }} />
                    <span className="text-[10px] text-slate-400">
                      {fetching ? 'Fetching ECB rates…' : error ? 'Could not fetch — showing cached' : updatedAt ? `Updated ${timeAgo(updatedAt)}` : 'Loading…'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors text-base shrink-0">
                ✕
              </button>
            </div>

            {/* Amount + base currency */}
            <div className="px-4 pt-4 pb-3.5 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Convert from</div>
              <div className="flex items-center gap-2">

                {/* Base currency select */}
                <div className="relative shrink-0">
                  <select value={base} onChange={e => setBase(e.target.value)}
                    className="appearance-none pl-8 pr-7 py-2.5 rounded-xl text-sm font-bold text-indigo-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30 [&>option]:bg-white [&>option]:text-slate-900"
                    style={{ background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.2)' }}>
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base leading-none pointer-events-none">
                    {baseInfo.flag}
                  </span>
                  <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-400 pointer-events-none" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Amount input */}
                <div className="flex-1 relative">
                  <input ref={inputRef}
                    type="number" min="0" step="any"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-2xl font-black text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-white border border-slate-200"
                    placeholder="0"
                  />
                </div>

                {/* Refresh */}
                <button onClick={fetchRates} disabled={fetching} title="Refresh rates"
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 transition-colors shrink-0 border border-slate-200 bg-white">
                  <svg className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} viewBox="0 0 16 16" fill="none">
                    <path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M14 2v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 pl-0.5">
                {baseInfo.name} · Tap any card to set it as the base currency
              </div>
            </div>

            {/* Currency grid */}
            <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#E2E8F0 transparent' }}>
              {!hasRates ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <svg className="w-6 h-6 text-indigo-400 animate-spin" viewBox="0 0 16 16" fill="none">
                    <path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs text-slate-400">Fetching live rates…</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {CURRENCIES.filter(c => c.code !== base).map(cur => (
                    <button key={cur.code} type="button"
                      onClick={() => setBase(cur.code)}
                      className="text-left rounded-xl p-3 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/60 transition-all duration-150 group active:scale-[0.98]"
                      style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base leading-none">{cur.flag}</span>
                          <span className="text-[11px] font-bold text-slate-500">{cur.code}</span>
                        </div>
                        <svg className="w-3 h-3 text-slate-200 group-hover:text-indigo-400 transition-colors" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>

                      <div className="text-[17px] font-black tabular-nums text-slate-900 leading-none">
                        {convert(cur.code)}
                      </div>

                      <div className="text-[9px] text-slate-400 mt-1.5 truncate">{rateLabel(cur.code)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 shrink-0 flex items-center justify-between bg-slate-50/70">
              <span className="text-[9px] text-slate-400">Powered by Frankfurter · European Central Bank</span>
              <span className="text-[9px] text-slate-400">Auto-refresh every 60s</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;

  return (
    <>
      {/* Floating trigger — indigo pill matching app brand */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.96 }}
        className="fixed bottom-20 right-3 lg:bottom-6 lg:right-5 z-[100] flex items-center gap-2 rounded-2xl px-3 py-2 transition-shadow duration-200"
        style={{
          background: open
            ? 'linear-gradient(135deg,#4F46E5,#7C3AED)'
            : 'linear-gradient(135deg,#6366F1,#4F46E5)',
          boxShadow: open
            ? '0 8px 28px rgba(99,102,241,0.50), 0 2px 8px rgba(79,70,229,0.3)'
            : '0 4px 16px rgba(99,102,241,0.30), 0 1px 4px rgba(79,70,229,0.15)',
          border: '1px solid rgba(255,255,255,0.18)',
        }}>

        {/* Icon */}
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          <FxIcon className="w-[17px] h-[17px] text-white" />
        </div>

        {/* Label */}
        <div className="hidden sm:block text-left">
          <div className="text-[11px] font-bold text-white leading-none tracking-wide">Live FX</div>
          <div className="text-[9px] leading-none mt-0.5 font-medium" style={{ color: statusColor === '#10B981' ? '#6EE7B7' : statusColor === '#D97706' ? '#FCD34D' : '#FCA5A5' }}>
            {statusLabel}
          </div>
        </div>

        {/* Status dot */}
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${fetching ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: statusColor === '#10B981' ? '#6EE7B7' : statusColor === '#D97706' ? '#FCD34D' : '#FCA5A5' }} />
      </motion.button>

      {createPortal(panel, document.body)}
    </>
  );
}
