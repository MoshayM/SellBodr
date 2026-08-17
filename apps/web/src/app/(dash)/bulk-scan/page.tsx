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
            <span className={`text-xs ${tooMany ? 'text-rose-400' : keywords.length > 15 ? 'text-amber-400' : 'text-white/30'}`}>
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
            className="w-full btn-primary py-3 text-sm font-semibold disabled:opacity-40 rounded-xl">
            {scan.isPending ? '&#x27F3; Scanning…' : `⚡ Scan ${keywords.length || ''} Product${keywords.length !== 1 ? 's' : ''}`}
          </button>

          <div className="card-dark p-4 text-xs text-white/35 space-y-1.5">
            <div className="flex items-center gap-2"><span className="text-emerald-400">&#x2713;</span> AI scores all products in parallel</div>
            <div className="flex items-center gap-2"><span className="text-emerald-400">&#x2713;</span> Results ranked by Opportunity Score</div>
            <div className="flex items-center gap-2"><span className="text-emerald-400">&#x2713;</span> Click any result to open full analysis</div>
          </div>
        </div>
      </div>

      {/* Results */}
      {scan.isPending && (
        <div className="card-dark p-12 text-center">
          <div className="animate-spin text-4xl text-violet-400 mb-4">&#x27F3;</div>
          <p className="text-white/50 text-sm">Running AI scan on {keywords.length} product{keywords.length !== 1 ? 's' : ''}&hellip;</p>
          <p className="text-white/25 text-xs mt-1">This may take up to 30 seconds</p>
        </div>
      )}

      {!scan.isPending && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-white/50">{results.length} result{results.length !== 1 ? 's' : ''} &#8212; ranked by Opportunity Score</div>
          </div>
          {results
            .sort((a: any, b: any) => (b.score?.opportunity || 0) - (a.score?.opportunity || 0))
            .map((opp: any, i: number) => (
              <div key={opp.id || i}
                onClick={() => opp.id && router.push(`/opportunities/${opp.id}`)}
                className={`card-dark p-4 flex items-center gap-4 ${opp.id ? 'cursor-pointer hover:bg-white/3 transition-colors' : ''}`}>
                <div className="text-xl font-black text-white/20 w-6 shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white mb-1 line-clamp-1">{opp.product?.title || opp.keyword}</div>
                  <div className="flex flex-wrap gap-3 text-xs text-white/40">
                    <span>{opp.marketplace?.name}</span>
                    {opp.profitModel?.netProfit > 0 && (
                      <span className="text-emerald-400">+${(opp.profitModel.netProfit / 100).toFixed(2)}/unit</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <div className="text-lg font-black" style={{
                      color: (opp.score?.opportunity || 0) >= 70 ? '#10b981' : (opp.score?.opportunity || 0) >= 50 ? '#f59e0b' : '#ef4444'
                    }}>{Math.round(opp.score?.opportunity || 0)}</div>
                    <div className="text-[10px] text-white/25">score</div>
                  </div>
                  <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence || 0)} />
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
