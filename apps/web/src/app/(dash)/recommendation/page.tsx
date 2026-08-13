'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ScoreGauge, RecommendationBadge } from '@/components/ui/ScoreGauge';

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? '#16a34a' : value >= 40 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-16 sm:w-20 text-xs text-gray-400 text-right shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value || 0}%`, backgroundColor: color }} />
      </div>
      <span className="w-7 text-xs font-bold text-gray-600 shrink-0">{Math.round(value || 0)}</span>
    </div>
  );
}

function OppCard({ opp }: { opp: any }) {
  const s = opp.score || {};
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-3 sm:gap-4">
        <ScoreGauge score={s.opportunity || 0} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 mb-1 truncate text-sm">{opp.product?.title}</div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
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
          className="shrink-0 text-xs text-green-600 font-medium hover:underline whitespace-nowrap">
          Detail &rarr;
        </Link>
      </div>
    </div>
  );
}

const SECTIONS = [
  { key: 'launch', label: 'Launch',  emoji: '&#x1F680;', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', desc: 'Strong — all key metrics pass thresholds' },
  { key: 'hold',   label: 'Hold',    emoji: '&#x23F8;',  color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', desc: 'Promising — some metrics need improvement' },
  { key: 'reject', label: 'Reject',  emoji: '&times;',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   desc: 'Does not meet profitability criteria' },
];

export default function RecommendationPage() {
  const { data: opps = [], isLoading } = useQuery({ queryKey: ['opportunities'], queryFn: () => api.opportunities.list({}) });

  const grouped = SECTIONS.map(s => ({ ...s, opps: (opps as any[]).filter(o => o.recommendation === s.key) }));
  const total = (opps as any[]).length;

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl h-24 animate-pulse" />)}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Recommendations</h1>
        <p className="text-sm text-gray-400 mt-0.5">Launch / Hold / Reject decisions with confidence scores</p>
      </div>

      {/* Summary strip */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-7">
          {grouped.map(({ key, label, emoji, color, bg, border, opps: list }) => (
            <div key={key} className={`rounded-xl border ${border} ${bg} p-3 sm:p-4 text-center`}>
              <div className={`text-2xl sm:text-3xl font-bold ${color}`}>{list.length}</div>
              <div className={`text-xs sm:text-sm font-medium mt-0.5 ${color}`}>
                <span dangerouslySetInnerHTML={{ __html: `${emoji} ${label}` }} />
              </div>
              <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                {Math.round(list.length / total * 100)}% of {total}
              </div>
            </div>
          ))}
        </div>
      )}

      {total === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 sm:p-14 text-center shadow-sm">
          <div className="text-4xl mb-3">🤖</div>
          <p className="font-medium text-gray-700 mb-1">No recommendations yet</p>
          <p className="text-sm text-gray-400">
            Go to <Link href="/opportunities" className="text-green-600 hover:underline">Opportunities</Link> and run a search
          </p>
        </div>
      )}

      {grouped.map(({ key, label, emoji, color, opps: list, desc }) => list.length > 0 && (
        <div key={key} className="mb-8">
          <div className="flex flex-wrap items-baseline gap-2 mb-3">
            <h2 className={`text-sm font-bold ${color}`} dangerouslySetInnerHTML={{ __html: `${emoji} ${label}` }} />
            <span className="text-xs text-gray-400">{desc}</span>
          </div>
          <div className="space-y-3">{list.map(o => <OppCard key={o.id} opp={o} />)}</div>
        </div>
      ))}
    </div>
  );
}
