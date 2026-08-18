'use client';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, isPro } from '@/lib/api';
import { ProGate } from '@/components/ui/ProGate';
import { ScoreBadge, RecommendationBadge } from '@/components/ui/ScoreGauge';

const MARKETPLACES = [
  'Amazon US','Amazon UK','Amazon DE','Amazon CA','Amazon AU','Etsy','eBay','Walmart','TikTok Shop',
];

const BULK_STAGES = [
  { icon: '📋', label: 'Parsing keywords',     ms: 2000 },
  { icon: '🔍', label: 'Scanning marketplace', ms: 5000 },
  { icon: '🤖', label: 'AI scoring',           ms: 6000 },
  { icon: '📊', label: 'Ranking results',      ms: 4000 },
  { icon: '✅', label: 'Finalising',           ms: 2000 },
];

export default function BulkScanPage() {
  const router   = useRouter();
  const [isFree, setIsFree]   = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [marketplace, setMkt] = useState('Amazon US');
  const [text, setText]       = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    setIsGuest(!localStorage.getItem('bs_access_token'));
    setIsFree(!isPro());
  }, []);

  const scan = useMutation({
    mutationFn: ({ keywords, marketplace }: { keywords: string[]; marketplace: string }) =>
      api.opportunities.bulkScan(keywords, marketplace),
    onSuccess: (data: any) => {
      setResults(Array.isArray(data) ? data : data.opportunities || []);
    },
  });

  const [bulkStep, setBulkStep] = useState(0);
  useEffect(() => {
    if (!scan.isPending) { setBulkStep(0); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cum = 0;
    for (let i = 1; i < BULK_STAGES.length - 1; i++) {
      cum += BULK_STAGES[i - 1].ms;
      const idx = i;
      timers.push(setTimeout(() => setBulkStep(idx), cum));
    }
    return () => timers.forEach(clearTimeout);
  }, [scan.isPending]);
  const bulkPct = Math.min(90, Math.round((bulkStep / (BULK_STAGES.length - 1)) * 100));

  if (isGuest || isFree) return (
    <ProGate
      icon="⚡"
      feature="Bulk Scan"
      tagline="Scan up to 20 product keywords at once — perfect for rapid market mapping."
      benefits={[
        'Up to 20 keywords per bulk scan',
        'All results scored and ranked in a single view',
        'Compare opportunities side by side',
        'Export bulk results to CSV',
      ]}
    />
  );

  const keywords = text.split('\n').map(s => s.trim()).filter(Boolean);
  const tooMany  = keywords.length > 20;

  function handleScan() {
    if (keywords.length === 0 || tooMany) return;
    scan.mutate({ keywords, marketplace });
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white mb-1">Bulk Scan</h1>
        <p className="text-sm text-white/40">Scan multiple products at once — up to 20 keywords per run</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Input */}
        <div className="md:col-span-2 card-dark p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-white/50 font-semibold uppercase tracking-widest">Keywords (one per line)</label>
            <span className={`text-xs ${tooMany ? 'text-rose-400' : keywords.length > 15 ? 'text-amber-400' : 'text-white/50'}`}>
              {keywords.length} / 20
            </span>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={'brass diyas\nhandmade candles\nyoga mat cork\ncopper water bottle\njute tote bag'}
            rows={10}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 resize-none font-mono"
          />
          {tooMany && <p className="text-xs text-rose-400">Maximum 20 keywords per scan. Remove {keywords.length - 20} keyword{keywords.length - 20 !== 1 ? 's' : ''}.</p>}
        </div>

        {/* Config + go */}
        <div className="space-y-3">
          <div className="card-dark p-4">
            <label className="text-xs text-white/40 mb-1.5 block">Target Marketplace</label>
            <select value={marketplace} onChange={e => setMkt(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
              {MARKETPLACES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <button onClick={handleScan}
            disabled={scan.isPending || keywords.length === 0 || tooMany}
            className={`relative overflow-hidden w-full text-sm font-semibold inline-flex items-center justify-center gap-2 py-3 rounded-xl min-h-[48px] select-none transition-all duration-300 ${scan.isPending ? 'cursor-not-allowed' : 'btn-primary disabled:opacity-40'}`}
            style={scan.isPending ? { background: 'linear-gradient(135deg,rgba(109,40,217,0.95) 0%,rgba(79,70,229,0.95) 100%)', boxShadow: '0 0 24px rgba(124,58,237,0.6),0 4px 16px rgba(124,58,237,0.3)' } : {}}>
            {scan.isPending && (
              <>
                <span className="absolute inset-0 bg-white/10 transition-all duration-[900ms] ease-out pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - bulkPct}% 0 0)` }} />
                <span className="absolute inset-0 pointer-events-none animate-shimmer"
                  style={{ background: 'linear-gradient(90deg,transparent 30%,rgba(255,255,255,0.15) 50%,transparent 70%)', backgroundSize: '200% 100%' }} />
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 overflow-hidden pointer-events-none">
                  <span className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-300 to-indigo-300 transition-all duration-[900ms] ease-out" style={{ width: `${bulkPct}%` }} />
                </span>
              </>
            )}
            <span className="relative z-10 flex items-center gap-2">
              {scan.isPending ? (
                <>
                  <span className="text-lg animate-pulse leading-none">{BULK_STAGES[bulkStep]?.icon}</span>
                  <span className="truncate">{BULK_STAGES[bulkStep]?.label}…</span>
                  <span className="text-[11px] text-violet-200/70 font-mono tabular-nums ml-1">{bulkPct}%</span>
                </>
              ) : keywords.length === 0 || tooMany
                ? <>⚡ Scan Products</>
                : <>⚡ Scan {keywords.length} Product{keywords.length !== 1 ? 's' : ''}</>}
            </span>
          </button>

          <div className="card-dark p-4 text-xs text-white/55 space-y-1.5">
            <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> AI scores all products in parallel</div>
            <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Results ranked by Opportunity Score</div>
            <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Click any result to open full analysis</div>
          </div>
        </div>
      </div>

      {/* Results loading */}
      {scan.isPending && (
        <div className="card-dark p-12 text-center">
          <div className="text-5xl mb-4 animate-pulse leading-none">{BULK_STAGES[bulkStep]?.icon}</div>
          <p className="text-white font-semibold mb-1">{BULK_STAGES[bulkStep]?.label}…</p>
          <p className="text-white/50 text-sm mb-5">Running AI scan on {keywords.length} product{keywords.length !== 1 ? 's' : ''}</p>
          <div className="max-w-xs mx-auto h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-[900ms] ease-out" style={{ width: `${bulkPct}%` }} />
          </div>
          <p className="text-[11px] text-violet-300/60 font-mono mt-2">{bulkPct}%</p>
        </div>
      )}

      {!scan.isPending && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-white/50">{results.length} result{results.length !== 1 ? 's' : ''} — ranked by Opportunity Score</div>
          </div>
          {results
            .sort((a: any, b: any) => (b.score?.opportunity || 0) - (a.score?.opportunity || 0))
            .map((opp: any, i: number) => {
              const score = Math.round(opp.score?.opportunity || 0);
              const scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
              return (
                <div key={opp.id || i}
                  onClick={() => opp.id && router.push(`/opportunities/${opp.id}`)}
                  className={`card-dark rounded-xl p-4 ${opp.id ? 'cursor-pointer hover:bg-white/3 transition-colors' : ''}`}>
                  {/* Top row: rank + title + score ring */}
                  <div className="flex items-start gap-3">
                    <div className="text-lg font-black text-white/30 w-6 shrink-0 mt-0.5">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white leading-snug line-clamp-2">{opp.product?.title || opp.keyword}</div>
                      {opp.marketplace?.name && (
                        <div className="text-[11px] text-white/40 mt-0.5 leading-none">{opp.marketplace.name}</div>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 shrink-0"
                      style={{ color: scoreColor, borderColor: scoreColor+'60', backgroundColor: scoreColor+'12' }}>
                      {score}
                    </div>
                  </div>
                  {/* Bottom row: recommendation + profit */}
                  <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-white/6 ml-9">
                    <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence || 0)} />
                    {opp.profitModel?.netProfit > 0 && (
                      <span className="text-xs font-bold text-emerald-400 tabular-nums">
                        +${(opp.profitModel.netProfit / 100).toFixed(2)}/unit
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
