'use client';
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, isPro } from '@/lib/api';
import { ProGate } from '@/components/ui/ProGate';
import { ScoreGauge, RecommendationBadge } from '@/components/ui/ScoreGauge';
import { getMarketplaceDef, getMarketplaceSearchUrl } from '@/lib/marketplace';

// ── Helpers ───────────────────────────────────────────────────────────────────

function MarketplaceBadge({ code, href }: { code: string; href: string }) {
  const m = getMarketplaceDef(code);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] leading-none font-semibold border transition-all hover:opacity-80"
      style={{ backgroundColor: m.bgColor, color: m.textColor, borderColor: m.borderColor }}
      title={`View on ${m.displayName}`}>
      <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold leading-none"
        style={{ backgroundColor: m.logoColor, fontSize: '7px' }}>{m.logoChar}</span>
      {m.shortName}
      <svg className="w-2.5 h-2.5 opacity-60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function trendSource(code: string): { icon: string; label: string; color: string } {
  if (!code) return { icon: '📊', label: 'Market Trend', color: '#7c3aed' };
  if (code.startsWith('tiktok'))  return { icon: '📱', label: 'TikTok Viral', color: '#ff2d55' };
  if (code.startsWith('etsy'))    return { icon: '🎨', label: 'Etsy Curated', color: '#f1641e' };
  if (code.startsWith('amazon'))  return { icon: '🔍', label: 'Amazon Search', color: '#ff9900' };
  if (code.startsWith('ebay'))    return { icon: '🔍', label: 'eBay Search', color: '#0064d2' };
  if (code.startsWith('walmart')) return { icon: '💲', label: 'Walmart Value', color: '#0071ce' };
  if (code.startsWith('temu'))    return { icon: '💲', label: 'Temu Value', color: '#ff6900' };
  if (code.startsWith('shopee') || code.startsWith('lazada')) return { icon: '🌏', label: 'SEA Trend', color: '#ee4d2d' };
  if (code.startsWith('noon'))    return { icon: '🌙', label: 'Noon ME', color: '#ffcc00' };
  if (code.startsWith('flipkart') || code.startsWith('meesho')) return { icon: '🇮🇳', label: 'India Trend', color: '#047bd5' };
  return { icon: '📊', label: 'Market Trend', color: '#7c3aed' };
}

function ImagePlaceholder({ title, category }: { title?: string; category?: string }) {
  const icons: Record<string, string> = {
    'home decor': '🏺', 'fashion': '👗', 'health': '🌿', 'beauty': '✨',
    'sports': '🏋️', 'fitness': '🧘', 'handicrafts': '🪡', 'food': '🍱',
    'electronics': '💡', 'textiles': '🧵', 'jewelry': '💎', 'kitchenware': '🍳',
  };
  const cat = (category || '').toLowerCase();
  const icon = Object.entries(icons).find(([k]) => cat.includes(k))?.[1] ?? '📦';
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4 bg-gradient-to-br from-white/5 to-white/[0.02]">
      <span className="text-4xl opacity-40">{icon}</span>
      {title && <span className="text-[9px] text-white/50 text-center line-clamp-2 leading-snug">{title}</span>}
    </div>
  );
}

function ProductCard({ opp }: { opp: any }) {
  const [imgError, setImgError] = useState(false);
  const product    = opp.product ?? {};
  const marketplace = opp.marketplace ?? {};
  const s          = opp.score ?? {};
  const score      = Math.round(s.opportunity ?? 0);
  const listingHref = product.marketplaceUrl || getMarketplaceSearchUrl(marketplace.code, product.title);
  const m          = getMarketplaceDef(marketplace.code);
  const showImage  = !!product.imageUrl && !imgError;
  const ts         = trendSource(marketplace.code);

  return (
    <div className="card-dark rounded-xl overflow-hidden flex flex-col hover:border-violet-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/10">
      <div className="relative w-full h-44 bg-white/5 flex-shrink-0 overflow-hidden">
        {showImage ? (
          // plain img tag — bypasses Next.js image domain restrictions
          <img src={product.imageUrl} alt={product.title ?? 'Product'}
            className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <ImagePlaceholder title={product.title} category={product.category} />
        )}
        {/* Trend source badge — top-left */}
        <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] leading-none font-semibold px-2 py-1 rounded-full backdrop-blur-sm bg-black/50 border border-white/10"
          style={{ color: ts.color }}>
          {ts.icon} {ts.label}
        </span>
        {opp.confidence >= 85 && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-green-500 text-white text-[9px] leading-none font-bold px-1.5 py-1 rounded-full shadow">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            AI Verified
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2.5">
        <div className="text-sm font-semibold text-white line-clamp-2 leading-snug">{product.title}</div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <MarketplaceBadge code={marketplace.code} href={listingHref} />
          {product.category && (
            <span className="text-[11px] leading-snug text-white/40 capitalize">{product.category.replace(/_/g, ' ')}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ScoreGauge score={score} size="sm" />
          <div className="grid grid-cols-2 gap-1 flex-1">
            {[
              { label: 'Demand', value: s.demand },
              { label: 'Margin', value: s.margin },
              { label: 'Trend',  value: s.trend  },
              { label: 'Comp.', value: s.competition },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded px-1.5 py-1.5">
                <div className="text-[9px] leading-none text-white/50 mb-0.5">{label}</div>
                <div className={`text-xs font-bold leading-snug ${
                  (value ?? 0) >= 70 ? 'text-green-400' :
                  (value ?? 0) >= 40 ? 'text-amber-400' : 'text-red-400'
                }`}>{Math.round(value ?? 0)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-white/5 mt-auto">
          <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence ?? 0)} />
          <div className="flex items-center gap-1.5">
            <a href={listingHref} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 text-[11px] leading-none font-medium bg-white/5 border border-white/10 rounded px-2 py-1 transition-colors hover:bg-white/10"
              style={{ color: m.logoColor }}>
              <span className="w-3 h-3 rounded-full flex items-center justify-center text-white leading-none flex-shrink-0"
                style={{ backgroundColor: m.logoColor, fontSize: '6px' }}>{m.logoChar}</span>
              View
            </a>
            <Link href={`/opportunities/${opp.id}?tab=Research`}
              className="text-[11px] leading-none text-violet-400 font-medium border border-violet-500/20 bg-violet-500/10 rounded px-2 py-1 transition-colors hover:bg-violet-500/20">
              Research →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Filter helpers ────────────────────────────────────────────────────────────

function trendLabel(t: number) {
  if (t >= 80) return 'hot';
  if (t >= 60) return 'rising';
  if (t >= 40) return 'stable';
  return 'declining';
}

function trendChannel(code: string): string {
  if (code?.startsWith('tiktok')) return 'social';
  if (code?.startsWith('etsy'))   return 'curated';
  if (code?.startsWith('amazon') || code?.startsWith('ebay')) return 'search';
  if (code?.startsWith('temu') || code?.startsWith('walmart')) return 'value';
  return 'other';
}

const DAY = 86_400_000;

const SELECT_CLS = 'bg-[#0d1225] border border-white/10 hover:border-white/20 text-xs text-white/70 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500/50 [&>option]:bg-[#0d1225] cursor-pointer transition-colors';

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [isFree, setIsFree] = useState(true);
  useEffect(() => { setIsFree(!isPro()); }, []);

  const { data: opps = [], isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => api.opportunities.list({}),
    enabled: !isFree,
  });

  if (isFree) return (
    <ProGate
      icon="🔬"
      feature="Deep Market Research"
      tagline="Full 7-dimension AI analysis per opportunity — demand signals, competition mapping, saturation heatmaps, trend breakdowns, and AI evidence with source citations."
      benefits={[
        'Full 7-dimension score breakdown with evidence',
        'Competition density & saturation heatmap',
        'Trend source: search, social, curated signals',
        'Multi-model AI consensus confidence scores',
      ]}
    />
  );

  const [catFilter,    setCatFilter]    = useState('');
  const [mpFilter,     setMpFilter]     = useState('');
  const [recFilter,    setRecFilter]    = useState('');
  const [trendFilter,  setTrendFilter]  = useState('');
  const [chanFilter,   setChanFilter]   = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  const allOpps = opps as any[];

  const categories  = useMemo(() => [...new Set(allOpps.map(o => o.product?.category).filter(Boolean))].sort(), [allOpps]);
  const marketplaces = useMemo(() => [...new Set(allOpps.map(o => o.marketplace?.code).filter(Boolean))].sort(), [allOpps]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return allOpps.filter(opp => {
      if (catFilter   && opp.product?.category !== catFilter) return false;
      if (mpFilter    && opp.marketplace?.code !== mpFilter)  return false;
      if (recFilter   && opp.recommendation !== recFilter)    return false;
      if (chanFilter  && trendChannel(opp.marketplace?.code) !== chanFilter) return false;
      if (trendFilter) {
        const tl = trendLabel(opp.score?.trend ?? 0);
        if (tl !== trendFilter) return false;
      }
      if (periodFilter) {
        const age = now - (Number(opp.createdAt) || 0);
        if (periodFilter === 'today' && age > DAY)        return false;
        if (periodFilter === '7d'    && age > 7  * DAY)   return false;
        if (periodFilter === '30d'   && age > 30 * DAY)   return false;
        if (periodFilter === '3m'    && age > 90 * DAY)   return false;
      }
      return true;
    });
  }, [allOpps, catFilter, mpFilter, recFilter, trendFilter, chanFilter, periodFilter]);

  const hasFilters = !!(catFilter || mpFilter || recFilter || trendFilter || chanFilter || periodFilter);

  function clearFilters() {
    setCatFilter(''); setMpFilter(''); setRecFilter('');
    setTrendFilter(''); setChanFilter(''); setPeriodFilter('');
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Product Research</h1>
          <p className="text-sm text-white/40 mt-0.5">AI-validated product opportunities with marketplace intelligence</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card-dark rounded-xl overflow-hidden animate-pulse">
              <div className="h-44 bg-white/5" />
              <div className="p-4 space-y-2.5">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
                <div className="h-8 bg-white/5 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (allOpps.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Product Research</h1>
          <p className="text-sm text-white/40 mt-0.5">AI-validated product opportunities with marketplace intelligence</p>
        </div>
        <div className="card-dark rounded-xl p-12 sm:p-16 text-center">
          <div className="text-5xl mb-4">🔬</div>
          <p className="font-semibold text-white mb-1">No research data yet</p>
          <p className="text-sm text-white/40 mb-5">Run a search to start generating AI-validated research</p>
          <Link href="/opportunities" className="btn-primary text-sm">Start Research →</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Research</h1>
          <p className="text-sm text-white/40 mt-0.5">AI-validated opportunities · {filtered.length} of {allOpps.length} shown</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-white/[0.03] border border-white/8 rounded-xl">
        {/* Category */}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={SELECT_CLS}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Marketplace */}
        <select value={mpFilter} onChange={e => setMpFilter(e.target.value)} className={SELECT_CLS}>
          <option value="">All Marketplaces</option>
          {marketplaces.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* Recommendation */}
        <select value={recFilter} onChange={e => setRecFilter(e.target.value)} className={SELECT_CLS}>
          <option value="">All Signals</option>
          <option value="launch">🚀 Launch</option>
          <option value="hold">⏸ Hold</option>
          <option value="reject">❌ Reject</option>
        </select>

        {/* Trend strength */}
        <select value={trendFilter} onChange={e => setTrendFilter(e.target.value)} className={SELECT_CLS}>
          <option value="">All Trends</option>
          <option value="hot">🔥 Hot (≥80)</option>
          <option value="rising">📈 Rising (60–79)</option>
          <option value="stable">➡️ Stable (40–59)</option>
          <option value="declining">📉 Declining (&lt;40)</option>
        </select>

        {/* Trend source / channel */}
        <select value={chanFilter} onChange={e => setChanFilter(e.target.value)} className={SELECT_CLS}>
          <option value="">All Channels</option>
          <option value="search">🔍 Search (Amazon/eBay)</option>
          <option value="social">📱 Social (TikTok)</option>
          <option value="curated">🎨 Curated (Etsy)</option>
          <option value="value">💲 Value (Walmart/Temu)</option>
        </select>

        {/* Time period */}
        <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className={SELECT_CLS}>
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="3m">Last 3 months</option>
        </select>

        {hasFilters && (
          <button onClick={clearFilters}
            className="text-xs text-white/40 hover:text-white/70 border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors hover:border-white/20">
            Clear ✕
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card-dark rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm text-white/50 mb-3">No products match your filters</p>
          <button onClick={clearFilters} className="btn-secondary text-xs">Clear Filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((opp: any) => <ProductCard key={opp.id} opp={opp} />)}
        </div>
      )}
    </div>
  );
}
