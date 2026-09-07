'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, isPro } from '@/lib/api';
import { ProGate } from '@/components/ui/ProGate';
import { ExportMenu } from '@/components/ui/ExportMenu';

const REPORT_STAGES = [
  { icon: '🔬', label: 'Analysing market',  ms: 2500 },
  { icon: '💰', label: 'Profit deep-dive',  ms: 3000 },
  { icon: '🏭', label: 'Supplier research', ms: 3000 },
  { icon: '📊', label: 'Compiling report',  ms: 2500 },
  { icon: '✅', label: 'Finalising',        ms: 1500 },
];

type Report = { id: string; product: any; marketplace: any; content: any; generatedAt: string };

function ReportView({ content }: { content: any }) {
  if (!content || typeof content !== 'object') return <p className="text-sm text-white/40">No content</p>;
  return (
    <div className="space-y-5">
      {Object.entries(content).filter(([, v]) => v !== null && v !== undefined).map(([key, val]) => (
        <div key={key}>
          <div className="text-[10px] leading-none font-semibold text-white/40 uppercase tracking-widest mb-2">
            {key.replace(/_/g, ' ')}
          </div>
          {typeof val === 'string' ? (
            <p className="text-sm text-white/60 leading-relaxed">{val}</p>
          ) : Array.isArray(val) ? (
            <ul className="space-y-1.5">
              {(val as any[]).map((item, i) => (
                <li key={i} className="text-sm text-white/60 flex gap-2 leading-snug">
                  <span className="text-violet-500 shrink-0">•</span>
                  <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                </li>
              ))}
            </ul>
          ) : typeof val === 'object' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(val as object).map(([k, v]) => (
                <div key={k} className="bg-white/5 border border-white/8 rounded-lg px-3 py-2.5">
                  <div className="text-xs text-white/40 capitalize leading-snug mb-0.5">{k.replace(/_/g, ' ')}</div>
                  <div className="text-sm font-medium text-white/80 leading-snug">{String(v)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-white/80 leading-snug">{String(val)}</p>
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

  const [reportStep, setReportStep] = useState(0);
  useEffect(() => {
    if (!generating) { setReportStep(0); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cum = 0;
    for (let i = 1; i < REPORT_STAGES.length - 1; i++) {
      cum += REPORT_STAGES[i - 1].ms;
      const idx = i;
      timers.push(setTimeout(() => setReportStep(idx), cum));
    }
    return () => timers.forEach(clearTimeout);
  }, [generating]);
  const reportPct = Math.min(90, Math.round((reportStep / (REPORT_STAGES.length - 1)) * 100));

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
      <div className="flex items-start justify-between gap-3 mb-7 animate-card-in">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-400 text-[11px] font-semibold uppercase tracking-wide mb-2">
            <span>📊</span> Reports
          </div>
          <h1 className="text-2xl font-black text-white leading-tight">Opportunity Reports</h1>
          <p className="text-sm text-white/50 mt-1 leading-snug">Generate full intelligence reports for your scouted opportunities</p>
        </div>
        {(opps as any[]).length > 0 && (
          <div className="shrink-0 mt-1">
            <ExportMenu
              getData={() => opps as any[]}
              label="opportunities"
              align="right"
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {(opps as any[]).length === 0 && reports.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 sm:p-16 text-center animate-card-in stagger-1 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
            📊
          </div>
          <p className="font-bold text-white text-base mb-1">No opportunities yet</p>
          <p className="text-sm text-white/50 mb-6">Run a Scout search on the Opportunities page first to generate reports</p>
          <a href="/opportunities" className="btn-primary text-sm">Go to Opportunities →</a>
        </div>
      )}

      {/* Opportunity cards grid */}
      {(opps as any[]).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {(opps as any[]).map((opp: any, idx: number) => {
            const done = reports.some(r => r.id === opp.id);
            const isThisGenerating = generating === opp.id;
            const stagger = `stagger-${Math.min(idx + 1, 10)}` as string;
            return (
              <div key={opp.id} className={`bg-white/5 border border-white/10 hover:border-indigo-500/20 rounded-xl p-4 flex items-center justify-between gap-3 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/5 animate-card-in ${stagger}`}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate leading-snug">{opp.product?.title}</div>
                  <div className="text-xs text-white/40 mt-1 flex items-center gap-2 leading-snug">
                    <span className="font-mono bg-white/10 text-white/50 px-1.5 py-0.5 rounded text-[10px]">{opp.marketplace?.code?.toUpperCase()}</span>
                    {done && <span className="text-green-600 font-medium flex items-center gap-0.5">✓ Generated</span>}
                  </div>
                </div>
                <button onClick={() => generate(opp)}
                  disabled={!!generating}
                  className={`relative overflow-hidden shrink-0 text-xs font-medium inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 select-none min-h-[36px] min-w-[110px] ${
                    isThisGenerating
                      ? 'cursor-not-allowed'
                      : done
                        ? 'border border-white/10 text-white/50 hover:bg-white/5 disabled:opacity-50'
                        : 'bg-violet-600 text-white hover:bg-violet-500 shadow-sm shadow-violet-500/20 disabled:opacity-50'
                  }`}
                  style={isThisGenerating ? { background: 'linear-gradient(135deg,rgba(109,40,217,0.95) 0%,rgba(79,70,229,0.95) 100%)', boxShadow: '0 0 14px rgba(124,58,237,0.55)' } : {}}>
                  {isThisGenerating && (
                    <>
                      <span className="absolute inset-0 bg-white/10 transition-all duration-[900ms] ease-out pointer-events-none"
                        style={{ clipPath: `inset(0 ${100 - reportPct}% 0 0)` }} />
                      <span className="absolute inset-0 pointer-events-none animate-shimmer"
                        style={{ background: 'linear-gradient(90deg,transparent 30%,rgba(255,255,255,0.15) 50%,transparent 70%)', backgroundSize: '200% 100%' }} />
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 overflow-hidden pointer-events-none">
                        <span className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-300 to-indigo-300 transition-all duration-[900ms] ease-out" style={{ width: `${reportPct}%` }} />
                      </span>
                    </>
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {isThisGenerating ? (
                      <>
                        <span className="animate-pulse leading-none">{REPORT_STAGES[reportStep]?.icon}</span>
                        <span className="truncate">{REPORT_STAGES[reportStep]?.label}…</span>
                      </>
                    ) : done ? 'Regenerate' : 'Generate'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Generated reports list */}
      {reports.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest leading-snug">Generated Reports</h2>
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">{reports.length}</span>
          </div>
          {reports.map((r, idx) => (
            <div key={r.id} className={`bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm hover:border-indigo-500/20 transition-all duration-200 animate-card-in stagger-${Math.min(idx + 1, 10)}`}>
              <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-white/8 gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate leading-snug">{r.product?.title}</div>
                  <div className="text-xs text-white/40 mt-1 leading-snug">
                    <span className="font-mono bg-white/10 text-white/50 px-1.5 py-0.5 rounded text-[10px] mr-1.5">{r.marketplace?.code?.toUpperCase()}</span>
                    {r.generatedAt}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ExportMenu
                    getData={() => {
                      const opp = (opps as any[]).find((o: any) => o.id === r.id) ?? { product: r.product, marketplace: r.marketplace };
                      return [opp];
                    }}
                    label={`report-${(r.product?.title ?? 'opportunity').slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`}
                    align="right"
                  />
                  <button onClick={() => copyReport(r)}
                    className="text-xs leading-none px-2.5 py-1.5 border border-white/10 rounded-lg text-white/50 hover:bg-white/5 hover:text-white/70 transition-colors">
                    Copy
                  </button>
                  <button onClick={() => setExpanded(e => e === r.id ? null : r.id)}
                    className="text-xs leading-none px-2.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 hover:bg-indigo-500/15 whitespace-nowrap transition-colors font-medium">
                    {expanded === r.id ? 'Close' : 'View'}
                  </button>
                </div>
              </div>
              {expanded === r.id && (
                <div className="px-4 sm:px-5 py-5 bg-white/5">
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
