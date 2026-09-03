'use client';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

function scoreColor(score: number) {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

interface Props { score: number; label?: string; size?: 'sm' | 'md' | 'lg'; }

export function ScoreGauge({ score, label, size = 'md' }: Props) {
  const dim = size === 'sm' ? 64 : size === 'md' ? 88 : 120;
  const fontSize = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl';
  const color = scoreColor(score);
  const data = [{ value: score, fill: color }];
  const glowColor = score >= 70 ? 'rgba(16,185,129,0.35)' : score >= 40 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)';

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: dim, height: dim, filter: `drop-shadow(0 0 6px ${glowColor})` }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%"
            startAngle={90} endAngle={-270} data={data} barSize={8}>
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'rgba(255,255,255,0.07)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold tabular-nums ${fontSize}`} style={{ color }}>{Math.round(score)}</span>
        </div>
      </div>
      {label && <span className="text-xs text-white/40 text-center">{label}</span>}
    </div>
  );
}

export function RecommendationBadge({ rec, confidence }: { rec: string; confidence?: number }) {
  const cfg: Record<string, { icon: string; color: string; bg: string; border: string }> = {
    launch: { icon: '🚀', color: '#059669', bg: '#ECFDF5', border: '#6EE7B7' },
    hold:   { icon: '⏸', color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
    reject: { icon: '✕', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  };
  const c = cfg[(rec ?? '').toLowerCase()] ?? cfg.hold;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border select-none"
      style={{ color: c.color, backgroundColor: c.bg, borderColor: c.border }}>
      <span>{c.icon}</span>
      {confidence !== undefined && <span className="tabular-nums">{confidence}%</span>}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 70 ? 'score-green' : score >= 40 ? 'score-amber' : 'score-red';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${cls}`}>
      {Math.round(score)}
    </span>
  );
}
