'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProGate } from '@/components/ui/ProGate';

function minor(v: number) { return (v / 100).toFixed(2); }

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    indiamart: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    alibaba:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`text-[11px] leading-none font-semibold px-2 py-1 rounded border uppercase tracking-wide ${styles[source] || 'bg-white/10 text-white/50 border-white/10'}`}>
      {source}
    </span>
  );
}

function FeasibilityBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    easy:     'bg-green-500/20 text-green-400 border-green-500/30',
    moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    hard:     'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`text-xs leading-none px-2 py-1 rounded-full font-medium border ${styles[level] || 'bg-white/10 text-white/40 border-white/10'}`}>
      {level}
    </span>
  );
}

export default function SuppliersPage() {
  const [isGuest, setIsGuest] = useState(false);
  useEffect(() => { setIsGuest(!localStorage.getItem('bs_access_token')); }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.suppliers.list(),
    enabled: !isGuest,
  });

  if (isGuest) return (
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Suppliers</h1>
        <p className="text-sm text-white/40 mt-0.5">Sourcing candidates ranked by landed cost and feasibility</p>
      </div>
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="card-dark rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/2 mb-2" />
            <div className="h-3 bg-white/5 rounded w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Suppliers</h1>
        <p className="text-sm text-white/40 mt-0.5">
          Sourcing candidates ranked by cost · {(rows as any[]).length} suppliers found
        </p>
      </div>

      {(rows as any[]).length === 0 ? (
        <div className="card-dark rounded-xl p-12 sm:p-16 text-center">
          <div className="text-5xl mb-4">🏭</div>
          <p className="font-semibold text-white mb-1">No suppliers found yet</p>
          <p className="text-sm text-white/40 mb-5">Run a product search to discover Indian supplier candidates</p>
          <Link href="/opportunities" className="btn-primary text-sm">Find Suppliers →</Link>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {(rows as any[]).map((sc: any) => (
              <div key={sc.id} className="card-dark rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    {sc.supplier?.sourceUrl ? (
                      <a href={sc.supplier.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="font-semibold text-violet-400 hover:underline inline-flex items-center gap-1 text-sm leading-snug">
                        {sc.supplier?.name}
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 12 12">
                          <path d="M3.5 1h7.5v7.5M11 1L4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </a>
                    ) : (
                      <div className="font-semibold text-white text-sm leading-snug">{sc.supplier?.name}</div>
                    )}
                    <div className="mt-1.5"><SourceBadge source={sc.supplier?.source} /></div>
                  </div>
                  <FeasibilityBadge level={sc.feasibility} />
                </div>
                <div className="text-xs text-white/40 mb-3 leading-snug truncate">{sc.opp?.product?.title}</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Cost (₹)', value: minor(sc.productCostMinor) },
                    { label: 'MOQ',      value: sc.moq },
                    { label: 'Lead',     value: `${sc.leadTimeDays}d` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/5 rounded-lg px-2 py-2 text-center">
                      <div className="text-[10px] leading-none text-white/30 mb-1">{label}</div>
                      <div className="text-sm font-bold text-white leading-snug">{value}</div>
                    </div>
                  ))}
                </div>
                {sc.opp?.id && (
                  <Link href={`/opportunities/${sc.opp.id}`}
                    className="block mt-3 text-xs text-center text-violet-400 hover:underline font-medium">
                    View Opportunity →
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block card-dark rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    {['Supplier', 'Source', 'Product', 'Cost (INR)', 'MOQ', 'Lead Time', 'Feasibility', ''].map((h, i) => (
                      <th key={i} className={`px-4 py-3.5 font-semibold text-xs text-white/40 uppercase tracking-wide ${i >= 3 && i <= 5 ? 'text-right' : i === 6 ? 'text-center' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(rows as any[]).map((sc: any) => (
                    <tr key={sc.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3.5">
                        {sc.supplier?.sourceUrl ? (
                          <a href={sc.supplier.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="font-medium text-violet-400 hover:underline inline-flex items-center gap-1 leading-snug">
                            {sc.supplier?.name}
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 12 12">
                              <path d="M3.5 1h7.5v7.5M11 1L4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </a>
                        ) : (
                          <span className="font-medium text-white">{sc.supplier?.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5"><SourceBadge source={sc.supplier?.source} /></td>
                      <td className="px-4 py-3.5 text-xs text-white/50 max-w-[200px] truncate">{sc.opp?.product?.title}</td>
                      <td className="px-4 py-3.5 text-right text-white/80 font-medium">{minor(sc.productCostMinor)}</td>
                      <td className="px-4 py-3.5 text-right text-white/80">{sc.moq}</td>
                      <td className="px-4 py-3.5 text-right text-white/80">{sc.leadTimeDays}d</td>
                      <td className="px-4 py-3.5 text-center"><FeasibilityBadge level={sc.feasibility} /></td>
                      <td className="px-4 py-3.5">
                        {sc.opp?.id && (
                          <Link href={`/opportunities/${sc.opp.id}`}
                            className="text-xs text-violet-400 hover:underline whitespace-nowrap font-medium">
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
