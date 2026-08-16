'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, isPro } from '@/lib/api';
import { ProGate } from '@/components/ui/ProGate';

type Report = { id: string; product: any; marketplace: any; content: any; generatedAt: string };

function ReportView({ content }: { content: any }) {
  if (!content || typeof content !== 'object') return <p className="text-sm text-white/40">No content</p>;
  return (
    <div className="space-y-5">
      {Object.entries(content).filter(([, v]) => v !== null && v !== undefined).map(([key, val]) => (
        <div key={key}>
          <div className="text-[10px] leading-none font-semibold text-white/30 uppercase tracking-widest mb-2">
            {key.replace(/_/g, ' ')}
          </div>
          {typeof val === 'string' ? (
            <p className="text-sm text-white/70 leading-relaxed">{val}</p>
          ) : Array.isArray(val) ? (
            <ul className="space-y-1.5">
              {(val as any[]).map((item, i) => (
                <li key={i} className="text-sm text-white/70 flex gap-2 leading-snug">
                  <span className="text-violet-400 shrink-0">•</span>
                  <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                </li>
              ))}
            </ul>
          ) : typeof val === 'object' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(val as object).map(([k, v]) => (
                <div key={k} className="bg-white/5 rounded-lg px-3 py-2.5">
                  <div className="text-xs text-white/30 capitalize leading-snug mb-0.5">{k.replace(/_/g, ' ')}</div>
                  <div className="text-sm font-medium text-white leading-snug">{String(v)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-white leading-snug">{String(val)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [isFree, setIsFree] = useState(true);
  useEffect(() => { setIsFree(!isPro()); }, []);

  const { data: opps = [] } = useQuery({ queryKey: ['opportunities'], queryFn: () => api.opportunities.list({}), enabled: !isFree });
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isFree) return (
    <ProGate
      icon="📊"
      feature="Export & Reports"
      tagline="Download full opportunity reports as PDF or JSON — complete with supplier contacts, compliance notes, profit model, and trade data. Share-ready for teams and investors."
      benefits={[
        'PDF & JSON export for every opportunity',
        'Supplier contacts + compliance notes',
        'Profit model + trade lane cost data',
        'Share-ready format for teams & investors',
      ]}
    />
  );

  async function generate(opp: any) {
    setGenerating(opp.id);
    try {
      const data = await api.opportunities.generateReport(opp.id) as any;
      const report: Report = {
        id: opp.id,
        product: opp.product,
        marketplace: opp.marketplace,
        content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content,
        generatedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      };
      setReports(prev => [report, ...prev.filter(r => r.id !== opp.id)]);
      setExpanded(opp.id);
    } catch { /* silent */ }
    setGenerating('');
  }

  function copyReport(r: Report) {
    const text = Object.entries(r.content || {})
      .map(([k, v]) => `${k.replace(/_/g,' ').toUpperCase()}\n${
        Array.isArray(v) ? (v as any[]).join('\n') : typeof v === 'object' ? JSON.stringify(v, null, 2) : v
      }`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-sm text-white/40 mt-0.5 leading-snug">Generate full opportunity intelligence reports</p>
      </div>

      {(opps as any[]).length === 0 && reports.length === 0 && (
        <div className="card-dark rounded-xl p-12 sm:p-14 text-center">
          <div className="text-5xl mb-4">📊</div>
          <p className="font-semibold text-white mb-1">No data yet</p>
          <p className="text-sm text-white/40 mb-5">Run a search on the Opportunities page first</p>
          <a href="/opportunities" className="btn-primary text-sm">Go to Opportunities →</a>
        </div>
      )}

      {(opps as any[]).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {(opps as any[]).map((opp: any) => {
            const done = reports.some(r => r.id === opp.id);
            return (
              <div key={opp.id} className="card-dark rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate leading-snug">{opp.product?.title}</div>
                  <div className="text-xs text-white/40 mt-1 flex items-center gap-2 leading-snug">
                    <span className="font-mono">{opp.marketplace?.code?.toUpperCase()}</span>
                    {done && <span className="text-green-400">✓ Generated</span>}
                  </div>
                </div>
                <button onClick={() => generate(opp)}
                  disabled={generating === opp.id}
                  className={`shrink-0 text-xs leading-none px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 min-h-[36px] ${
                    done
                      ? 'border border-white/10 text-white/50 hover:bg-white/5'
                      : 'bg-violet-600 text-white hover:bg-violet-500'
                  }`}>
                  {generating === opp.id ? 'Generating…' : done ? 'Regenerate' : 'Generate'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {reports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white/60 leading-snug">Generated Reports</h2>
          {reports.map(r => (
            <div key={r.id} className="card-dark rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-white/10 gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate leading-snug">{r.product?.title}</div>
                  <div className="text-xs text-white/40 mt-1 leading-snug">
                    {r.marketplace?.code?.toUpperCase()} · {r.generatedAt}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => copyReport(r)}
                    className="text-xs leading-none px-2.5 py-1.5 border border-white/10 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-colors">
                    Copy
                  </button>
                  <button onClick={() => setExpanded(e => e === r.id ? null : r.id)}
                    className="text-xs leading-none px-2.5 py-1.5 bg-white/10 rounded-lg text-white/70 hover:bg-white/15 whitespace-nowrap transition-colors">
                    {expanded === r.id ? 'Close' : 'View'}
                  </button>
                </div>
              </div>
              {expanded === r.id && (
                <div className="px-4 sm:px-5 py-5">
                  <ReportView content={r.content} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
