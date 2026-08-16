'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, isPro } from '@/lib/api';
import { ProGate } from '@/components/ui/ProGate';
import { ScoreGauge, RecommendationBadge } from '@/components/ui/ScoreGauge';

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? '#4ade80' : value >= 40 ? '#fbbf24' : '#f87171';
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 text-xs text-white/40 text-right shrink-0 leading-snug">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value || 0}%`, backgroundColor: color }} />
      </div>
      <span className="w-7 text-xs font-bold text-white/60 shrink-0 leading-snug">{Math.round(value || 0)}</span>
    </div>
  );
}

function OppCard({ opp }: { opp: any }) {
  const s = opp.score || {};
  return (
    <div className="card-dark rounded-xl p-4 sm:p-5 hover:border-violet-500/20 transition-all">
      <div className="flex items-start gap-3 sm:gap-4">
        <ScoreGauge score={s.opportunity || 0} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white mb-1.5 truncate text-sm leading-snug">{opp.product?.title}</div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs leading-none font-mono bg-white/10 px-2 py-1 rounded text-white/60">
              {opp.marketplace?.code?.toUpperCase()}
            </span>
            <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence)} />
          </div>
          <div className="space-y-1.5">
            {[['Demand', s.demand], ['Competition', s.competition], ['Margin', s.margin], ['Trend', s.trend]].map(([l, v]) => (
              <ScoreBar key={l as string} label={l as string} value={v as number} />
            ))}
          </div>
        </div>
        <Link href={`/opportunities/${opp.id}`}
          className="shrink-0 text-xs text-violet-400 font-medium hover:underline whitespace-nowrap mt-0.5">
          Detail →
        </Link>
      </div>
    </div>
  );
}

const SECTIONS = [
  {
    key: 'launch', label: 'Launch', emoji: '🚀',
    color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20',
    desc: 'Strong — all key metrics pass thresholds',
  },
  {
    key: 'hold', label: 'Hold', emoji: '⏸',
    color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
    desc: 'Promising — some metrics need improvement',
  },
  {
    key: 'reject', label: 'Reject', emoji: '✕',
    color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20',
    desc: 'Does not meet profitability criteria',
  },
];

export default function RecommendationPage() {
  const [isFree, setIsFree] = useState(true);
  useEffect(() => { setIsFree(!isPro()); }, []);

  const { data: opps = [], isLoading } = useQuery({ queryKey: ['opportunities'], queryFn: () => api.opportunities.list({}), enabled: !isFree });

  if (isFree) return (
    <ProGate
      icon="🤖"
      feature="AI Recommendations"
      tagline="Get personalised Launch / Hold / Reject verdicts for every opportunity — ranked by risk-adjusted profit potential with full AI reasoning and confidence scores."
      benefits={[
        'Launch / Hold / Reject with confidence %',
        'Risk-ranked shortlist sorted by net margin',
        'Full AI reasoning chain per verdict',
        '7-dimension score breakdown + evidence',
      ]}
    />
  );
  const grouped = SECTIONS.map(s => ({ ...s, opps: (opps as any[]).filter(o => o.recommendation === s.key) }));
  const total = (opps as any[]).length;

  if (isLoading) return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Recommendations</h1>
        <p className="text-sm text-white/40 mt-0.5 leading-snug">Launch / Hold / Reject decisions with confidence scores</p>
      </div>
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="card-dark rounded-xl h-24 animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Recommendations</h1>
        <p className="text-sm text-white/40 mt-0.5 leading-snug">Launch / Hold / Reject decisions with confidence scores</p>
      </div>

      {/* Summary strip */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-7">
          {grouped.map(({ key, label, emoji, color, bg, border, opps: list }) => (
            <div key={key} className={`rounded-xl border ${border} ${bg} p-3 sm:p-4 text-center`}>
              <div className={`text-2xl sm:text-3xl font-bold leading-none mb-1 ${color}`}>{list.length}</div>
              <div className={`text-xs sm:text-sm font-semibold leading-snug mt-1 ${color}`}>
                {emoji} {label}
              </div>
              <div className="text-xs text-white/30 mt-0.5 leading-snug hidden sm:block">
                {total > 0 ? Math.round(list.length / total * 100) : 0}% of {total}
              </div>
            </div>
          ))}
        </div>
      )}

      {total === 0 && (
        <div className="card-dark rounded-xl p-12 sm:p-14 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <p className="font-semibold text-white mb-1">No recommendations yet</p>
          <p className="text-sm text-white/40 mb-5">Run a search to get AI-powered Launch / Hold / Reject decisions</p>
          <Link href="/opportunities" className="btn-primary text-sm">Get Recommendations →</Link>
        </div>
      )}

      {grouped.map(({ key, label, emoji, color, opps: list, desc }) => list.length > 0 && (
        <div key={key} className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className={`text-sm font-bold leading-none ${color}`}>{emoji} {label}</h2>
            <span className="text-xs text-white/30 leading-snug">{desc}</span>
          </div>
          <div className="space-y-3">{list.map(o => <OppCard key={o.id} opp={o} />)}</div>
        </div>
      ))}
    </div>
  );
}
