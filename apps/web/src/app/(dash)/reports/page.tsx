'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';

type Report = { id: string; product: any; marketplace: any; content: any; generatedAt: string };

function ReportView({ content }: { content: any }) {
  if (!content || typeof content !== 'object') return <p className="text-sm text-gray-400">No content</p>;
  return (
    <div className="space-y-4">
      {Object.entries(content).filter(([, v]) => v !== null && v !== undefined).map(([key, val]) => (
        <div key={key}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
            {key.replace(/_/g, ' ')}
          </div>
          {typeof val === 'string' ? (
            <p className="text-sm text-gray-700 leading-relaxed">{val}</p>
          ) : Array.isArray(val) ? (
            <ul className="space-y-1">
              {(val as any[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-green-500 shrink-0">&bull;</span>
                  <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                </li>
              ))}
            </ul>
          ) : typeof val === 'object' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(val as object).map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="text-xs text-gray-400 capitalize">{k.replace(/_/g, ' ')}</div>
                  <div className="text-sm font-medium text-gray-800">{String(v)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-800">{String(val)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { data: opps = [] } = useQuery({ queryKey: ['opportunities'], queryFn: () => api.opportunities.list({}) });
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

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
    } catch { /* report just won't appear */ }
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">Generate full opportunity intelligence reports</p>
      </div>

      {(opps as any[]).length === 0 && reports.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 sm:p-14 text-center shadow-sm">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-medium text-gray-700 mb-1">No data yet</p>
          <p className="text-sm text-gray-400">Run a search on the Opportunities page first</p>
        </div>
      )}

      {(opps as any[]).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {(opps as any[]).map((opp: any) => {
            const done = reports.some(r => r.id === opp.id);
            return (
              <div key={opp.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{opp.product?.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    <span className="font-mono">{opp.marketplace?.code?.toUpperCase()}</span>
                    {done && <span className="text-green-600">&#x2713; Generated</span>}
                  </div>
                </div>
                <button onClick={() => generate(opp)}
                  disabled={generating === opp.id}
                  className={`shrink-0 text-xs px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 min-h-[36px] ${
                    done
                      ? 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                      : 'bg-green-600 text-white hover:bg-green-700'
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
          <h2 className="text-sm font-semibold text-gray-700">Generated Reports</h2>
          {reports.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100 gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{r.product?.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {r.marketplace?.code?.toUpperCase()} &middot; {r.generatedAt}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => copyReport(r)}
                    className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                    Copy
                  </button>
                  <button onClick={() => setExpanded(e => e === r.id ? null : r.id)}
                    className="text-xs px-2.5 py-1.5 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 whitespace-nowrap">
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
