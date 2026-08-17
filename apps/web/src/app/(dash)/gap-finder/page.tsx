'use client';
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, isPro } from '@/lib/api';
import { ProGate } from '@/components/ui/ProGate';
import { ScoreBadge, RecommendationBadge } from '@/components/ui/ScoreGauge';

const MARKETPLACES = ['Amazon US','Amazon UK','Amazon DE','Amazon CA','Amazon AU','Etsy','eBay','Walmart','TikTok Shop'];

const GAP_CRITERIA = [
  { key: 'low-reviews',   label: 'Low Review Count',   desc: 'Top competitors have < 200 reviews', icon: '⭐' },
  { key: 'high-demand',   label: 'High Demand',         desc: 'Demand score ≥ 70',                  icon: '📈' },
  { key: 'weak-listings', label: 'Weak Listings',       desc: 'Average rating < 4.2★',              icon: '📝' },
  { key: 'low-sat',       label: 'Low Saturation',      desc: 'Saturation score ≥ 65',              icon: '🎯' },
];

function GapScore({ opp }: { opp: any }) {
  const s = opp.score || {};
  const demand = s.demand || 0;
  const comp   = s.competition || 0;
  const sat    = s.saturation  || 0;
  const gap    = Math.round((demand * 0.4 + comp * 0.35 + sat * 0.25));
  const color  = gap >= 70 ? '#10b981' : gap >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-sm font-bold" style={{ color }}>{gap}</span>
      <span className="text-xs text-white/50">gap</span>
    </div>
  );
}

export default function GapFinderPage() {
  const router = useRouter();
  const [isFree, setIsFree]     = useState(true);
  const [isGuest, setIsGuest]   = useState(false);
  const [marketplace, setMkt]   = useState('Amazon US');
  const [criteria, setCriteria] = useState<string[]>(['high-demand', 'low-reviews']);
  const [minGap, setMinGap]     = useState(50);
  const [sort, setSort]         = useState<'gap' | 'demand' | 'newest'>('gap');

  useEffect(() => {
    setIsGuest(!localStorage.getItem('bs_access_token'));
    setIsFree(!isPro());
  }, []);

  const { data: opps = [], isLoading } = useQuery<any[]>({
    queryKey: ['opportunities'],
    queryFn: () => api.opportunities.list(),
    enabled: !isGuest,
  });

  const gaps = useMemo(() => {
    return opps
      .map((opp: any) => {
        const s = opp.score || {};
        const demand = s.demand || 0;
        const comp   = s.competition || 0;
        const sat    = s.saturation  || 0;
        const gapScore = Math.round(demand * 0.4 + comp * 0.35 + sat * 0.25);
        const flags: string[] = [];
        if (comp >= 60)  flags.push('low-reviews');
        if (demand >= 70) flags.push('high-demand');
        if (sat >= 65)   flags.push('low-sat');
        if (comp >= 55 && (s.margin || 0) >= 45) flags.push('weak-listings');
        return { ...opp, gapScore, flags };
      })
      .filter((opp: any) => {
        if (opp.gapScore < minGap) return false;
        if (criteria.length > 0 && !criteria.some(c => opp.flags.includes(c))) return false;
        if (marketplace !== 'All' && opp.marketplace?.name !== marketplace && !opp.marketplace?.code?.includes(marketplace.split(' ')[1]?.toLowerCase() || '')) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        if (sort === 'gap')    return b.gapScore - a.gapScore;
        if (sort === 'demand') return (b.score?.demand || 0) - (a.score?.demand || 0);
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [opps, marketplace, criteria, minGap, sort]);

  if (isGuest || isFree) return (
    <ProGate
      icon="🔍"
      feature="Gap Finder"
      tagline="Discover high-demand product niches where competitors are weak — the easiest market entry opportunities."
      benefits={[
        'Gap Score for every opportunity (demand vs. competition)',
        'Filter by low-review count, weak listings, low saturation',
        'Sorted by entry difficulty — easiest gaps first',
        'Export gap list to CSV',
      ]}
    />
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white mb-1">Gap Finder</h1>
        <p className="text-sm text-white/40">Products where demand outpaces competition — your easiest market entry points</p>
      </div>

      {/* Filters */}
      <div className="card-dark p-4 mb-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-white/40 mb-1 block">Marketplace</label>
            <select value={marketplace} onChange={e => setMkt(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
              <option>All</option>
              {MARKETPLACES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-white/40 mb-1 block">Min Gap Score: {minGap}</label>
            <input type="range" min={30} max={85} step={5} value={minGap}
              onChange={e => setMinGap(Number(e.target.value))}
              className="w-full accent-violet-500" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-white/40 mb-1 block">Sort by</label>
            <select value={sort} onChange={e => setSort(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
              <option value="gap">Gap Score</option>
              <option value="demand">Demand</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Criteria chips */}
        <div>
          <div className="text-xs text-white/40 mb-2">Gap Criteria (any match)</div>
          <div className="flex flex-wrap gap-2">
            {GAP_CRITERIA.map(c => {
              const active = criteria.includes(c.key);
              return (
                <button key={c.key}
                  onClick={() => setCriteria(prev => active ? prev.filter(x => x !== c.key) : [...prev, c.key])}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                    active ? 'border-violet-500/50 bg-violet-500/15 text-violet-300' : 'border-white/10 text-white/40 hover:border-white/25'
                  }`}>
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin text-3xl text-violet-400">&#x27F3;</div>
        </div>
      ) : gaps.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-white/40 text-sm">No gaps match your criteria. Try lowering the minimum score or adjusting filters.</p>
          <p className="text-white/50 text-xs mt-2">Run more scans on Scout to populate the gap finder.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-white/40">{gaps.length} gap{gaps.length !== 1 ? 's' : ''} found</div>
            <div className="flex flex-wrap gap-1.5">
              {GAP_CRITERIA.filter(c => criteria.includes(c.key)).map(c => (
                <span key={c.key} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
                  {c.icon} {c.label}
                </span>
              ))}
            </div>
          </div>

          {gaps.map((opp: any) => {
            const s = opp.score || {};
            return (
              <div key={opp.id}
                onClick={() => router.push(`/opportunities/${opp.id}?tab=Competition`)}
                className="card-dark p-4 cursor-pointer hover:bg-white/3 transition-colors group">
                <div className="flex items-start gap-4">
                  {/* Gap score ring */}
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border-2"
                    style={{
                      borderColor: opp.gapScore >= 70 ? '#10b981' : opp.gapScore >= 50 ? '#f59e0b' : '#ef4444',
                      color:       opp.gapScore >= 70 ? '#10b981' : opp.gapScore >= 50 ? '#f59e0b' : '#ef4444',
                      background:  opp.gapScore >= 70 ? 'rgba(16,185,129,0.08)' : opp.gapScore >= 50 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                    }}>
                    {opp.gapScore}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                        {opp.product?.title}
                      </h3>
                      <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence)} />
                    </div>

                    {/* Sub-scores */}
                    <div className="flex flex-wrap gap-3 text-xs mb-2">
                      {[
                        { l: 'Demand',      v: s.demand,      color: '#60a5fa' },
                        { l: 'Competition', v: s.competition, color: '#a78bfa' },
                        { l: 'Saturation',  v: s.saturation,  color: '#34d399' },
                        { l: 'Margin',      v: s.margin,      color: '#fbbf24' },
                      ].map(({ l, v, color }) => (
                        <div key={l} className="flex items-center gap-1">
                          <span className="text-white/55">{l}:</span>
                          <span className="font-semibold" style={{ color }}>{Math.round(v || 0)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Gap flags */}
                    <div className="flex flex-wrap gap-1.5">
                      {opp.flags.map((f: string) => {
                        const c = GAP_CRITERIA.find(x => x.key === f);
                        return c ? (
                          <span key={f} className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/8 text-emerald-300">
                            {c.icon} {c.label}
                          </span>
                        ) : null;
                      })}
                      <span className="text-[10px] text-white/50 ml-auto">{opp.marketplace?.code?.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
