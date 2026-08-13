'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';

const FEASIBILITY_COLOR: Record<string, string> = {
  easy:     'bg-green-100 text-green-700',
  moderate: 'bg-amber-100 text-amber-700',
  hard:     'bg-red-100 text-red-700',
};

function minor(v: number) { return (v / 100).toFixed(2); }

export default function SuppliersPage() {
  const { data: opps = [], isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => api.opportunities.list({}),
  });

  const rows: any[] = [];
  for (const opp of (opps as any[])) {
    for (const sc of (opp.sourcingCandidates || [])) {
      rows.push({ ...sc, opp });
    }
  }

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Sourcing candidates ranked by landed cost and feasibility
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 sm:p-16 text-center">
          <div className="text-4xl mb-3">🏭</div>
          <p className="font-medium text-gray-700 mb-1">No suppliers found yet</p>
          <p className="text-sm text-gray-400">
            <Link href="/opportunities" className="text-green-600 hover:underline">Run a search</Link> to discover supplier candidates
          </p>
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="sm:hidden space-y-3">
            {rows.map((sc: any) => (
              <div key={sc.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    {sc.supplier?.sourceUrl ? (
                      <a href={sc.supplier.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="font-semibold text-green-700 hover:underline inline-flex items-center gap-1 text-sm">
                        {sc.supplier?.name}
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 1h7.5v7.5M11 1L4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </a>
                    ) : (
                      <div className="font-semibold text-gray-900 text-sm">{sc.supplier?.name}</div>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                        sc.supplier?.source === 'indiamart' ? 'bg-orange-100 text-orange-700' :
                        sc.supplier?.source === 'alibaba'   ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{sc.supplier?.source}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${FEASIBILITY_COLOR[sc.feasibility] || 'bg-gray-100 text-gray-600'}`}>
                    {sc.feasibility}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2.5 truncate">{sc.opp.product?.title}</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                    <div className="text-[10px] text-gray-400">Cost</div>
                    <div className="text-sm font-bold text-gray-800">₹{minor(sc.productCostMinor)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                    <div className="text-[10px] text-gray-400">MOQ</div>
                    <div className="text-sm font-bold text-gray-800">{sc.moq}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                    <div className="text-[10px] text-gray-400">Lead</div>
                    <div className="text-sm font-bold text-gray-800">{sc.leadTimeDays}d</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block card overflow-hidden">
            <div className="table-scroll">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase">Supplier</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase">Source</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase">Product</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-gray-500 uppercase">Cost (INR)</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-gray-500 uppercase">MOQ</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-gray-500 uppercase">Lead</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs text-gray-500 uppercase">Feasibility</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((sc: any) => (
                    <tr key={sc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {sc.supplier?.sourceUrl ? (
                          <a href={sc.supplier.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="font-medium text-green-700 hover:underline inline-flex items-center gap-1">
                            {sc.supplier?.name}
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 1h7.5v7.5M11 1L4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </a>
                        ) : (
                          <span className="font-medium text-gray-900">{sc.supplier?.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide ${
                          sc.supplier?.source === 'indiamart' ? 'bg-orange-100 text-orange-700' :
                          sc.supplier?.source === 'alibaba'   ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{sc.supplier?.source}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{sc.opp.product?.title}</td>
                      <td className="px-4 py-3 text-right">{minor(sc.productCostMinor)}</td>
                      <td className="px-4 py-3 text-right">{sc.moq}</td>
                      <td className="px-4 py-3 text-right">{sc.leadTimeDays}d</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${FEASIBILITY_COLOR[sc.feasibility] || 'bg-gray-100 text-gray-600'}`}>
                          {sc.feasibility}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/opportunities/${sc.opp.id}`}
                          className="text-xs text-green-600 hover:underline whitespace-nowrap">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
