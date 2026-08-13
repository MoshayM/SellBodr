'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { ScoreGauge, RecommendationBadge } from '@/components/ui/ScoreGauge';

function fmt(minor: number, currency = '') { return `${currency} ${(minor / 100).toFixed(0)}`.trim(); }

function flag(country: string) {
  return country.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

const PLATFORM_NAMES: Record<string, string> = {
  amazon: 'Amazon', ebay: 'eBay', shopee: 'Shopee', lazada: 'Lazada',
  tiktok: 'TikTok Shop', walmart: 'Walmart', noon: 'Noon', temu: 'Temu',
  mercadolibre: 'MercadoLibre', flipkart: 'Flipkart', meesho: 'Meesho',
  coupang: 'Coupang', rakuten: 'Rakuten', allegro: 'Allegro', bol: 'bol.com',
  jumia: 'Jumia', takealot: 'Takealot', etsy: 'Etsy', daraz: 'Daraz',
};

function platformOf(code: string) {
  const p = code.split('_')[0];
  return PLATFORM_NAMES[p] || p.charAt(0).toUpperCase() + p.slice(1);
}

function mkLabel(mp: any) {
  return `${flag(mp.country)} ${platformOf(mp.code)} ${mp.country}`;
}

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

  const grouped = (marketplaces as any[]).reduce((acc: Record<string, any[]>, mp: any) => {
    const platform = platformOf(mp.code);
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(mp);
    return acc;
  }, {});

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

  const selectCls = 'bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 min-h-[40px] transition-colors [&>option]:bg-[#0a0f1e] [&>option]:text-white [&>optgroup]:text-white/40';

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
            ? <><span className="animate-spin inline-block mr-1">&#x27F3;</span> {searchStatus}</>
            : <><span className="mr-1">+</span> New Search</>}
        </button>
      </div>

      {/* Filters */}
      <div className="card-dark rounded-xl p-3 sm:p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-white/50 block mb-1.5">
            Marketplace
            {!mktLoading && (
              <span className="ml-1.5 text-white/30 font-normal">({(marketplaces as any[]).length} available)</span>
            )}
          </label>
          <select
            value={filter.marketplace}
            onChange={e => setFilter(f => ({ ...f, marketplace: e.target.value }))}
            disabled={mktLoading}
            className={`${selectCls} min-w-[220px] disabled:opacity-50`}>
            {mktLoading
              ? <option>Loading marketplaces…</option>
              : Object.entries(grouped).map(([platform, mps]) => (
                  <optgroup key={platform} label={platform}>
                    {(mps as any[]).map((mp: any) => (
                      <option key={mp.code} value={mp.code}>{mkLabel(mp)}</option>
                    ))}
                  </optgroup>
                ))
            }
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-white/50 block mb-1.5">Filter by</label>
          <select value={filter.recommendation}
            onChange={e => setFilter(f => ({ ...f, recommendation: e.target.value }))}
            className={selectCls}>
            <option value="">All recommendations</option>
            <option value="launch">Launch</option>
            <option value="hold">Hold</option>
            <option value="reject">Reject</option>
          </select>
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
                : (opps as any[]).map((opp: any) => (
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
                      <span className="text-sm font-medium text-white/80">
                        {opp.marketplace ? `${flag(opp.marketplace.country)} ${platformOf(opp.marketplace.code)}` : '—'}
                      </span>
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
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
