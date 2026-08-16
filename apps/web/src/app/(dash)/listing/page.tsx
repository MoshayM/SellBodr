'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, isPro } from '@/lib/api';
import { ProGate } from '@/components/ui/ProGate';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <button onClick={copy}
      className="text-xs leading-none px-2.5 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function Section({ label, children, copyText }: { label: string; children: React.ReactNode; copyText?: string }) {
  return (
    <div className="card-dark rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] leading-none font-semibold text-white/30 uppercase tracking-widest">{label}</span>
        {copyText && <CopyButton text={copyText} />}
      </div>
      {children}
    </div>
  );
}

export default function ListingPage() {
  const [isFree, setIsFree] = useState(true);
  useEffect(() => { setIsFree(!isPro()); }, []);

  const { data: opps = [] } = useQuery({ queryKey: ['opportunities'], queryFn: () => api.opportunities.list({}), enabled: !isFree });
  const [selected, setSelected] = useState('');
  const opp = (opps as any[]).find(o => o.id === selected) || (opps as any[])[0];

  const { data: listing, refetch } = useQuery({
    queryKey: ['listing', opp?.id],
    queryFn: () => api.opportunities.getListing(opp.id),
    enabled: !!opp?.id && !isFree,
  });

  const gen = useMutation({
    mutationFn: () => api.opportunities.generateAssets(opp.id),
    onSuccess: () => refetch(),
  });

  if (isFree) return (
    <ProGate
      icon="📝"
      feature="AI Listing Generator"
      tagline="Generate SEO-optimised marketplace listings in seconds — title, bullets, long-form description, and backend keywords tailored to each platform's ranking algorithm."
      benefits={[
        'Platform-optimised product title (80 chars)',
        '5 keyword-rich bullet points per product',
        'Long-form description with trust signals',
        'Backend keyword set for search visibility',
      ]}
    />
  );

  const bullets: string[] = listing?.bullets ? (() => { try { return JSON.parse(listing.bullets); } catch { return []; } })() : [];
  const kwMap: Record<string, string[]> = listing?.keywords ? (() => { try { return JSON.parse(listing.keywords); } catch { return {}; } })() : {};
  const kwText = Object.entries(kwMap).map(([k, v]) => `${k}: ${(v as any[]).join(', ')}`).join('\n');

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Listing</h1>
          <p className="text-sm text-white/40 mt-0.5 leading-snug">AI-generated marketplace-ready copy, bullets, and keyword strategy</p>
        </div>
      </div>

      {/* Mobile dropdown */}
      {(opps as any[]).length > 0 && (
        <div className="lg:hidden mb-4">
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

      <div className="flex gap-5">
        {/* Desktop sidebar */}
        <div className="hidden lg:block w-56 shrink-0">
          <div className="card-dark rounded-xl p-3 sticky top-4">
            <div className="text-[10px] leading-none font-semibold text-white/30 uppercase tracking-widest mb-3 px-2 mt-1">
              Opportunity
            </div>
            <div className="space-y-0.5">
              {(opps as any[]).map((o: any) => (
                <button key={o.id} onClick={() => setSelected(o.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors leading-snug ${
                    (selected || (opps as any[])[0]?.id) === o.id
                      ? 'bg-violet-500/20 text-violet-300 font-medium border border-violet-500/20'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }`}>
                  <div className="truncate">{o.product?.title}</div>
                  <div className="text-white/30 font-normal mt-0.5">{o.marketplace?.code?.toUpperCase()}</div>
                </button>
              ))}
              {(opps as any[]).length === 0 && (
                <div className="text-xs text-white/30 px-3 py-2">Run a search first</div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {!listing && opp && (
            <div className="card-dark rounded-xl p-8 sm:p-10 text-center">
              <div className="text-5xl mb-4">✨</div>
              <p className="text-white font-semibold mb-1">No listing generated yet</p>
              <p className="text-sm text-white/40 mb-5">Generate AI-optimised title, bullets, description, and keyword strategy</p>
              <button onClick={() => gen.mutate()} disabled={gen.isPending}
                className="btn-primary text-sm disabled:opacity-50">
                {gen.isPending ? 'Generating…' : '✨ Generate Listing Assets'}
              </button>
            </div>
          )}

          {!opp && (
            <div className="card-dark rounded-xl p-10 text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm text-white/50">Run a search to generate listing assets</p>
            </div>
          )}

          {listing && (
            <>
              <Section label="SEO Title" copyText={listing.seoTitle}>
                <p className="font-semibold text-white text-base leading-snug">{listing.seoTitle}</p>
              </Section>

              <Section label="Bullet Points" copyText={bullets.join('\n')}>
                <ul className="space-y-2.5">
                  {bullets.map((b: string, i: number) => (
                    <li key={i} className="flex gap-2.5 text-sm text-white/70 leading-snug">
                      <span className="text-violet-400 font-bold shrink-0 mt-0.5">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section label="Description" copyText={listing.description}>
                <p className="text-sm text-white/70 leading-relaxed">{listing.description}</p>
              </Section>

              {Object.keys(kwMap).length > 0 && (
                <Section label="Keyword Strategy" copyText={kwText}>
                  <div className="space-y-3">
                    {Object.entries(kwMap).map(([k, vals]: [string, any]) => (
                      <div key={k}>
                        <div className="text-xs font-semibold text-white/40 capitalize mb-2">{k}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(vals) ? vals : []).map((kw: string, i: number) => (
                            <span key={i} className="text-xs leading-snug bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2.5 py-1 rounded-full">
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
                  <p className="text-sm text-white/70 leading-relaxed">{listing.positioning}</p>
                </Section>
              )}

              <div className="pt-2">
                <button onClick={() => gen.mutate()} disabled={gen.isPending}
                  className="text-xs text-white/30 hover:text-white/60 underline disabled:opacity-40 transition-colors">
                  {gen.isPending ? 'Regenerating…' : '↺ Regenerate assets'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
