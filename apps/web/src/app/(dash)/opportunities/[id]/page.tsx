'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import { ScoreGauge, RecommendationBadge, ScoreBadge } from '@/components/ui/ScoreGauge';
import { ProfitWaterfall } from '@/components/profit/ProfitWaterfall';

const TABS = ['Overview', 'Research', 'Suppliers', 'Profitability', 'Competition', 'Listing', 'Recommendation', 'Report'];

function minor(v: number) { return (v / 100).toFixed(2); }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const [tab, setTab] = useState('Overview');
  const [genLoading, setGenLoading] = useState(false);

  const { data: opp, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => api.opportunities.get(id),
    enabled: !!id,
  });

  const { data: listing } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.opportunities.getListing(id),
    enabled: !!id && tab === 'Listing',
  });

  const { data: keywords } = useQuery({
    queryKey: ['keywords', id],
    queryFn: () => api.opportunities.getKeywords(id),
    enabled: !!id && tab === 'Listing',
  });

  const genAssets = useMutation({
    mutationFn: () => api.opportunities.generateAssets(id),
    onSuccess: () => setGenLoading(false),
  });

  const genReport = useMutation({
    mutationFn: () => api.opportunities.generateReport(id),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin text-3xl text-green-600">&#x27F3;</div>
    </div>
  );
  if (!opp) return <div className="card p-8 text-center text-gray-500">Opportunity not found</div>;

  const score = opp.score || {};
  const profit = opp.profitModel;
  const sub = [
    { label: 'Demand',      value: score.demand },
    { label: 'Competition', value: score.competition },
    { label: 'Margin',      value: score.margin },
    { label: 'Saturation',  value: score.saturation },
    { label: 'Trend',       value: score.trend },
    { label: 'Shipping',    value: score.shipping },
    { label: 'Mkt Fit',     value: score.marketplaceFit },
  ];

  return (
    <div>
      {/* Header card */}
      <div className="card p-4 sm:p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {opp.product?.imageUrl && (
            <div className="w-full sm:w-32 h-40 sm:h-32 rounded-xl overflow-hidden bg-gray-100 shrink-0">
              <Image src={opp.product.imageUrl} alt={opp.product.title} width={128} height={128} className="w-full h-full object-cover" unoptimized />
            </div>
          )}
          <div className="shrink-0">
            <ScoreGauge score={score.opportunity || 0} size="lg" label="Opportunity Score" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 leading-snug">{opp.product?.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{opp.marketplace?.code?.toUpperCase()}</span>
              <span className="text-xs text-gray-400">{opp.product?.category?.replace(/_/g, ' ')}</span>
              <span className="text-xs text-gray-400">v{opp.scoreVersion}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence)} />
              {profit && (
                <span className="text-sm font-semibold text-gray-700">
                  Net: {opp.marketplace?.currency} {minor(profit.netProfitMinor)}/unit
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setGenLoading(true); genAssets.mutate(); }}
            disabled={genLoading}
            className="btn-primary text-sm disabled:opacity-50 w-full sm:w-auto whitespace-nowrap">
            {genLoading ? '&#x27F3; Generating…' : '&#x2728; Generate Launch Assets'}
          </button>
        </div>

        {/* Sub-scores row */}
        <div className="flex gap-2 sm:gap-3 mt-4 flex-wrap">
          {sub.map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <ScoreBadge score={value || 0} />
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable tab bar */}
      <div className="scroll-tabs mb-5 -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="flex border-b border-gray-200 min-w-max">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sub.map(({ label, value }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <ScoreGauge score={value || 0} size="sm" />
              <div>
                <div className="text-sm font-medium text-gray-700">{label}</div>
                <div className="text-xs text-gray-400">{(value || 0) >= 70 ? 'Strong' : (value || 0) >= 40 ? 'Moderate' : 'Weak'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Research ── */}
      {tab === 'Research' && (
        <div className="card p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Product Research</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="card p-4">
              <div className="text-xs text-gray-500 mb-1">Category</div>
              <div className="font-medium">{opp.product?.category?.replace(/_/g, ' ')}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-gray-500 mb-1">Weight</div>
              <div className="font-medium">{opp.product?.weightG}g</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-gray-500 mb-1">Demand Score</div>
              <div className="font-bold text-green-700">{Math.round(score.demand || 0)}/100</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-gray-500 mb-1">Trend Score</div>
              <div className="font-bold text-green-700">{Math.round(score.trend || 0)}/100</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Suppliers ── */}
      {tab === 'Suppliers' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-semibold text-gray-800">Sourcing Candidates</div>
          {(opp.sourcingCandidates?.length === 0 || !opp.sourcingCandidates) ? (
            <div className="p-8 text-center text-gray-400">No suppliers found</div>
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm min-w-[540px]">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2.5">Supplier</th>
                    <th className="text-left px-4 py-2.5">Source</th>
                    <th className="text-right px-4 py-2.5">Cost (INR)</th>
                    <th className="text-right px-4 py-2.5">MOQ</th>
                    <th className="text-right px-4 py-2.5">Lead Time</th>
                    <th className="text-center px-4 py-2.5">Feasibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {opp.sourcingCandidates?.map((sc: any) => (
                    <tr key={sc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {sc.supplier?.sourceUrl ? (
                          <a href={sc.supplier.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="font-medium text-green-700 hover:underline flex items-center gap-1">
                            {sc.supplier?.name}
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 1h7.5v7.5M11 1L4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </a>
                        ) : (
                          <span className="font-medium text-gray-900">{sc.supplier?.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs uppercase text-gray-500">{sc.supplier?.source}</td>
                      <td className="px-4 py-3 text-right">{minor(sc.productCostMinor)}</td>
                      <td className="px-4 py-3 text-right">{sc.moq}</td>
                      <td className="px-4 py-3 text-right">{sc.leadTimeDays}d</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sc.feasibility === 'easy' ? 'bg-green-100 text-green-700' :
                          sc.feasibility === 'moderate' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>{sc.feasibility}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Profitability ── */}
      {tab === 'Profitability' && (
        <div className="card p-4 sm:p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Profit Waterfall</h2>
          <ProfitWaterfall profit={profit} currency={opp.marketplace?.currency} />
        </div>
      )}

      {/* ── Competition ── */}
      {tab === 'Competition' && (
        <div className="card p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Competition Analysis</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <div className="text-xs text-gray-500 mb-1">Competition Score</div>
              <div className="text-2xl font-bold text-gray-800">{Math.round(score.competition || 0)}/100</div>
              <div className="text-xs text-gray-400 mt-1">Higher = less competition</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-gray-500 mb-1">Saturation Score</div>
              <div className="text-2xl font-bold text-gray-800">{Math.round(score.saturation || 0)}/100</div>
              <div className="text-xs text-gray-400 mt-1">Higher = less saturated</div>
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
            Full competitor teardown available once marketplace connectors are configured.
          </div>
        </div>
      )}

      {/* ── Listing ── */}
      {tab === 'Listing' && (
        <div className="space-y-4">
          {listing ? (
            <>
              <div className="card p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">SEO Title</div>
                  <CopyButton text={listing.seoTitle || ''} />
                </div>
                <div className="font-semibold text-gray-900">{listing.seoTitle}</div>
              </div>
              <div className="card p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Bullets</div>
                  <CopyButton text={(JSON.parse(listing.bullets || '[]') as string[]).join('\n')} />
                </div>
                <ul className="space-y-2">
                  {(JSON.parse(listing.bullets || '[]') as string[]).map((b, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-green-500 shrink-0">&#x2713;</span>{b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Description</div>
                  <CopyButton text={listing.description || ''} />
                </div>
                <div className="text-sm text-gray-700 leading-relaxed">{listing.description}</div>
              </div>
              {keywords && (
                <div className="card p-4 sm:p-5">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Keywords</div>
                  <div className="space-y-3">
                    {Object.entries(keywords as Record<string, any>).map(([k, vals]) => (
                      <div key={k}>
                        <div className="text-xs font-semibold text-gray-500 capitalize mb-1.5">{k}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(vals) ? vals : []).map((kw: string, i: number) => (
                            <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">{kw}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-8 sm:p-12 text-center">
              <div className="text-3xl mb-3">📝</div>
              <p className="text-gray-500 text-sm">Click &ldquo;Generate Launch Assets&rdquo; to create listing copy</p>
            </div>
          )}
        </div>
      )}

      {/* ── Recommendation ── */}
      {tab === 'Recommendation' && (
        <div className="card p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6">
            <ScoreGauge score={score.opportunity || 0} size="lg" label="Opportunity Score" />
            <div>
              <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence)} />
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                {opp.recommendation === 'launch'
                  ? 'Strong opportunity — all key metrics exceed thresholds. Recommended to proceed with launch.'
                  : opp.recommendation === 'hold'
                  ? 'Promising opportunity — some metrics need improvement. Monitor and revisit.'
                  : 'Low opportunity — does not meet minimum criteria for cross-border profitability.'}
              </p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Score Breakdown</div>
            <div className="space-y-2.5">
              {sub.map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-gray-500 text-right shrink-0">{label}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{
                      width: `${value || 0}%`,
                      backgroundColor: (value || 0) >= 70 ? '#16a34a' : (value || 0) >= 40 ? '#d97706' : '#dc2626',
                    }} />
                  </div>
                  <div className="w-8 text-xs font-bold text-gray-700 shrink-0">{Math.round(value || 0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Report ── */}
      {tab === 'Report' && (
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Opportunity Report</h2>
            <button onClick={() => genReport.mutate()}
              disabled={genReport.isPending}
              className="btn-primary text-sm disabled:opacity-50">
              {genReport.isPending ? '&#x27F3; Generating…' : '📄 Generate Report'}
            </button>
          </div>
          {genReport.data ? (
            <div className="space-y-3">
              {Object.entries(((genReport.data as any).content || {}) as Record<string, any>).map(([key, val]) => (
                <div key={key}>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">{key.replace(/_/g, ' ')}</div>
                  {typeof val === 'string' ? (
                    <p className="text-sm text-gray-700 leading-relaxed">{val}</p>
                  ) : Array.isArray(val) ? (
                    <ul className="space-y-1">{(val as any[]).map((v, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-500 shrink-0">&#x2022;</span>{String(v)}</li>
                    ))}</ul>
                  ) : (
                    <p className="text-sm text-gray-700">{JSON.stringify(val)}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm">Generate a full opportunity report with all data</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
