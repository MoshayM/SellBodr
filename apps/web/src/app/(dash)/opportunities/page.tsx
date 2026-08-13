'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { ScoreGauge, RecommendationBadge } from '@/components/ui/ScoreGauge';

function fmt(minor: number, currency = '') { return `${currency} ${(minor / 100).toFixed(0)}`.trim(); }

const PLATFORM_NAMES: Record<string, string> = {
  amazon: 'Amazon', ebay: 'eBay', shopee: 'Shopee', lazada: 'Lazada',
  tiktok: 'TikTok Shop', walmart: 'Walmart', noon: 'Noon', temu: 'Temu',
  mercadolibre: 'MercadoLibre', flipkart: 'Flipkart', meesho: 'Meesho',
  coupang: 'Coupang', rakuten: 'Rakuten', allegro: 'Allegro', bol: 'Bol.com',
  jumia: 'Jumia', takealot: 'Takealot', etsy: 'Etsy', daraz: 'Daraz',
  cdiscount: 'Cdiscount', onbuy: 'OnBuy', zalando: 'Zalando', otto: 'Otto',
};

function platformOf(code: string) {
  const p = code.split('_')[0];
  return PLATFORM_NAMES[p] || p.charAt(0).toUpperCase() + p.slice(1);
}

function countryCode(mpCode: string): string {
  const parts = mpCode.split('_');
  const last = parts[parts.length - 1];
  return last.length === 2 ? last.toUpperCase() : '';
}

function flag(cc: string): string {
  if (!cc || cc.length !== 2) return '';
  return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

function mkLabel(mp: any): string {
  const cc = countryCode(mp.code);
  const emoji = cc ? flag(cc) : '🛒';
  return `${emoji} ${platformOf(mp.code)}${cc ? ` ${cc}` : ''}`;
}

// ── Custom dark dropdown ──────────────────────────────────────────
function MarketplaceDropdown({ marketplaces, value, onChange, loading }: {
  marketplaces: any[]; value: string; onChange: (v: string) => void; loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setSearch('');
      }
    }
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const grouped: Record<string, any[]> = {};
  for (const mp of marketplaces) {
    const p = platformOf(mp.code);
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(mp);
  }

  const q = search.toLowerCase();
  const filtered: Record<string, any[]> = {};
  for (const [p, mps] of Object.entries(grouped)) {
    const f = mps.filter(mp =>
      p.toLowerCase().includes(q) ||
      mkLabel(mp).toLowerCase().includes(q) ||
      mp.code.includes(q)
    );
    if (f.length) filtered[p] = f;
  }

  const selected = marketplaces.find(mp => mp.code === value);
  const totalCount = marketplaces.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        disabled={loading}
        className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500/60 rounded-xl px-3 py-2.5 text-sm text-white min-w-[230px] min-h-[42px] transition-colors disabled:opacity-50 text-left focus:outline-none focus:ring-2 focus:ring-violet-500/20">
        <span className="flex-1 leading-snug">{loading ? 'Loading…' : (selected ? mkLabel(selected) : 'Select marketplace')}</span>
        <svg
          className={`shrink-0 w-3.5 h-3.5 text-white/40 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 8" fill="none">
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-72 bg-[#0d1526] border border-white/10 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-white/5">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-violet-500/60">
              <svg className="w-3.5 h-3.5 text-white/30 shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                autoFocus
                type="text"
                placeholder={`Search ${totalCount} marketplaces…`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60 text-xs leading-none">✕</button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto scrollbar-dark py-1">
            {Object.keys(filtered).length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-xs text-white/30">No marketplaces match "{search}"</div>
              </div>
            ) : (
              Object.entries(filtered).map(([platform, mps]) => (
                <div key={platform}>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/25 uppercase tracking-widest sticky top-0 bg-[#0d1526]">
                    {platform}
                  </div>
                  {mps.map((mp: any) => (
                    <button
                      key={mp.code}
                      type="button"
                      onClick={() => { onChange(mp.code); setOpen(false); setSearch(''); }}
                      className={`w-full text-left px-3 py-2 text-sm leading-snug transition-colors flex items-center gap-2.5 ${
                        mp.code === value
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}>
                      <span>{mkLabel(mp)}</span>
                      {mp.code === value && (
                        <svg className="ml-auto shrink-0 w-3.5 h-3.5 text-violet-400" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recommendation filter pills ───────────────────────────────────
const REC_FILTERS = [
  { value: '', label: 'All' },
  { value: 'launch', label: '🚀 Launch' },
  { value: 'hold',   label: '⏸ Hold' },
  { value: 'reject', label: '✕ Reject' },
];

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1,2,3,4,5,6].map(i => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-white/10 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

export default function OpportunitiesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState({ marketplace: 'amazon_us', recommendation: '' });
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');

  const { data: marketplaces = [], isLoading: mktLoading } = useQuery({
    queryKey: ['marketplaces', 'active'],
    queryFn: () => api.marketplaces.list({ active: true }),
  });

  const { data: opps = [], isLoading } = useQuery({
    queryKey: ['opportunities', filter],
    queryFn: () => api.opportunities.list(filter.recommendation ? filter : { marketplace: filter.marketplace }),
  });

  const runSearch = useMutation({
    mutationFn: () => api.searches.create({ marketplace: filter.marketplace }),
    onSuccess: async (data: any) => {
      setSearching(true); setSearchStatus('AI pipeline running…');
      const poll = setInterval(async () => {
        try {
          const s = await api.searches.get(data.searchId);
          if (s.status === 'complete' || s.status === 'failed') {
            clearInterval(poll); setSearching(false);
            setSearchStatus(s.status === 'complete' ? '✓ Complete' : '✗ Failed');
            qc.invalidateQueries({ queryKey: ['opportunities'] });
            setTimeout(() => setSearchStatus(''), 3000);
          }
        } catch { /* silent retry */ }
      }, 2000);
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
        <button
          onClick={() => runSearch.mutate()}
          disabled={searching}
          className="btn-primary text-sm disabled:opacity-60 shrink-0">
          {searching
            ? <><span className="animate-spin inline-block mr-1">⟳</span> {searchStatus}</>
            : <><span className="mr-1">+</span> New Search</>}
        </button>
      </div>

      {/* Filters */}
      <div className="card-dark rounded-xl p-3 sm:p-4 mb-4 flex flex-wrap gap-4 items-end">
        {/* Marketplace dropdown */}
        <div>
          <label className="text-xs font-medium text-white/50 block mb-1.5">
            Marketplace
            {!mktLoading && (
              <span className="ml-1.5 text-white/25 font-normal">({(marketplaces as any[]).length} available)</span>
            )}
          </label>
          <MarketplaceDropdown
            marketplaces={marketplaces as any[]}
            value={filter.marketplace}
            onChange={v => setFilter(f => ({ ...f, marketplace: v }))}
            loading={mktLoading}
          />
        </div>

        {/* Recommendation pills */}
        <div>
          <label className="text-xs font-medium text-white/50 block mb-1.5">Filter by</label>
          <div className="flex gap-1.5">
            {REC_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(f => ({ ...f, recommendation: value }))}
                className={`px-3 py-2 rounded-lg text-xs font-medium leading-none transition-colors whitespace-nowrap min-h-[42px] ${
                  filter.recommendation === value
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {(opps as any[]).length > 0 && (
          <div className="ml-auto text-xs text-white/30 self-end pb-1">
            {(opps as any[]).length} result{(opps as any[]).length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left px-4 py-3.5 font-semibold text-white/40 text-xs uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3.5 font-semibold text-white/40 text-xs uppercase tracking-wide">Market</th>
                <th className="text-center px-4 py-3.5 font-semibold text-white/40 text-xs uppercase tracking-wide">Score</th>
                <th className="text-left px-4 py-3.5 font-semibold text-white/40 text-xs uppercase tracking-wide">Decision</th>
                <th className="text-right px-4 py-3.5 font-semibold text-white/40 text-xs uppercase tracking-wide">Net Profit</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading
                ? [1,2,3].map(i => <SkeletonRow key={i} />)
                : (opps as any[]).length === 0
                ? (
                  <tr><td colSpan={6}>
                    <div className="py-14 text-center">
                      <div className="text-4xl mb-3">🎯</div>
                      <p className="font-medium text-white/70 mb-1">No opportunities yet</p>
                      <p className="text-sm text-white/40">Click <strong className="text-white/70">+ New Search</strong> to discover products</p>
                    </div>
                  </td></tr>
                )
                : (opps as any[]).map((opp: any) => {
                  const cc = countryCode(opp.marketplace?.code || '');
                  return (
                    <tr key={opp.id} className="hover:bg-violet-500/5 transition-colors group cursor-pointer"
                      onClick={() => { window.location.href = `/opportunities/${opp.id}`; }}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
                            {opp.product?.imageUrl ? (
                              <Image src={opp.product.imageUrl} alt={opp.product.title} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">🎯</div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white line-clamp-1">{opp.product?.title}</div>
                            <div className="text-xs text-white/40 mt-0.5 leading-snug">{opp.product?.category?.replace(/_/g,' ')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm font-medium text-white/80 leading-snug">
                          {cc ? flag(cc) : '🛒'} {platformOf(opp.marketplace?.code || '')}
                        </div>
                        <div className="text-xs text-white/40 leading-snug">{opp.marketplace?.currency}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <ScoreGauge score={opp.score?.opportunity || 0} size="sm" />
                      </td>
                      <td className="px-4 py-3.5">
                        <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence)} />
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-white">
                        {opp.profitModel ? fmt(opp.profitModel.netProfitMinor, opp.marketplace?.currency) : <span className="text-white/25">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/opportunities/${opp.id}`}
                          onClick={e => e.stopPropagation()}
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
