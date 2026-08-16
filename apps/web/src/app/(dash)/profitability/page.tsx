'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProGate } from '@/components/ui/ProGate';
import { ProfitWaterfall } from '@/components/profit/ProfitWaterfall';

export default function ProfitabilityPage() {
  const [isGuest, setIsGuest] = useState(false);
  useEffect(() => { setIsGuest(!localStorage.getItem('bs_access_token')); }, []);

  const { data: opps = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => api.opportunities.list({}),
    enabled: !isGuest,
  });

  const [selectedId, setSelectedId] = useState('');
  const allOpps = opps as any[];
  const effectiveId = selectedId || allOpps[0]?.id || '';

  const { data: oppDetail } = useQuery({
    queryKey: ['opportunity', effectiveId],
    queryFn: () => api.opportunities.get(effectiveId),
    enabled: !!effectiveId && !isGuest,
  });

  if (isGuest) return (
    <ProGate
      icon="💰"
      feature="Full Profit Model"
      tagline="Complete landed-cost P&L for every opportunity — India factory gate to marketplace fulfilled. Know your exact net profit, break-even units, and monthly projections before ordering."
      benefits={[
        'Source cost + freight + duties + all fees',
        'Net margin %, ROI %, break-even units',
        'Monthly & annual projections (50 units)',
        'Diverging cost waterfall chart per product',
      ]}
    />
  );

  // Use list row for display meta, detail for profit model
  const listRow = allOpps.find(o => o.id === effectiveId) || allOpps[0];
  const profitModel = oppDetail?.profitModel ?? listRow?.profitModel ?? null;
  const currency = listRow?.marketplace?.currency ?? 'USD';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Profitability</h1>
        <p className="text-sm text-white/40 mt-0.5">Full landed-cost to net profit waterfall with ROI and break-even</p>
      </div>

      {/* Mobile dropdown */}
      {allOpps.length > 0 && (
        <div className="md:hidden mb-4">
          <label className="block text-xs font-medium text-white/50 mb-1.5">Select Opportunity</label>
          <select
            value={effectiveId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 [&>option]:bg-[#0a0f1e]">
            {allOpps.map((o: any) => (
              <option key={o.id} value={o.id}>{o.product?.title} · {o.marketplace?.code?.toUpperCase()}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-64 shrink-0">
          <div className="card-dark rounded-xl p-3 sticky top-4">
            <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3 px-2 mt-1">
              Select Opportunity
            </div>
            <div className="space-y-0.5 max-h-[60vh] overflow-y-auto scrollbar-dark">
              {allOpps.map((o: any) => (
                <button key={o.id} onClick={() => setSelectedId(o.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors leading-snug ${
                    effectiveId === o.id
                      ? 'bg-violet-500/20 text-violet-300 font-medium border border-violet-500/20'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }`}>
                  <div className="truncate text-inherit">{o.product?.title}</div>
                  <div className="text-white/30 font-normal mt-0.5">{o.marketplace?.code?.toUpperCase()}</div>
                </button>
              ))}
              {allOpps.length === 0 && (
                <div className="text-xs text-white/30 px-3 py-2">No data — run a search</div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {profitModel && listRow ? (
            <div className="card-dark rounded-xl p-4 sm:p-6">
              <div className="flex items-start justify-between mb-5 gap-3">
                <div>
                  <div className="font-semibold text-white leading-snug">{listRow.product?.title}</div>
                  <div className="text-xs text-white/40 mt-1">{listRow.marketplace?.code?.toUpperCase()} · {currency}</div>
                </div>
                <Link href={`/opportunities/${listRow.id}?tab=Profitability`}
                  className="shrink-0 btn-secondary text-xs px-3 py-2 min-h-0">
                  Full Detail →
                </Link>
              </div>
              <ProfitWaterfall profit={profitModel} currency={currency} />
            </div>
          ) : allOpps.length === 0 ? (
            <div className="card-dark rounded-xl p-12 sm:p-16 text-center">
              <div className="text-5xl mb-4">💰</div>
              <p className="font-semibold text-white mb-1">No opportunities yet</p>
              <p className="text-sm text-white/40 mb-5">Run a search to see profit breakdowns</p>
              <Link href="/opportunities" className="btn-primary text-sm">Discover Opportunities →</Link>
            </div>
          ) : (
            <div className="card-dark rounded-xl p-12 text-center">
              <div className="text-3xl mb-3 animate-spin-slow">⏳</div>
              <p className="text-sm text-white/50">Loading profit model…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
