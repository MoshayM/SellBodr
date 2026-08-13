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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profitability Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Full landed-cost to net profit waterfall with ROI and break-even</p>
      </div>

      {/* Mobile: select dropdown */}
      {(opps as any[]).length > 0 && (
        <div className="md:hidden mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Select Opportunity</label>
          <select
            value={selected || (opps as any[])[0]?.id || ''}
            onChange={e => setSelected(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
            {(opps as any[]).map((o: any) => (
              <option key={o.id} value={o.id}>{o.product?.title} &middot; {o.marketplace?.code?.toUpperCase()}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-64 shrink-0">
          <div className="card p-3 sticky top-0">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-2">Select Opportunity</div>
            <div className="space-y-0.5">
              {(opps as any[]).map((o: any) => (
                <button key={o.id} onClick={() => setSelected(o.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    (selected || (opps as any[])[0]?.id) === o.id ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <div className="truncate">{o.product?.title}</div>
                  <div className="text-gray-400 font-normal mt-0.5">{o.marketplace?.code?.toUpperCase()}</div>
                </button>
              ))}
              {(opps as any[]).length === 0 && <div className="text-xs text-gray-400 px-3">No data &mdash; run a search</div>}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {opp?.profitModel ? (
            <div className="card p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div>
                  <div className="font-semibold text-gray-800">{opp.product?.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{opp.marketplace?.code?.toUpperCase()} &middot; {opp.marketplace?.currency}</div>
                </div>
                <Link href={`/opportunities/${opp.id}`}
                  className="shrink-0 text-xs btn-secondary px-3 py-1.5 min-h-0">
                  Detail &rarr;
                </Link>
              </div>
              <ProfitWaterfall profit={opp.profitModel} currency={opp.marketplace?.currency} />
            </div>
          ) : (opps as any[]).length === 0 ? (
            <div className="card p-12 sm:p-16 text-center">
              <div className="text-4xl mb-3">💰</div>
              <p className="font-medium text-gray-700 mb-1">No opportunities yet</p>
              <p className="text-sm text-gray-400">
                Run a search on the <Link href="/opportunities" className="text-green-600 hover:underline">Opportunities</Link> page
              </p>
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-400">
              <div className="text-3xl mb-2">💰</div>
              <p className="text-sm">Select an opportunity to view profit breakdown</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
