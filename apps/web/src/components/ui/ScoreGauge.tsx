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
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#f1f5f9' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${fontSize}`} style={{ color }}>{Math.round(score)}</span>
        </div>
      </div>
      {label && <span className="text-xs text-gray-500 text-center">{label}</span>}
    </div>
  );
}

export function RecommendationBadge({ rec, confidence }: { rec: string; confidence?: number }) {
  const styles: Record<string, string> = {
    launch: 'bg-green-100 text-green-800 border-green-200',
    hold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    reject: 'bg-red-100 text-red-800 border-red-200',
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
