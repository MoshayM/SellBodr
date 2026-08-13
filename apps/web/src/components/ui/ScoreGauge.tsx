'use client';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

function scoreColor(score: number) {
  if (score >= 70) return '#16a34a';
  if (score >= 40) return '#d97706';
  return '#dc2626';
}

function scoreLabel(score: number) {
  if (score >= 70) return 'score-green';
  if (score >= 40) return 'score-amber';
  return 'score-red';
}

interface Props { score: number; label?: string; size?: 'sm' | 'md' | 'lg'; }

export function ScoreGauge({ score, label, size = 'md' }: Props) {
  const dim = size === 'sm' ? 64 : size === 'md' ? 88 : 120;
  const fontSize = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl';
  const color = scoreColor(score);
  const data = [{ value: score, fill: color }];

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: dim, height: dim }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%"
            startAngle={90} endAngle={-270} data={data} barSize={8}>
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'rgba(255,255,255,0.08)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${fontSize}`} style={{ color }}>{Math.round(score)}</span>
        </div>
      </div>
      {label && <span className="text-xs text-white/40 text-center">{label}</span>}
    </div>
  );
}

export function RecommendationBadge({ rec, confidence }: { rec: string; confidence?: number }) {
  const styles: Record<string, string> = {
    launch: 'bg-green-500/20 text-green-400 border-green-500/30',
    hold:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
    reject: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const icons: Record<string, string> = { launch: '🚀', hold: '⏸', reject: '✕' };
  const s = styles[rec] || styles.hold;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${s}`}>
      {icons[rec]} {rec?.toUpperCase()}
      {confidence !== undefined && <span className="opacity-70 ml-1">({confidence}%)</span>}
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
