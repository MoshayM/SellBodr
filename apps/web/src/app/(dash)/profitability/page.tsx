'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, isPro } from '@/lib/api';
import { ProGate } from '@/components/ui/ProGate';
import { ProfitWaterfall } from '@/components/profit/ProfitWaterfall';

export default function ProfitabilityPage() {
  const [isFree, setIsFree] = useState(true);
  useEffect(() => { setIsFree(!isPro()); }, []);

  const { data: opps = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => api.opportunities.list({}),
    enabled: !isFree,
  });

  const [selectedId, setSelectedId] = useState('');
  const allOpps = opps as any[];
  const effectiveId = selectedId || allOpps[0]?.id || '';

  const { data: oppDetail } = useQuery({
    queryKey: ['opportunity', effectiveId],
    queryFn: () => api.opportunities.get(effectiveId),
    enabled: !!effectiveId && !isFree,
  });

  if (isFree) return (
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
      {/* Header */}
      <div className="mb-6 animate-card-in">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold uppercase tracking-wide mb-2">
          <span>💰</span> Profitability
        </div>
        <h1 className="text-2xl font-black text-white leading-tight">Profit Calculator</h1>
        <p className="text-sm text-white/50 mt-1">Full landed-cost to net profit waterfall with ROI and break-even</p>
      </div>

      {/* Mobile dropdown */}
      {allOpps.length > 0 && (
        <div className="md:hidden mb-4 animate-card-in stagger-1">
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">Select Opportunity</label>
          <select
            value={effectiveId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 [&>option]:bg-white [&>option]:text-slate-900 shadow-sm">
            {allOpps.map((o: any) => (
              <option key={o.id} value={o.id}>{o.product?.title} · {o.marketplace?.code?.toUpperCase()}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-64 shrink-0 animate-card-in stagger-1">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 sticky top-4 shadow-sm">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 px-2 mt-1">
              Opportunities
            </div>
            <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
              {allOpps.map((o: any) => (
                <button key={o.id} onClick={() => setSelectedId(o.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-150 leading-snug ${
                    effectiveId === o.id
                      ? 'bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/70 border border-transparent'
                  }`}>
                  <div className="truncate">{o.product?.title}</div>
                  <div className={`font-mono text-[10px] mt-0.5 ${effectiveId === o.id ? 'text-indigo-400' : 'text-white/40'}`}>
                    {o.marketplace?.code?.toUpperCase()}
                  </div>
                </button>
              ))}
              {allOpps.length === 0 && (
                <div className="text-xs text-white/40 px-3 py-2">No data — run a search</div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {profitModel && listRow ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm animate-card-in stagger-2">
              <div className="flex items-start justify-between mb-5 gap-3">
                <div>
                  <div className="font-bold text-white leading-snug">{listRow.product?.title}</div>
                  <div className="text-xs text-white/40 mt-1 flex items-center gap-1.5">
                    <span className="font-mono bg-white/10 text-white/50 px-1.5 py-0.5 rounded text-[10px]">{listRow.marketplace?.code?.toUpperCase()}</span>
                    <span>{currency}</span>
                  </div>
                </div>
                <Link href={`/opportunities/${listRow.id}?tab=Profitability`}
                  className="shrink-0 btn-primary text-xs px-3 py-2 min-h-0">
                  Full Detail →
                </Link>
              </div>
              <ProfitWaterfall profit={profitModel} currency={currency} />
            </div>
          ) : allOpps.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 sm:p-16 text-center shadow-sm animate-card-in stagger-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
                💰
              </div>
              <p className="font-bold text-white text-base mb-1">No opportunities yet</p>
              <p className="text-sm text-white/50 mb-6">Run a search to see profit breakdowns</p>
              <Link href="/opportunities" className="btn-primary text-sm">Discover Opportunities →</Link>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center shadow-sm animate-card-in stagger-2">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-white/30 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-white/50">Loading profit model…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
