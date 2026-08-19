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

type BadgeCfg = { bg: string; border: string; text: string; glow: string; icon: string; anim: string };

export function RecommendationBadge({ rec, confidence }: { rec: string; confidence?: number }) {
  const cfg: Record<string, BadgeCfg> = {
    launch: {
      bg:   'linear-gradient(135deg,rgba(16,185,129,0.18) 0%,rgba(5,150,105,0.10) 100%)',
      border: 'rgba(16,185,129,0.38)',
      text: '#34d399',
      glow: '0 2px 8px rgba(16,185,129,0.22), inset 0 1px 0 rgba(255,255,255,0.07)',
      icon: '🚀',
      anim: 'animate-badge-launch',
    },
    hold: {
      bg:   'linear-gradient(135deg,rgba(245,158,11,0.16) 0%,rgba(217,119,6,0.10) 100%)',
      border: 'rgba(245,158,11,0.32)',
      text: '#fbbf24',
      glow: '0 2px 7px rgba(245,158,11,0.2)',
      icon: '⏸',
      anim: 'animate-badge-hold',
    },
    reject: {
      bg:   'linear-gradient(135deg,rgba(239,68,68,0.15) 0%,rgba(185,28,28,0.09) 100%)',
      border: 'rgba(239,68,68,0.30)',
      text: '#f87171',
      glow: '0 2px 6px rgba(239,68,68,0.16)',
      icon: '✕',
      anim: 'animate-badge-reject',
    },
  };
  const c = cfg[rec] ?? cfg.hold;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border select-none ${c.anim}`}
      style={{ background: c.bg, borderColor: c.border, color: c.text, boxShadow: c.glow, letterSpacing: '0.04em' }}>
      <span className="text-[10px]">{c.icon}</span>
      {rec?.toUpperCase()}
      {confidence !== undefined && (
        <span className="ml-0.5 text-[10px] font-medium" style={{ opacity: 0.72 }}>({confidence}%)</span>
      )}
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
