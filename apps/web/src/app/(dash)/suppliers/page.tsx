'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, isPro } from '@/lib/api';
import { ProGate } from '@/components/ui/ProGate';

function minor(v: number) { return (v / 100).toFixed(2); }

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    indiamart: 'bg-orange-50 text-orange-600 border-orange-200',
    alibaba:   'bg-blue-50 text-blue-600 border-blue-200',
  };
  return (
    <span className={`text-[11px] leading-none font-semibold px-2 py-1 rounded border uppercase tracking-wide ${styles[source] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {source}
    </span>
  );
}

function FeasibilityBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    easy:     'bg-emerald-50 text-emerald-600 border-emerald-200',
    moderate: 'bg-amber-50 text-amber-600 border-amber-200',
    hard:     'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <span className={`text-xs leading-none px-2.5 py-1 rounded-full font-semibold border ${styles[level] || 'bg-slate-100 text-slate-400 border-slate-200'}`}>
      {level}
    </span>
  );
}

export default function SuppliersPage() {
  const [isFree, setIsFree] = useState(true);
  useEffect(() => { setIsFree(!isPro()); }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.suppliers.list(),
    enabled: !isFree,
  });

  if (isFree) return (
    <ProGate
      icon="🏭"
      feature="Supplier Sourcing"
      tagline="Discover 10+ vetted India-first suppliers per product — with MOQ, lead times, feasibility ratings, and cost comparisons against global alternatives. Source smarter, not harder."
      benefits={[
        'IndiaMART, TradeIndia, GEM Portal, ExportHub & Udaan',
        'MOQ, lead time & feasibility rating per supplier',
        'Gross margin room calculator per source',
        'Global benchmarks: Alibaba, DHgate, Made-in-China',
      ]}
    />
  );

  if (isLoading) return (
    <div>
      <div className="mb-7">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-3">
          Sourcing
        </span>
        <h1 className="font-black text-2xl text-slate-900">Suppliers</h1>
        <p className="text-slate-500 text-sm mt-1">Sourcing candidates ranked by landed cost and feasibility</p>
      </div>
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse shadow-sm">
            <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-50 rounded w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-7">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-3">
          Sourcing
        </span>
        <h1 className="font-black text-2xl text-slate-900">Suppliers</h1>
        <p className="text-slate-500 text-sm mt-1">
          Sourcing candidates ranked by cost · {(rows as any[]).length} suppliers found
        </p>
      </div>

      {(rows as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 sm:p-16 text-center animate-card-in stagger-1">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl mx-auto mb-5">🏭</div>
          <p className="font-black text-lg text-slate-900 mb-2">No suppliers found yet</p>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Run a product search to discover vetted Indian supplier candidates with MOQ, lead times, and cost comparisons.</p>
          <Link href="/opportunities" className="btn-primary text-sm">Find Suppliers →</Link>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {(rows as any[]).map((sc: any, idx: number) => (
              <div key={sc.id} className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-card-in stagger-${Math.min(idx + 1, 5)}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    {sc.supplier?.sourceUrl ? (
                      <a href={sc.supplier.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 text-sm leading-snug">
                        {sc.supplier?.name}
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 12 12">
                          <path d="M3.5 1h7.5v7.5M11 1L4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </a>
                    ) : (
                      <div className="font-semibold text-slate-900 text-sm leading-snug">{sc.supplier?.name}</div>
                    )}
                    <div className="mt-1.5"><SourceBadge source={sc.supplier?.source} /></div>
                  </div>
                  <FeasibilityBadge level={sc.feasibility} />
                </div>
                <div className="text-xs text-slate-400 mb-3 leading-snug truncate">{sc.opp?.product?.title}</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Cost (₹)', value: minor(sc.productCostMinor) },
                    { label: 'MOQ',      value: sc.moq },
                    { label: 'Lead',     value: `${sc.leadTimeDays}d` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg px-2 py-2 text-center border border-slate-100">
                      <div className="text-[10px] leading-none text-slate-400 mb-1">{label}</div>
                      <div className="text-sm font-bold text-slate-800 leading-snug">{value}</div>
                    </div>
                  ))}
                </div>
                {sc.opp?.id && (
                  <Link href={`/opportunities/${sc.opp.id}`}
                    className="block mt-3 text-xs text-center text-indigo-600 hover:underline font-semibold">
                    View Opportunity →
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-card-in stagger-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Supplier', 'Source', 'Product', 'Cost (INR)', 'MOQ', 'Lead Time', 'Feasibility', ''].map((h, i) => (
                      <th key={i} className={`px-4 py-3.5 font-semibold text-xs text-slate-400 uppercase tracking-wide ${i >= 3 && i <= 5 ? 'text-right' : i === 6 ? 'text-center' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(rows as any[]).map((sc: any) => (
                    <tr key={sc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        {sc.supplier?.sourceUrl ? (
                          <a href={sc.supplier.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 leading-snug">
                            {sc.supplier?.name}
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 12 12">
                              <path d="M3.5 1h7.5v7.5M11 1L4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </a>
                        ) : (
                          <span className="font-semibold text-slate-800">{sc.supplier?.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5"><SourceBadge source={sc.supplier?.source} /></td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 max-w-[200px] truncate">{sc.opp?.product?.title}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700 font-semibold tabular-nums">{minor(sc.productCostMinor)}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">{sc.moq}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">{sc.leadTimeDays}d</td>
                      <td className="px-4 py-3.5 text-center"><FeasibilityBadge level={sc.feasibility} /></td>
                      <td className="px-4 py-3.5">
                        {sc.opp?.id && (
                          <Link href={`/opportunities/${sc.opp.id}`}
                            className="text-xs text-indigo-600 hover:underline whitespace-nowrap font-semibold">
                            View →
                          </Link>
                        )}
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
