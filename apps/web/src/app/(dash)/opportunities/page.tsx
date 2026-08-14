'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ScoreGauge, RecommendationBadge } from '@/components/ui/ScoreGauge';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(minor: number, currency = '') { return `${currency} ${(minor / 100).toFixed(0)}`.trim(); }

const PLATFORM_NAMES: Record<string, string> = {
  amazon: 'Amazon', ebay: 'eBay', shopee: 'Shopee', lazada: 'Lazada',
  tiktok: 'TikTok Shop', walmart: 'Walmart', noon: 'Noon', temu: 'Temu',
  mercadolibre: 'MercadoLibre', flipkart: 'Flipkart', meesho: 'Meesho',
  coupang: 'Coupang', rakuten: 'Rakuten', allegro: 'Allegro', bol: 'Bol.com',
  jumia: 'Jumia', takealot: 'Takealot', etsy: 'Etsy', daraz: 'Daraz',
  cdiscount: 'Cdiscount', onbuy: 'OnBuy', zalando: 'Zalando', otto: 'Otto',
};

const REGIONS: Record<string, string> = {
  us: 'United States', gb: 'United Kingdom', de: 'Germany', fr: 'France',
  it: 'Italy', es: 'Spain', ca: 'Canada', au: 'Australia', in: 'India',
  jp: 'Japan', sg: 'Singapore', my: 'Malaysia', th: 'Thailand',
  ph: 'Philippines', id: 'Indonesia', vn: 'Vietnam', ae: 'UAE',
  sa: 'Saudi Arabia', mx: 'Mexico', br: 'Brazil', pl: 'Poland',
  nl: 'Netherlands', se: 'Sweden', tr: 'Turkey', kr: 'South Korea',
  tw: 'Taiwan', eg: 'Egypt', ng: 'Nigeria', ke: 'Kenya', za: 'South Africa',
  pk: 'Pakistan', lk: 'Sri Lanka', bd: 'Bangladesh', ar: 'Argentina',
  co: 'Colombia', cl: 'Chile', eu: 'Europe',
};

function platformOf(code: string) {
  const p = (code || '').split('_')[0];
  return PLATFORM_NAMES[p] || p.charAt(0).toUpperCase() + p.slice(1);
}
function countryCode(mpCode: string): string {
  const parts = (mpCode || '').split('_');
  const last = parts[parts.length - 1];
  return last.length === 2 ? last.toUpperCase() : '';
}
function flag(cc: string): string {
  if (!cc || cc.length !== 2) return '';
  return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
}
function mkLabel(mp: any): string {
  const cc = countryCode(mp.code);
  return `${cc ? flag(cc) : '🛒'} ${platformOf(mp.code)}${cc ? ` ${cc}` : ''}`;
}
function regionName(mpCode: string): string {
  const cc = countryCode(mpCode).toLowerCase();
  return REGIONS[cc] || cc.toUpperCase() || 'Global';
}

// ── Trend helpers ─────────────────────────────────────────────────────────────

function trendSource(code: string): { icon: string; label: string; key: string; color: string } {
  if (!code) return { icon: '📊', label: 'Market Trend', key: 'market', color: '#7c3aed' };
  if (code.startsWith('tiktok'))  return { icon: '📱', label: 'TikTok Viral', key: 'social',  color: '#ff2d55' };
  if (code.startsWith('etsy'))    return { icon: '🎨', label: 'Etsy Curated', key: 'curated', color: '#f1641e' };
  if (code.startsWith('amazon'))  return { icon: '🔍', label: 'Amazon Search', key: 'search', color: '#ff9900' };
  if (code.startsWith('ebay'))    return { icon: '🔍', label: 'eBay Search',   key: 'search', color: '#0064d2' };
  if (code.startsWith('walmart')) return { icon: '💲', label: 'Walmart Value', key: 'value',  color: '#0071ce' };
  if (code.startsWith('temu'))    return { icon: '💲', label: 'Temu Value',    key: 'value',  color: '#ff6900' };
  if (code.startsWith('shopee') || code.startsWith('lazada')) return { icon: '🌏', label: 'SEA Trend', key: 'sea', color: '#ee4d2d' };
  if (code.startsWith('noon'))    return { icon: '🌙', label: 'Noon ME',       key: 'me',     color: '#ffcc00' };
  if (code.startsWith('flipkart') || code.startsWith('meesho')) return { icon: '🇮🇳', label: 'India Trend', key: 'india', color: '#047bd5' };
  return { icon: '📊', label: 'Market Trend', key: 'market', color: '#7c3aed' };
}

function trendStrengthLabel(score: number): { label: string; key: string; color: string } {
  if (score >= 80) return { label: '🔥 Hot',      key: 'hot',      color: '#ef4444' };
  if (score >= 60) return { label: '📈 Rising',   key: 'rising',   color: '#f59e0b' };
  if (score >= 40) return { label: '➡️ Stable',   key: 'stable',   color: '#6b7280' };
  return              { label: '📉 Declining', key: 'declining', color: '#3b82f6' };
}

const DAY = 86_400_000;
function trendTenure(createdAt: number): { label: string; key: string; color: string } {
  const age = Date.now() - Number(createdAt || 0);
  if (age < 2 * DAY)  return { label: 'Last 2 days',   key: '2d',  color: '#10b981' };
  if (age < 7 * DAY)  return { label: 'This week',     key: '7d',  color: '#06b6d4' };
  if (age < 30 * DAY) return { label: 'This month',    key: '30d', color: '#8b5cf6' };
  if (age < 90 * DAY) return { label: 'Last 3 months', key: '3m',  color: '#f59e0b' };
  return                { label: 'Older',          key: 'old', color: '#6b7280' };
}

// ── Marketplace dropdown (portal-based) ───────────────────────────────────────

function MarketplaceDropdown({ marketplaces, value, onChange, loading }: {
  marketplaces: any[]; value: string; onChange: (v: string) => void; loading: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos]       = useState({ top: 0, left: 0, width: 0 });
  const btnRef   = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 288) });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const onDown = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  const grouped: Record<string, any[]> = {};
  for (const mp of marketplaces) {
    const p = platformOf(mp.code);
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(mp);
  }
  const q = search.toLowerCase();
  const filtered: Record<string, any[]> = {};
  for (const [p, mps] of Object.entries(grouped)) {
    const f = mps.filter(mp => p.toLowerCase().includes(q) || mkLabel(mp).toLowerCase().includes(q) || mp.code.includes(q));
    if (f.length) filtered[p] = f;
  }

  const selected = marketplaces.find(mp => mp.code === value);

  const panel = open && typeof window !== 'undefined' ? createPortal(
    <div ref={panelRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-[#0d1526] border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
      <div className="p-2 border-b border-white/5">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-violet-500/60">
          <svg className="w-3.5 h-3.5 text-white/30 shrink-0" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input autoFocus type="text" placeholder={`Search ${marketplaces.length} marketplaces…`}
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder-white/30 focus:outline-none" />
          {search && <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60 text-xs">✕</button>}
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto scrollbar-dark py-1">
        {Object.keys(filtered).length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-white/30">No marketplaces match &ldquo;{search}&rdquo;</div>
        ) : Object.entries(filtered).map(([platform, mps]) => (
          <div key={platform}>
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/25 uppercase tracking-widest sticky top-0 bg-[#0d1526]">{platform}</div>
            {mps.map((mp: any) => (
              <button key={mp.code} type="button" onClick={() => { onChange(mp.code); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2 text-sm leading-snug transition-colors flex items-center gap-2.5 ${
                  mp.code === value ? 'bg-violet-500/20 text-violet-300' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                <span>{mkLabel(mp)}</span>
                {mp.code === value && <svg className="ml-auto w-3.5 h-3.5 text-violet-400" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button ref={btnRef} type="button" onClick={() => { setOpen(o => !o); setSearch(''); }} disabled={loading}
        className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500/60 rounded-xl px-3 py-2.5 text-sm text-white min-w-[220px] min-h-[42px] transition-colors disabled:opacity-50 text-left focus:outline-none">
        <span className="flex-1 leading-snug">{loading ? 'Loading…' : (selected ? mkLabel(selected) : 'Select marketplace')}</span>
        <svg className={`shrink-0 w-3.5 h-3.5 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 8" fill="none">
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {panel}
    </div>
  );
}

// ── Small pill filter ─────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium leading-none transition-colors whitespace-nowrap ${
        active ? 'bg-violet-600 text-white' : 'bg-white/5 border border-white/10 text-white/55 hover:text-white hover:bg-white/10'}`}>
      {label}
    </button>
  );
}

// ── Select pill ───────────────────────────────────────────────────────────────

const SEL = 'bg-white/5 border border-white/10 hover:border-white/20 text-xs text-white/60 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500/40 [&>option]:bg-[#0d1225] cursor-pointer transition-colors min-h-[34px]';

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[180, 120, 110, 80, 90, 80, 40].map((w, i) => (
        <td key={i} className="px-3 py-3.5">
          <div className="h-4 bg-white/10 rounded" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const qc = useQueryClient();

  // Server-side filters
  const [mpFilter,  setMpFilter]  = useState('amazon_us');
  const [recFilter, setRecFilter] = useState('');

  // Client-side filters
  const [catFilter,    setCatFilter]    = useState('');
  const [srcFilter,    setSrcFilter]    = useState('');
  const [strengthFilter, setStrengthFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [sortBy,       setSortBy]       = useState('score');

  const [searching,    setSearching]    = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [searchError,  setSearchError]  = useState('');

  const { data: marketplaces = [], isLoading: mktLoading } = useQuery({
    queryKey: ['marketplaces', 'active'],
    queryFn: () => api.marketplaces.list({ active: true }),
  });

  const oppParams: Record<string, string> = {};
  if (mpFilter)  oppParams.marketplace    = mpFilter;
  if (recFilter) oppParams.recommendation = recFilter;

  const { data: opps = [], isLoading } = useQuery({
    queryKey: ['opportunities', { marketplace: mpFilter, recommendation: recFilter }],
    queryFn: () => api.opportunities.list(oppParams),
  });

  const allOpps = opps as any[];

  // Unique categories from loaded data
  const categories = useMemo(
    () => [...new Set(allOpps.map(o => o.product?.category).filter(Boolean))].sort() as string[],
    [allOpps]
  );

  // Client-side filter + sort
  const displayed = useMemo(() => {
    const now = Date.now();
    let rows = allOpps.filter(opp => {
      if (catFilter) {
        if (opp.product?.category !== catFilter) return false;
      }
      if (srcFilter) {
        if (trendSource(opp.marketplace?.code).key !== srcFilter) return false;
      }
      if (strengthFilter) {
        const t = trendStrengthLabel(opp.score?.trend ?? 0);
        if (t.key !== strengthFilter) return false;
      }
      if (periodFilter) {
        const age = now - Number(opp.createdAt || 0);
        if (periodFilter === '2d'  && age > 2  * DAY) return false;
        if (periodFilter === '7d'  && age > 7  * DAY) return false;
        if (periodFilter === '30d' && age > 30 * DAY) return false;
        if (periodFilter === '3m'  && age > 90 * DAY) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sortBy === 'profit')  return (b.profitModel?.netProfitMinor ?? 0) - (a.profitModel?.netProfitMinor ?? 0);
      if (sortBy === 'trend')   return (b.score?.trend ?? 0) - (a.score?.trend ?? 0);
      if (sortBy === 'newest')  return Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0);
      if (sortBy === 'oldest')  return Number(a.createdAt ?? 0) - Number(b.createdAt ?? 0);
      return (b.score?.opportunity ?? 0) - (a.score?.opportunity ?? 0); // default: score
    });
    return rows;
  }, [allOpps, catFilter, srcFilter, strengthFilter, periodFilter, sortBy]);

  const hasClientFilters = !!(catFilter || srcFilter || strengthFilter || periodFilter);

  const runSearch = useMutation({
    mutationFn: () => {
      setSearchError(''); setSearching(true); setSearchStatus('AI analysing market…');
      return api.searches.create({ marketplace: mpFilter });
    },
    onSuccess: (data: any) => {
      setSearching(false);
      if (data?.status === 'failed' || data?.error) {
        setSearchError(data.error || 'Search failed'); setSearchStatus('');
      } else {
        setSearchStatus(`✓ Found ${data?.count ?? 0} opportunities`);
        qc.invalidateQueries({ queryKey: ['opportunities'] });
        setTimeout(() => setSearchStatus(''), 4000);
      }
    },
    onError: (err: any) => {
      setSearching(false); setSearchStatus('');
      setSearchError(err?.message || 'Search failed — check Groq API key in Settings');
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Opportunities</h1>
          <p className="text-sm text-white/40 mt-0.5">AI-ranked cross-border eCommerce opportunities</p>
        </div>
        <button onClick={() => runSearch.mutate()} disabled={searching}
          className="btn-primary text-sm disabled:opacity-60 shrink-0">
          {searching
            ? <><span className="animate-spin inline-block mr-1">⟳</span>{searchStatus}</>
            : searchStatus
            ? <><span className="mr-1">✓</span>{searchStatus}</>
            : <><span className="mr-1">+</span>New Search</>}
        </button>
      </div>

      {searchError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
          <span className="shrink-0 mt-0.5">✕</span>
          <span>{searchError}</span>
          <button onClick={() => setSearchError('')} className="ml-auto shrink-0 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── Filter panel ─────────────────────────────────────── */}
      <div className="card-dark rounded-xl p-3 sm:p-4 mb-4 space-y-3">

        {/* Row 1: Marketplace + Category + Sort + count */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">
              Marketplace{!mktLoading && <span className="ml-1 font-normal text-white/25">({(marketplaces as any[]).length})</span>}
            </label>
            <MarketplaceDropdown marketplaces={marketplaces as any[]} value={mpFilter}
              onChange={v => setMpFilter(v)} loading={mktLoading} />
          </div>

          {categories.length > 0 && (
            <div>
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Category</label>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={SEL}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Sort by</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={SEL}>
              <option value="score">⭐ AI Score</option>
              <option value="profit">💰 Net Profit</option>
              <option value="trend">📈 Trend Strength</option>
              <option value="newest">🕐 Newest First</option>
              <option value="oldest">🕐 Oldest First</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-white/30 self-end pb-1.5">
            {displayed.length} of {allOpps.length} result{allOpps.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Row 2: Signal + Trend Source + Strength + Period + Clear */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest shrink-0">Signal:</span>
          {[['', 'All'], ['launch', '🚀 Launch'], ['hold', '⏸ Hold'], ['reject', '✕ Reject']].map(([v, l]) => (
            <Pill key={v} label={l} active={recFilter === v} onClick={() => setRecFilter(v)} />
          ))}

          <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />

          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest shrink-0">Trend:</span>
          {[['', 'All Sources'], ['search', '🔍 Search'], ['social', '📱 Social'], ['curated', '🎨 Curated'], ['value', '💲 Value']].map(([v, l]) => (
            <Pill key={v} label={l} active={srcFilter === v} onClick={() => setSrcFilter(v)} />
          ))}

          <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />

          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest shrink-0">Strength:</span>
          {[['', 'All'], ['hot', '🔥 Hot'], ['rising', '📈 Rising'], ['stable', '➡️ Stable']].map(([v, l]) => (
            <Pill key={v} label={l} active={strengthFilter === v} onClick={() => setStrengthFilter(v)} />
          ))}

          <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />

          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest shrink-0">Period:</span>
          <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className={SEL}>
            <option value="">All Time</option>
            <option value="2d">Last 2 days</option>
            <option value="7d">This week</option>
            <option value="30d">This month</option>
            <option value="3m">Last 3 months</option>
          </select>

          {hasClientFilters && (
            <button onClick={() => { setCatFilter(''); setSrcFilter(''); setStrengthFilter(''); setPeriodFilter(''); }}
              className="text-xs text-white/35 hover:text-white/70 border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors hover:border-white/20 ml-1">
              Clear ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="card-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Product</th>
                <th className="text-left px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Trend</th>
                <th className="text-left px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Region</th>
                <th className="text-center px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Score</th>
                <th className="text-left px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Signal</th>
                <th className="text-right px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Net Profit</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading
                ? [1, 2, 3].map(i => <SkeletonRow key={i} />)
                : displayed.length === 0
                ? (
                  <tr><td colSpan={7}>
                    <div className="py-14 text-center">
                      <div className="text-4xl mb-3">🎯</div>
                      <p className="font-medium text-white/70 mb-1">
                        {allOpps.length === 0 ? 'No opportunities yet' : 'No results match your filters'}
                      </p>
                      <p className="text-sm text-white/40">
                        {allOpps.length === 0
                          ? 'Click + New Search to discover products'
                          : 'Try adjusting the filters above'}
                      </p>
                    </div>
                  </td></tr>
                )
                : displayed.map((opp: any) => {
                  const mpCode  = opp.marketplace?.code || '';
                  const cc      = countryCode(mpCode);
                  const ts      = trendSource(mpCode);
                  const tStr    = trendStrengthLabel(opp.score?.trend ?? 0);
                  const tenure  = trendTenure(opp.createdAt);
                  const region  = regionName(mpCode);

                  return (
                    <tr key={opp.id}
                      className="hover:bg-violet-500/5 transition-colors group cursor-pointer"
                      onClick={() => { window.location.href = `/opportunities/${opp.id}`; }}>

                      {/* Product */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
                            {opp.product?.imageUrl
                              ? <img src={opp.product.imageUrl} alt={opp.product.title}
                                  className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              : <div className="w-full h-full flex items-center justify-center text-base">🎯</div>}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white line-clamp-1 text-sm">{opp.product?.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {opp.product?.category && (
                                <span className="text-[10px] text-white/35 capitalize leading-snug truncate max-w-[120px]">
                                  {opp.product.category.replace(/_/g, ' ')}
                                </span>
                              )}
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border leading-none"
                                style={{ color: tenure.color, borderColor: tenure.color + '40', backgroundColor: tenure.color + '15' }}>
                                {tenure.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Trend */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-semibold leading-none" style={{ color: ts.color }}>
                            {ts.icon} {ts.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-white/40">{tStr.label}</span>
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden min-w-[40px] max-w-[60px]">
                            <div className="h-full rounded-full" style={{ width: `${opp.score?.trend ?? 0}%`, backgroundColor: tStr.color }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: tStr.color }}>{Math.round(opp.score?.trend ?? 0)}</span>
                        </div>
                      </td>

                      {/* Region */}
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-white/80 leading-snug">
                          {cc ? flag(cc) : '🛒'} {platformOf(mpCode)}
                        </div>
                        <div className="text-[10px] text-white/35 leading-snug mt-0.5">{region}</div>
                      </td>

                      {/* Score */}
                      <td className="px-3 py-3 text-center">
                        <ScoreGauge score={opp.score?.opportunity || 0} size="sm" />
                      </td>

                      {/* Signal */}
                      <td className="px-3 py-3">
                        <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence)} />
                      </td>

                      {/* Net Profit */}
                      <td className="px-3 py-3 text-right font-semibold text-white">
                        {opp.profitModel
                          ? fmt(opp.profitModel.netProfitMinor, opp.marketplace?.currency)
                          : <span className="text-white/25">&mdash;</span>}
                      </td>

                      {/* View */}
                      <td className="px-3 py-3">
                        <Link href={`/opportunities/${opp.id}`} onClick={e => e.stopPropagation()}
                          className="text-xs text-violet-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:underline whitespace-nowrap">
                          View &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
