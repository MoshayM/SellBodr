'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProfitWaterfall } from '@/components/profit/ProfitWaterfall';

export default function ProfitabilityPage() {
  const { data: opps = [] } = useQuery({ queryKey: ['opportunities'], queryFn: () => api.opportunities.list({}) });
  const [selected, setSelected] = useState<string>('');

  const opp = (opps as any[]).find(o => o.id === selected) || (opps as any[])[0];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Profitability</h1>
        <p className="text-sm text-white/40 mt-0.5 leading-snug">Full landed-cost to net profit waterfall with ROI and break-even</p>
      </div>

      {/* Mobile dropdown */}
      {(opps as any[]).length > 0 && (
        <div className="md:hidden mb-4">
          <label className="block text-xs font-medium text-white/50 mb-1.5">Select Opportunity</label>
          <select
            value={selected || (opps as any[])[0]?.id || ''}
            onChange={e => setSelected(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 [&>option]:bg-[#0a0f1e]">
            {(opps as any[]).map((o: any) => (
              <option key={o.id} value={o.id}>{o.product?.title} · {o.marketplace?.code?.toUpperCase()}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-64 shrink-0">
          <div className="card-dark rounded-xl p-3 sticky top-4">
            <div className="text-[10px] leading-none font-semibold text-white/30 uppercase tracking-widest mb-3 px-2 mt-1">
              Select Opportunity
            </div>
            <div className="space-y-0.5">
              {(opps as any[]).map((o: any) => (
                <button key={o.id} onClick={() => setSelected(o.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors leading-snug ${
                    (selected || (opps as any[])[0]?.id) === o.id
                      ? 'bg-violet-500/20 text-violet-300 font-medium border border-violet-500/20'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }`}>
                  <div className="truncate text-inherit">{o.product?.title}</div>
                  <div className="text-white/30 font-normal mt-0.5">{o.marketplace?.code?.toUpperCase()}</div>
                </button>
              ))}
              {(opps as any[]).length === 0 && (
                <div className="text-xs text-white/30 px-3 py-2">No data — run a search</div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {opp?.profitModel ? (
            <div className="card-dark rounded-xl p-4 sm:p-6">
              <div className="flex items-start justify-between mb-5 gap-3">
                <div>
                  <div className="font-semibold text-white leading-snug">{opp.product?.title}</div>
                  <div className="text-xs text-white/40 mt-1 leading-snug">
                    {opp.marketplace?.code?.toUpperCase()} · {opp.marketplace?.currency}
                  </div>
                </div>
                <Link href={`/opportunities/${opp.id}`}
                  className="shrink-0 btn-secondary text-xs px-3 py-2 min-h-0">
                  Full Detail →
                </Link>
              </div>
              <ProfitWaterfall profit={opp.profitModel} currency={opp.marketplace?.currency} />
            </div>
          ) : (opps as any[]).length === 0 ? (
            <div className="card-dark rounded-xl p-12 sm:p-16 text-center">
              <div className="text-5xl mb-4">💰</div>
              <p className="font-semibold text-white mb-1">No opportunities yet</p>
              <p className="text-sm text-white/40 mb-5">Run a search to see profit breakdowns</p>
              <Link href="/opportunities" className="btn-primary text-sm">Discover Opportunities →</Link>
            </div>
          ) : (
            <div className="card-dark rounded-xl p-12 text-center">
              <div className="text-4xl mb-3">💰</div>
              <p className="text-sm text-white/50">Select an opportunity to view profit breakdown</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
