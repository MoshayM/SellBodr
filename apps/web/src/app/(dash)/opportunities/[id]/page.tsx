'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ScoreGauge, RecommendationBadge, ScoreBadge } from '@/components/ui/ScoreGauge';
import { ProfitWaterfall } from '@/components/profit/ProfitWaterfall';
import { SupplierProfileDrawer } from '@/components/supplier/SupplierProfileDrawer';

const TABS = ['Overview', 'Research', 'Suppliers', 'Profitability', 'Competition', 'Listing', 'Ads', 'Growth', 'Recommendation', 'Report'];

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
  const [drawerSupplier, setDrawerSupplier] = useState<string | null>(null);

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

  const genAds = useMutation({
    mutationFn: () => api.opportunities.generateAds(id),
  });

  const genGrowth = useMutation({
    mutationFn: () => api.opportunities.generateGrowth(id),
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
          <div className="w-full sm:w-32 h-40 sm:h-32 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
            {opp.product?.imageUrl ? (
              <img
                src={opp.product.imageUrl}
                alt={opp.product.title}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = `https://image.pollinations.ai/prompt/${encodeURIComponent('product photo ' + (opp.product?.title || 'product') + ' white background')}?width=128&height=128&nologo=true&seed=1`; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📦</div>
            )}
          </div>
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
        <div className="space-y-3">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-800">Sourcing Candidates</span>
              <span className="text-xs text-gray-400">Click a row to view full profile &amp; contact</span>
            </div>
            {(opp.sourcingCandidates?.length === 0 || !opp.sourcingCandidates) ? (
              <div className="p-8 text-center text-gray-400">No suppliers found</div>
            ) : (
              <div className="table-scroll">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-2.5">Supplier</th>
                      <th className="text-left px-4 py-2.5">Source</th>
                      <th className="text-right px-4 py-2.5">Cost (INR)</th>
                      <th className="text-right px-4 py-2.5">MOQ</th>
                      <th className="text-right px-4 py-2.5">Lead Time</th>
                      <th className="text-center px-4 py-2.5">Feasibility</th>
                      <th className="text-center px-4 py-2.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {opp.sourcingCandidates?.map((sc: any) => (
                      <tr key={sc.id} className="hover:bg-green-50/40 cursor-pointer transition-colors"
                        onClick={() => setDrawerSupplier(sc.id)}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{sc.supplier?.name || sc.supplierName}</span>
                        </td>
                        <td className="px-4 py-3 text-xs uppercase text-gray-500">{sc.supplier?.source}</td>
                        <td className="px-4 py-3 text-right font-mono">₹{minor(sc.productCostMinor)}</td>
                        <td className="px-4 py-3 text-right">{sc.moq}</td>
                        <td className="px-4 py-3 text-right">{sc.leadTimeDays}d</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            sc.feasibility === 'easy' ? 'bg-green-100 text-green-700' :
                            sc.feasibility === 'moderate' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>{sc.feasibility}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={e => { e.stopPropagation(); setDrawerSupplier(sc.id); }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors whitespace-nowrap">
                            View &amp; Contact
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="card p-4 flex items-start gap-3 text-sm text-gray-600 bg-blue-50/50 border-blue-100">
            <span className="text-xl shrink-0">💡</span>
            <div>
              <span className="font-semibold text-gray-800">Negotiation tip: </span>
              Contact 2–3 suppliers simultaneously. Reference competitor prices and mention long-term volume to unlock 15–25% below the listed rate.
            </div>
          </div>
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

      {/* ── Ads ── */}
      {tab === 'Ads' && (
        <div className="space-y-4">
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">Ad Campaign Generator</h2>
                <p className="text-xs text-gray-500 mt-0.5">AI-crafted ad copy for Facebook, Instagram, YouTube &amp; Google</p>
              </div>
              <button onClick={() => genAds.mutate()} disabled={genAds.isPending}
                className="btn-primary text-sm disabled:opacity-50 whitespace-nowrap">
                {genAds.isPending ? '⟳ Generating…' : genAds.data ? '↻ Regenerate' : '✨ Generate Ads'}
              </button>
            </div>

            {!genAds.data && !genAds.isPending && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Facebook', 'Instagram', 'YouTube', 'Google'].map(p => (
                  <div key={p} className="card p-4 text-center opacity-50">
                    <div className="text-2xl mb-1">
                      {p === 'Facebook' ? '🔵' : p === 'Instagram' ? '🟣' : p === 'YouTube' ? '🔴' : '🟢'}
                    </div>
                    <div className="text-sm font-medium text-gray-600">{p}</div>
                  </div>
                ))}
              </div>
            )}

            {genAds.isPending && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin text-3xl text-green-600 mb-3">&#x27F3;</div>
                  <p className="text-sm text-gray-500">Crafting your ad campaigns…</p>
                </div>
              </div>
            )}

            {genAds.data && (() => {
              const ads = genAds.data as any;
              return (
                <div className="space-y-4">
                  {/* Facebook */}
                  {ads.facebook && (
                    <div className="border border-blue-100 rounded-xl overflow-hidden">
                      <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2">
                        <span className="text-lg">🔵</span>
                        <span className="font-semibold text-blue-800 text-sm">Facebook</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-400 uppercase">Headline</span>
                            <CopyButton text={ads.facebook.headline} />
                          </div>
                          <p className="text-sm font-semibold text-gray-800">{ads.facebook.headline}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-400 uppercase">Primary Text</span>
                            <CopyButton text={ads.facebook.primaryText} />
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{ads.facebook.primaryText}</p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">CTA: {ads.facebook.cta}</span>
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">{ads.facebook.dailyBudget}</span>
                        </div>
                        {ads.facebook.audience && (
                          <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600">
                            <span className="font-semibold">Audience: </span>{ads.facebook.audience}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instagram */}
                  {ads.instagram && (
                    <div className="border border-purple-100 rounded-xl overflow-hidden">
                      <div className="bg-purple-50 px-4 py-2.5 flex items-center gap-2">
                        <span className="text-lg">🟣</span>
                        <span className="font-semibold text-purple-800 text-sm">Instagram</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-400 uppercase">Caption</span>
                            <CopyButton text={ads.instagram.caption} />
                          </div>
                          <p className="text-sm text-gray-700">{ads.instagram.caption}</p>
                        </div>
                        {ads.instagram.reelHook && (
                          <div>
                            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Reel Hook</div>
                            <p className="text-sm text-gray-700 italic">{ads.instagram.reelHook}</p>
                          </div>
                        )}
                        {ads.instagram.hashtags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {ads.instagram.hashtags.map((tag: string, i: number) => (
                              <span key={i} className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* YouTube */}
                  {ads.youtube && (
                    <div className="border border-red-100 rounded-xl overflow-hidden">
                      <div className="bg-red-50 px-4 py-2.5 flex items-center gap-2">
                        <span className="text-lg">🔴</span>
                        <span className="font-semibold text-red-800 text-sm">YouTube</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {ads.youtube.title && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-gray-400 uppercase">Video Title</span>
                              <CopyButton text={ads.youtube.title} />
                            </div>
                            <p className="text-sm font-semibold text-gray-800">{ads.youtube.title}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[['Hook (0–5s)', ads.youtube.hook], ['Body', ads.youtube.body], ['CTA', ads.youtube.cta]].map(([label, text]) => text && (
                            <div key={label as string} className="bg-gray-50 rounded-lg p-2.5">
                              <div className="text-xs font-semibold text-gray-400 uppercase mb-1">{label as string}</div>
                              <p className="text-xs text-gray-700">{text as string}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Google */}
                  {ads.google && (
                    <div className="border border-green-100 rounded-xl overflow-hidden">
                      <div className="bg-green-50 px-4 py-2.5 flex items-center gap-2">
                        <span className="text-lg">🟢</span>
                        <span className="font-semibold text-green-800 text-sm">Google Shopping / Search</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[ads.google.headline1, ads.google.headline2, ads.google.headline3].filter(Boolean).map((h: string, i) => (
                            <div key={i} className="bg-gray-50 rounded p-2">
                              <div className="text-xs text-gray-400 mb-0.5">H{i + 1}</div>
                              <p className="text-sm font-semibold text-gray-800">{h}</p>
                            </div>
                          ))}
                        </div>
                        {ads.google.keywords?.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Target Keywords</div>
                            <div className="flex flex-wrap gap-1.5">
                              {ads.google.keywords.map((kw: string, i: number) => (
                                <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {ads.tips?.length > 0 && (
                    <div className="card p-4 bg-amber-50/50 border-amber-100">
                      <div className="text-xs font-semibold text-amber-700 uppercase mb-2">Pro Tips</div>
                      <ul className="space-y-1.5">
                        {ads.tips.map((tip: string, i: number) => (
                          <li key={i} className="text-sm text-gray-700 flex gap-2">
                            <span className="text-amber-500 shrink-0">&#x2022;</span>{tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Growth ── */}
      {tab === 'Growth' && (
        <div className="space-y-4">
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">Growth Playbook</h2>
                <p className="text-xs text-gray-500 mt-0.5">Personalized strategy for this product &amp; marketplace</p>
              </div>
              <button onClick={() => genGrowth.mutate()} disabled={genGrowth.isPending}
                className="btn-primary text-sm disabled:opacity-50 whitespace-nowrap">
                {genGrowth.isPending ? '⟳ Generating…' : genGrowth.data ? '↻ Refresh' : '🚀 Build Playbook'}
              </button>
            </div>

            {!genGrowth.data && !genGrowth.isPending && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-50">
                {['Quick Wins', 'Listing Optimization', 'Pricing Strategy', 'Review Strategy', 'Launch Sequence', 'PPC Plan'].map(s => (
                  <div key={s} className="card p-3 text-center text-sm text-gray-500">{s}</div>
                ))}
              </div>
            )}

            {genGrowth.isPending && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin text-3xl text-green-600 mb-3">&#x27F3;</div>
                  <p className="text-sm text-gray-500">Building your growth playbook…</p>
                </div>
              </div>
            )}

            {genGrowth.data && (() => {
              const g = genGrowth.data as any;
              return (
                <div className="space-y-5">
                  {/* Quick Wins */}
                  {g.quickWins?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">⚡ Quick Wins</div>
                      <ul className="space-y-2">
                        {g.quickWins.map((w: string, i: number) => (
                          <li key={i} className="text-sm text-gray-700 flex gap-2 p-2.5 rounded-lg bg-green-50">
                            <span className="text-green-600 font-bold shrink-0">{i + 1}.</span>{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Listing Optimization */}
                  {g.listingOptimization && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">📝 Listing Optimization</div>
                      <div className="space-y-3">
                        {g.listingOptimization.title && (
                          <div className="card p-3">
                            <div className="text-xs text-gray-500 font-semibold mb-1">Title Formula</div>
                            <p className="text-sm text-gray-700">{g.listingOptimization.title}</p>
                          </div>
                        )}
                        {g.listingOptimization.bullets?.length > 0 && (
                          <div className="card p-3">
                            <div className="text-xs text-gray-500 font-semibold mb-2">Bullet Framework</div>
                            <ul className="space-y-1">
                              {g.listingOptimization.bullets.map((b: string, i: number) => (
                                <li key={i} className="text-sm text-gray-700 flex gap-2">
                                  <span className="text-green-500 shrink-0">&#x2713;</span>{b}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {g.listingOptimization.images?.length > 0 && (
                          <div className="card p-3">
                            <div className="text-xs text-gray-500 font-semibold mb-2">Image Strategy</div>
                            <ul className="space-y-1">
                              {g.listingOptimization.images.map((img: string, i: number) => (
                                <li key={i} className="text-sm text-gray-700 flex gap-2">
                                  <span className="text-blue-500 shrink-0">🖼</span>{img}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {g.listingOptimization.video && (
                          <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800">
                            <span className="font-semibold">Video: </span>{g.listingOptimization.video}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pricing */}
                  {g.pricingStrategy && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">💰 Pricing Strategy</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(g.pricingStrategy as Record<string, string>).map(([key, val]) => (
                          <div key={key} className="card p-3">
                            <div className="text-xs text-gray-400 capitalize mb-1">{key}</div>
                            <p className="text-sm text-gray-700">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Launch Sequence */}
                  {g.launchSequence?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">🗓 Launch Sequence</div>
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                        <div className="space-y-3">
                          {g.launchSequence.map((step: any, i: number) => (
                            <div key={i} className="flex gap-4 pl-10 relative">
                              <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
                              <div className="card p-3 flex-1">
                                <div className="text-xs font-bold text-green-700 mb-0.5">{step.week}</div>
                                <p className="text-sm text-gray-700">{step.action}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PPC */}
                  {g.ppcStrategy && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">📢 PPC Strategy</div>
                      <div className="card p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-gray-700">Budget:</span>
                          <span className="text-green-700 font-medium">{g.ppcStrategy.budget}</span>
                        </div>
                        {g.ppcStrategy.acos && (
                          <p className="text-sm text-gray-600">{g.ppcStrategy.acos}</p>
                        )}
                        {g.ppcStrategy.campaigns?.length > 0 && (
                          <ul className="space-y-1">
                            {g.ppcStrategy.campaigns.map((c: string, i: number) => (
                              <li key={i} className="text-sm text-gray-700 flex gap-2">
                                <span className="text-green-500 shrink-0">&#x2713;</span>{c}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Monthly Milestones */}
                  {g.monthlyMilestones?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">🎯 Monthly Milestones</div>
                      <div className="grid grid-cols-2 gap-2">
                        {g.monthlyMilestones.map((m: any) => (
                          <div key={m.month} className="card p-3">
                            <div className="text-xs font-bold text-green-700 mb-1">Month {m.month}</div>
                            <p className="text-xs text-gray-600">{m.goal}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Strategy */}
                  {g.reviewStrategy?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">⭐ Review Strategy</div>
                      <ul className="space-y-2">
                        {g.reviewStrategy.map((tip: string, i: number) => (
                          <li key={i} className="text-sm text-gray-700 flex gap-2">
                            <span className="text-amber-400 shrink-0">★</span>{tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
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
      <SupplierProfileDrawer
        supplierId={drawerSupplier}
        open={!!drawerSupplier}
        onClose={() => setDrawerSupplier(null)}
        context={{ productTitle: opp.product?.title, opportunityId: id }}
      />
    </div>
  );
}
