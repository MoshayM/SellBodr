'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy}
      className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all">
      {copied ? '&#x2713; Copied' : 'Copy'}
    </button>
  );
}

function Section({ label, children, copyText }: { label: string; children: React.ReactNode; copyText?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
        {copyText && <CopyButton text={copyText} />}
      </div>
      {children}
    </div>
  );
}

export default function ListingPage() {
  const { data: opps = [] } = useQuery({ queryKey: ['opportunities'], queryFn: () => api.opportunities.list({}) });
  const [selected, setSelected] = useState('');
  const opp = (opps as any[]).find(o => o.id === selected) || (opps as any[])[0];

  const { data: listing, refetch } = useQuery({
    queryKey: ['listing', opp?.id],
    queryFn: () => api.opportunities.getListing(opp.id),
    enabled: !!opp?.id,
  });

  const gen = useMutation({
    mutationFn: () => api.opportunities.generateAssets(opp.id),
    onSuccess: () => refetch(),
  });

  const bullets: string[] = listing?.bullets ? (() => { try { return JSON.parse(listing.bullets); } catch { return []; } })() : [];
  const kwMap: Record<string, string[]> = listing?.keywords ? (() => { try { return JSON.parse(listing.keywords); } catch { return {}; } })() : {};
  const kwText = Object.entries(kwMap).map(([k, v]) => `${k}: ${(v as any[]).join(', ')}`).join('\n');

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listing Optimization</h1>
          <p className="text-sm text-gray-400 mt-0.5">AI-generated marketplace-ready copy, bullets, and keyword strategy</p>
        </div>
      </div>

      {/* Mobile: select dropdown */}
      {(opps as any[]).length > 0 && (
        <div className="lg:hidden mb-4">
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

      <div className="flex gap-5">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-56 shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-3 sticky top-0 shadow-sm">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-2">Opportunity</div>
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
              {(opps as any[]).length === 0 && <div className="text-xs text-gray-400 px-3 py-2">Run a search first</div>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {!listing && opp && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-10 text-center shadow-sm">
              <div className="text-4xl mb-4">&#x2728;</div>
              <p className="text-gray-600 font-medium mb-1">No listing generated yet</p>
              <p className="text-sm text-gray-400 mb-5">Generate AI-optimised title, bullets, description, and keyword strategy</p>
              <button onClick={() => gen.mutate()} disabled={gen.isPending}
                className="btn-primary text-sm disabled:opacity-50">
                {gen.isPending ? 'Generating…' : '&#x2728; Generate Listing Assets'}
              </button>
            </div>
          )}

          {!opp && (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm text-gray-400">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-sm">Run a search to generate listing assets</p>
            </div>
          )}

          {listing && (
            <>
              <Section label="SEO Title" copyText={listing.seoTitle}>
                <p className="font-semibold text-gray-900 text-base leading-snug">{listing.seoTitle}</p>
              </Section>

              <Section label="Bullet Points" copyText={bullets.join('\n')}>
                <ul className="space-y-2.5">
                  {bullets.map((b: string, i: number) => (
                    <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                      <span className="text-green-500 font-bold shrink-0 mt-0.5">&#x2713;</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section label="Description" copyText={listing.description}>
                <p className="text-sm text-gray-700 leading-relaxed">{listing.description}</p>
              </Section>

              {Object.keys(kwMap).length > 0 && (
                <Section label="Keyword Strategy" copyText={kwText}>
                  <div className="space-y-3">
                    {Object.entries(kwMap).map(([k, vals]: [string, any]) => (
                      <div key={k}>
                        <div className="text-xs font-semibold text-gray-500 capitalize mb-1.5">{k}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(vals) ? vals : []).map((kw: string, i: number) => (
                            <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {listing.positioning && (
                <Section label="Brand Positioning" copyText={listing.positioning}>
                  <p className="text-sm text-gray-700">{listing.positioning}</p>
                </Section>
              )}

              <div className="pt-2">
                <button onClick={() => gen.mutate()} disabled={gen.isPending}
                  className="text-xs text-gray-400 hover:text-gray-600 underline disabled:opacity-40">
                  {gen.isPending ? 'Regenerating…' : '&#x21BA; Regenerate assets'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
