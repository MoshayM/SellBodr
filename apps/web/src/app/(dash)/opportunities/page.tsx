'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ScoreGauge, RecommendationBadge } from '@/components/ui/ScoreGauge';

// ── Formatters ────────────────────────────────────────────────────────────────

function usd(minor: number, decimals = 0) {
  return '$' + (minor / 100).toFixed(decimals);
}
function pct(n: number) { return n.toFixed(1) + '%'; }

const PLATFORM_NAMES: Record<string, string> = {
  amazon: 'Amazon', ebay: 'eBay', shopee: 'Shopee', lazada: 'Lazada',
  tiktok: 'TikTok Shop', walmart: 'Walmart', noon: 'Noon', temu: 'Temu',
  mercadolibre: 'MercadoLibre', flipkart: 'Flipkart', meesho: 'Meesho',
  coupang: 'Coupang', rakuten: 'Rakuten', allegro: 'Allegro', bol: 'Bol.com',
  jumia: 'Jumia', takealot: 'Takealot', etsy: 'Etsy', daraz: 'Daraz',
  cdiscount: 'Cdiscount', onbuy: 'OnBuy', zalando: 'Zalando', otto: 'Otto',
};

const REGIONS: Record<string, string> = {
  us: 'United States', gb: 'United Kingdom', de: 'Germany', fr: 'France',
  it: 'Italy', es: 'Spain', ca: 'Canada', au: 'Australia', in: 'India',
  jp: 'Japan', sg: 'Singapore', my: 'Malaysia', th: 'Thailand',
  ph: 'Philippines', id: 'Indonesia', vn: 'Vietnam', ae: 'UAE',
  sa: 'Saudi Arabia', mx: 'Mexico', br: 'Brazil', pl: 'Poland',
  nl: 'Netherlands', se: 'Sweden', tr: 'Turkey', kr: 'South Korea',
  tw: 'Taiwan', eg: 'Egypt', ng: 'Nigeria', ke: 'Kenya', za: 'South Africa',
  pk: 'Pakistan', lk: 'Sri Lanka', bd: 'Bangladesh', ar: 'Argentina',
  co: 'Colombia', cl: 'Chile', eu: 'Europe',
};

function platformOf(code: string) {
  const p = (code || '').split('_')[0];
  return PLATFORM_NAMES[p] || p.charAt(0).toUpperCase() + p.slice(1);
}
function countryCode(mpCode: string): string {
  const parts = (mpCode || '').split('_');
  const last = parts[parts.length - 1];
  return last.length === 2 ? last.toUpperCase() : '';
}
function flag(cc: string): string {
  if (!cc || cc.length !== 2) return '';
  return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
}
function mkLabel(mp: any): string {
  const cc = countryCode(mp.code);
  return `${cc ? flag(cc) : '🛒'} ${platformOf(mp.code)}${cc ? ` ${cc}` : ''}`;
}
function regionName(mpCode: string): string {
  const cc = countryCode(mpCode).toLowerCase();
  return REGIONS[cc] || cc.toUpperCase() || 'Global';
}

// ── Trend helpers ─────────────────────────────────────────────────────────────

function trendSource(code: string): { icon: string; label: string; key: string; color: string } {
  if (!code) return { icon: '📊', label: 'Market Trend', key: 'market', color: '#7c3aed' };
  if (code.startsWith('tiktok'))  return { icon: '📱', label: 'TikTok Viral', key: 'social',  color: '#ff2d55' };
  if (code.startsWith('etsy'))    return { icon: '🎨', label: 'Etsy Curated', key: 'curated', color: '#f1641e' };
  if (code.startsWith('amazon'))  return { icon: '🔍', label: 'Amazon Search', key: 'search', color: '#ff9900' };
  if (code.startsWith('ebay'))    return { icon: '🔍', label: 'eBay Search',   key: 'search', color: '#0064d2' };
  if (code.startsWith('walmart')) return { icon: '💲', label: 'Walmart Value', key: 'value',  color: '#0071ce' };
  if (code.startsWith('temu'))    return { icon: '💲', label: 'Temu Value',    key: 'value',  color: '#ff6900' };
  if (code.startsWith('shopee') || code.startsWith('lazada')) return { icon: '🌏', label: 'SEA Trend', key: 'sea', color: '#ee4d2d' };
  if (code.startsWith('noon'))    return { icon: '🌙', label: 'Noon ME',       key: 'me',     color: '#ffcc00' };
  if (code.startsWith('flipkart') || code.startsWith('meesho')) return { icon: '🇮🇳', label: 'India Trend', key: 'india', color: '#047bd5' };
  return { icon: '📊', label: 'Market Trend', key: 'market', color: '#7c3aed' };
}

function trendStrengthLabel(score: number): { label: string; key: string; color: string } {
  if (score >= 80) return { label: '🔥 Hot',      key: 'hot',      color: '#ef4444' };
  if (score >= 60) return { label: '📈 Rising',   key: 'rising',   color: '#f59e0b' };
  if (score >= 40) return { label: '➡️ Stable',   key: 'stable',   color: '#6b7280' };
  return              { label: '📉 Declining', key: 'declining', color: '#3b82f6' };
}

const DAY = 86_400_000;
function trendTenure(createdAt: number): { label: string; key: string; color: string } {
  const age = Date.now() - Number(createdAt || 0);
  if (age < 2 * DAY)  return { label: 'Last 2 days',   key: '2d',  color: '#10b981' };
  if (age < 7 * DAY)  return { label: 'This week',     key: '7d',  color: '#06b6d4' };
  if (age < 30 * DAY) return { label: 'This month',    key: '30d', color: '#8b5cf6' };
  if (age < 90 * DAY) return { label: 'Last 3 months', key: '3m',  color: '#f59e0b' };
  return                { label: 'Older',          key: 'old', color: '#6b7280' };
}

// ── Horizontal cost bar (detail breakdown) ───────────────────────────────────

function WaterfallBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pctW = total > 0 ? Math.min(100, (Math.abs(value) / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-40 text-white/50 text-right shrink-0 leading-snug">{label}</div>
      <div className="flex-1 h-3 bg-white/5 rounded overflow-hidden">
        <div className="h-full rounded" style={{ width: `${pctW}%`, backgroundColor: color, opacity: 0.85 }} />
      </div>
      <div className="w-14 font-mono font-semibold text-right shrink-0 text-white/80">{usd(value, 2)}</div>
    </div>
  );
}

// ── 3D animated profit waterfall chart ───────────────────────────────────────

function ProfitWaterfallChart({ pm, currency, platform }: { pm: any; currency: string; platform: string }) {
  const sym = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  const fmt  = (v: number) => `${sym}${(Math.abs(v) / 100).toFixed(2)}`;
  const fmtN = (v: number) => `${v < 0 ? '-' : '+'}${sym}${(Math.abs(v) / 100).toFixed(2)}`;

  const sale    = Number(pm.salePriceMinor    ?? 0);
  const src     = Number(pm.productCostMinor  ?? 0);
  const ship    = Number(pm.intlShippingMinor ?? 0);
  const pkg     = Number(pm.packagingCostMinor ?? 0);
  const duty    = Number(pm.dutyMinor          ?? 0);
  const landed  = Number(pm.landedCostMinor   ?? (src + ship + pkg + duty));
  const refFee  = Number(pm.referralFeeMinor  ?? 0);
  const fbaFee  = Number(pm.fbaFeeMinor        ?? 0);
  const ads     = Number(pm.adCostMinor        ?? 0);
  const net     = Number(pm.trueNetMinor ?? pm.netProfitMinor ?? 0);
  const margin  = Number(pm.netMarginPct  ?? 0);
  const roi     = Number(pm.roiPct        ?? 0);
  const breakeven = Number(pm.breakevenUnits ?? (net > 0 ? Math.ceil(50000 / net) : 999));
  const monthly = Number(pm.monthlyProfitMinor ?? net * 50);
  const referralPct = Number(pm.referralPct ?? 15);

  const isLoss = net < 0;

  // Each bar is independent from the zero line:
  //   positive (sale, net profit) → grows UP from center
  //   negative (costs, net loss)  → grows DOWN from center
  interface Step { key: string; label: string; value: number; color: string; glow: string; up: boolean }
  const allSteps: Step[] = [
    { key: 'sale',   label: 'Sale Price',          value: sale,    color: '#8b5cf6', glow: '#8b5cf655', up: true  },
    { key: 'src',    label: 'Source',              value: src,     color: '#f43f5e', glow: '#f43f5e55', up: false },
    { key: 'ship',   label: 'Shipping',            value: ship,    color: '#fb923c', glow: '#fb923c55', up: false },
    { key: 'pkg',    label: 'Packaging',           value: pkg,     color: '#fbbf24', glow: '#fbbf2455', up: false },
    { key: 'duty',   label: 'Duties',              value: duty,    color: '#f59e0b', glow: '#f59e0b55', up: false },
    { key: 'landed', label: 'Landed Cost',         value: landed,  color: '#06b6d4', glow: '#06b6d455', up: false },
    { key: 'ref',    label: `Ref ${referralPct}%`, value: refFee,  color: '#f87171', glow: '#f8717155', up: false },
    { key: 'fba',    label: 'FBA',                 value: fbaFee,  color: '#ef4444', glow: '#ef444455', up: false },
    { key: 'ads',    label: 'Ads 5%',              value: ads,     color: '#94a3b8', glow: '#94a3b855', up: false },
    { key: 'net',    label: isLoss ? 'Net Loss' : 'Net Profit',
      value: Math.abs(net),
      color: isLoss ? '#ef4444' : '#10b981',
      glow:  isLoss ? '#ef444455' : '#10b98155',
      up: !isLoss },
  ];
  const steps = allSteps.filter(s => s.key === 'sale' || s.key === 'net' || s.value > 0);
  const n = steps.length;

  // Symmetric chart: CENTER_H px above zero line + CENTER_H px below
  const CENTER_H = 120;
  const TOTAL_H  = CENTER_H * 2;

  // Single scale so bars are proportional to each other across both zones
  const maxUp   = Math.max(sale, net > 0 ? net : 0, 1);
  const maxDown = Math.max(src, ship, pkg, duty, landed, refFee, fbaFee, ads, net < 0 ? Math.abs(net) : 0, 1);
  const scale   = Math.min((CENTER_H * 0.92) / maxUp, (CENTER_H * 0.92) / maxDown);

  const pitchPct    = 100 / n;
  const barWidthPct = pitchPct * 0.70;
  const gapPct      = (pitchPct - barWidthPct) / 2;

  const bars = steps.map((step, i) => {
    const leftPct = i * pitchPct + gapPct;
    const h   = Math.max(step.value * scale, 4);
    const top = step.up
      ? CENTER_H - h   // bar tip above the zero line
      : CENTER_H;      // bar tip at the zero line, hangs down
    return { ...step, leftPct, barWidthPct, top, h, i };
  });

  return (
    <div className="p-4 select-none">
      <style>{`
        @keyframes wf-rise  { from{transform:scaleY(0);opacity:0} to{transform:scaleY(1);opacity:1} }
        @keyframes wf-drop  { from{transform:scaleY(0);opacity:0} to{transform:scaleY(1);opacity:1} }
        @keyframes wf-fadein{ from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
          Profit Waterfall — {platform}
        </span>
        <div className="flex items-center gap-3">
          {([['#8b5cf6','Revenue'],['#f43f5e','Costs'],[isLoss?'#ef4444':'#10b981',isLoss?'Loss':'Profit']] as [string,string][]).map(([c,l])=>(
            <span key={l} className="flex items-center gap-1 text-[9px] text-white/30">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{background:c}}/>
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative w-full overflow-visible" style={{height: TOTAL_H + 32}}>

        {/* Upper zone (revenue) — subtle green tint */}
        <div className="absolute left-0 right-0 rounded-t-xl pointer-events-none" style={{
          top: 0, height: CENTER_H,
          background: 'linear-gradient(180deg,rgba(16,185,129,0.04) 0%,transparent 100%)',
        }}/>

        {/* Lower zone (cost) — subtle red tint */}
        <div className="absolute left-0 right-0 rounded-b-xl pointer-events-none" style={{
          top: CENTER_H, height: CENTER_H,
          background: 'linear-gradient(180deg,transparent 0%,rgba(239,68,68,0.06) 100%)',
        }}/>

        {/* Zero line — 1px div pinned exactly at CENTER_H, label floats above */}
        <div className="absolute left-0 right-0 h-px z-20" style={{
          top: CENTER_H,
          background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.28) 0px,rgba(255,255,255,0.28) 6px,transparent 6px,transparent 10px)',
        }}/>
        <span className="absolute right-0 z-20 text-[8px] font-mono text-white/35 bg-black/30 rounded px-1"
          style={{top: CENTER_H - 10}}>{sym}0</span>

        {/* Bars */}
        {bars.map((bar) => {
          const delay   = bar.i * 0.055;
          const origin  = bar.up ? 'bottom center' : 'top center';
          const isShort = bar.h < 22;

          return (
            <div key={bar.key}>
              {/* Value label */}
              <div className="absolute text-center pointer-events-none z-30"
                style={{
                  left:  `${bar.leftPct}%`,
                  width: `${bar.barWidthPct}%`,
                  top: bar.up
                    ? (isShort ? bar.top - 13 : bar.top + bar.h / 2 - 5)
                    : (isShort ? bar.top + bar.h + 3 : bar.top + bar.h / 2 - 5),
                  fontSize: 7.5, fontFamily: 'monospace', fontWeight: 700, lineHeight: 1,
                  color: 'rgba(255,255,255,0.92)',
                  textShadow: `0 0 8px ${bar.glow}`,
                  animation: `wf-fadein 0.3s ease-out ${delay + 0.45}s both`,
                }}>
                {bar.key === 'net' ? fmtN(net) : fmt(bar.value)}
              </div>

              {/* 3-D bar wrapper */}
              <div className="absolute" style={{
                left: `${bar.leftPct}%`, width: `${bar.barWidthPct}%`,
                top: bar.top, height: bar.h,
                transformOrigin: origin,
                animation: `${bar.up ? 'wf-rise' : 'wf-drop'} 0.52s cubic-bezier(0.34,1.18,0.64,1) ${delay}s both`,
                zIndex: bar.key === 'net' ? 10 : 5,
              }}>
                {/* Front face */}
                <div className="absolute inset-0" style={{
                  borderRadius: bar.up ? '5px 5px 0 0' : '0 0 5px 5px',
                  background: bar.up
                    ? `linear-gradient(180deg,${bar.color}ff 0%,${bar.color}cc 70%,${bar.color}99 100%)`
                    : `linear-gradient(180deg,${bar.color}cc 0%,${bar.color}ff 100%)`,
                  boxShadow: [
                    `0 0 18px ${bar.glow}`,
                    `inset 0 1px 0 rgba(255,255,255,0.28)`,
                    `inset -1px 0 0 rgba(0,0,0,0.18)`,
                    `3px 3px 0 ${bar.color}44`,
                  ].join(','),
                }}/>
                {/* Shimmer (up bars only) */}
                {bar.up && (
                  <div className="absolute inset-x-0 top-0 opacity-40 pointer-events-none" style={{
                    height: Math.min(bar.h * 0.35, 18),
                    background: 'linear-gradient(180deg,rgba(255,255,255,0.55) 0%,transparent 100%)',
                    borderRadius: '5px 5px 0 0',
                  }}/>
                )}
                {/* Right depth (3-D side) */}
                <div className="absolute" style={{
                  right: -4, top: bar.up ? 4 : 0,
                  width: 4, height: bar.up ? 'calc(100% - 4px)' : '100%',
                  background: `linear-gradient(90deg,${bar.color}aa,${bar.color}33)`,
                  transform: `skewY(${bar.up ? '-45' : '45'}deg)`,
                  transformOrigin: bar.up ? 'top left' : 'bottom left',
                }}/>
                {/* Top/bottom depth (3-D face) */}
                <div className="absolute" style={{
                  left: 4, right: 0,
                  [bar.up ? 'top' : 'bottom']: -4,
                  height: 4,
                  background: bar.up
                    ? 'linear-gradient(180deg,rgba(255,255,255,0.30),rgba(255,255,255,0.06))'
                    : 'linear-gradient(180deg,rgba(0,0,0,0.18),transparent)',
                  transform: 'skewX(-45deg)',
                  transformOrigin: bar.up ? 'bottom left' : 'top left',
                }}/>
              </div>

              {/* Category label */}
              <div className="absolute text-center pointer-events-none" style={{
                left:  `${bar.leftPct}%`,
                width: `${bar.barWidthPct}%`,
                top: TOTAL_H + 5,
                fontSize: 8,
                fontWeight: bar.key === 'net' ? 700 : 400,
                color: bar.key === 'net' ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.32)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                animation: `wf-fadein 0.3s ease-out ${delay + 0.6}s both`,
              }}>
                {bar.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
        {([
          { label: 'Net / Unit',  val: fmtN(net),                 ok: net >= 0,       big: true  },
          { label: 'Net Margin',  val: `${margin.toFixed(1)}%`,   ok: margin >= 15,   big: false },
          { label: 'ROI',         val: `${roi.toFixed(0)}%`,      ok: roi >= 0,       big: false },
          { label: 'Break-even',  val: `${Math.min(breakeven, 999)} units`, ok: breakeven < 200, big: false },
        ] as { label: string; val: string; ok: boolean; big: boolean }[]).map(({ label, val, ok, big }) => (
          <div key={label} className={`rounded-xl border p-2.5 transition-colors ${
            big
              ? ok ? 'border-emerald-500/35 bg-emerald-500/10' : 'border-red-500/35 bg-red-500/10'
              : 'border-white/8 bg-white/[0.025]'
          }`}>
            <div className="text-[9px] text-white/30 mb-0.5">{label}</div>
            <div className={`font-bold text-sm leading-tight ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Monthly projection */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-white/20 px-0.5">
        <span>Est. monthly (50 units):
          <strong className={`ml-1 ${monthly >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
            {fmtN(monthly)}
          </strong>
        </span>
        <span>{currency} · {platform} std. fees</span>
      </div>
    </div>
  );
}

// ── Score bar (research tab) ──────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.round(value);
  const color = v >= 70 ? '#10b981' : v >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-[90px] text-white/45 text-right shrink-0 leading-tight">{label}</span>
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, backgroundColor: color }} />
      </div>
      <span className="w-6 font-bold shrink-0 tabular-nums" style={{ color }}>{v}</span>
    </div>
  );
}

// ── Research tab (inline per-product AI intelligence) ─────────────────────────

function ResearchTab({ opp }: { opp: any }) {
  const score = opp.score ?? {};
  const desc  = String(opp.product?.description ?? '');
  const parts = desc.split(' | ');
  const body      = parts[0] ?? '';
  const evidence  = (parts.find((p: string) => p.startsWith('Evidence:'))  ?? '').replace('Evidence: ',  '');
  const consensus = (parts.find((p: string) => p.startsWith('Consensus:')) ?? '').replace('Consensus: ', '');
  const note      = (parts.find((p: string) => p.startsWith('Note:'))      ?? '').replace('Note: ',      '');
  const conf      = Math.round(opp.confidence ?? 0);
  const confColor = conf >= 80 ? '#10b981' : conf >= 65 ? '#f59e0b' : '#6b7280';
  const feasibility = String((opp.suppliers as any[])?.[0]?.feasibility ?? 'moderate');
  const feasColor   = feasibility === 'easy' ? '#10b981' : feasibility === 'hard' ? '#ef4444' : '#f59e0b';
  const tStr = trendStrengthLabel(score.trend ?? 0);
  function sig(v: number) {
    return { color: v >= 70 ? '#10b981' : v >= 45 ? '#f59e0b' : '#ef4444', label: v >= 70 ? 'Strong' : v >= 45 ? 'Moderate' : 'Weak' };
  }
  const signals = [
    { icon: '📈', label: 'Trend Strength',  val: tStr.label,                                                      color: tStr.color },
    { icon: '🏭', label: 'India Supply',    val: feasibility.charAt(0).toUpperCase() + feasibility.slice(1),       color: feasColor },
    { icon: '🚢', label: 'Shipping',        val: sig(score.shipping ?? 0).label,                                   color: sig(score.shipping ?? 0).color },
    { icon: '🎯', label: 'Mkt Fit',        val: sig(score.marketplaceFit ?? 0).label,                              color: sig(score.marketplaceFit ?? 0).color },
    { icon: '📊', label: 'Saturation',      val: (score.saturation ?? 0) >= 70 ? 'Low ✓' : (score.saturation ?? 0) >= 45 ? 'Medium' : 'High ⚠', color: sig(score.saturation ?? 0).color },
  ];

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5">

      {/* Left — score breakdown */}
      <div>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3">Score Breakdown</p>
        <div className="space-y-2.5">
          <ScoreBar label="Demand"      value={score.demand       ?? 0} />
          <ScoreBar label="Competition" value={score.competition  ?? 0} />
          <ScoreBar label="Margin"      value={score.margin       ?? 0} />
          <ScoreBar label="Trend"       value={score.trend        ?? 0} />
          <ScoreBar label="Mkt Fit"     value={score.marketplaceFit ?? 0} />
          <ScoreBar label="Shipping"    value={score.shipping     ?? 0} />
          <ScoreBar label="Saturation"  value={score.saturation   ?? 0} />
        </div>
        <div className="mt-4 pt-3 border-t border-white/8 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 w-[90px] text-right shrink-0">AI Confidence</span>
            <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${conf}%`, backgroundColor: confColor }} />
            </div>
            <span className="w-6 text-xs font-bold tabular-nums" style={{ color: confColor }}>{conf}%</span>
          </div>
          {consensus && (
            <p className="text-[10px] text-emerald-400/60 pl-2">✓ Consensus: {consensus}</p>
          )}
        </div>
      </div>

      {/* Right — market signals + AI evidence */}
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">Market Signals</p>
          <div className="space-y-2">
            {signals.map(s => (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                <span className="w-5 shrink-0">{s.icon}</span>
                <span className="text-white/45 flex-1">{s.label}</span>
                <span className="font-semibold" style={{ color: s.color }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        {(body || evidence) && (
          <div className="pt-3 border-t border-white/8 space-y-2">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">AI Evidence</p>
            {body && <p className="text-[11px] text-white/55 leading-relaxed">{body}</p>}
            {evidence && (
              <div className="text-[10px] text-white/35 bg-white/3 rounded-lg p-2.5 leading-relaxed border border-white/8">
                📌 {evidence}
              </div>
            )}
            {note && <p className="text-[10px] text-amber-400/60 mt-1">⚠ {note}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Breakdown panel — tabbed: Research | Suppliers | Profitability ─────────────

function BreakdownPanel({ opp, mpCode }: { opp: any; mpCode: string }) {
  const [tab, setTab] = useState<'research' | 'suppliers' | 'profit'>('research');
  const pm          = opp.profitModel;
  const sale        = pm?.salePriceMinor    ?? 0;
  const src         = pm?.productCostMinor  ?? 0;
  const ship        = pm?.intlShippingMinor ?? 0;
  const pkg         = pm?.packagingCostMinor ?? 0;
  const duty        = pm?.dutyMinor         ?? 0;
  const landed      = pm?.landedCostMinor   ?? 0;
  const refFee      = pm?.referralFeeMinor  ?? 0;
  const fbaFee      = pm?.fbaFeeMinor       ?? 0;
  const adSpend     = pm?.adCostMinor       ?? 0;
  const net         = pm?.trueNetMinor ?? pm?.netProfitMinor ?? 0;
  const margin      = pm?.netMarginPct ?? 0;
  const roi         = pm?.roiPct       ?? 0;
  const currency    = pm?.currency     ?? 'USD';
  const platform    = platformOf(mpCode);
  const referralPct = pm?.referralPct  ?? 15;
  const suppliers: any[] = opp.suppliers ?? [];
  const confidence  = Math.round(opp.confidence ?? 0);
  const confColor   = confidence >= 80 ? '#10b981' : confidence >= 65 ? '#f59e0b' : '#6b7280';

  const PANEL_TABS = [
    { key: 'research' as const,   label: '📊 Research' },
    { key: 'suppliers' as const,  label: '🏭 Suppliers' },
    { key: 'profit' as const,     label: '💰 Profitability' },
  ];

  return (
    <div className="bg-white/[0.015] border-t border-white/5">
      {/* Tab bar */}
      <div className="flex items-center border-b border-white/5 px-2">
        {PANEL_TABS.map(t => (
          <button key={t.key}
            onClick={e => { e.stopPropagation(); setTab(t.key); }}
            className={`px-4 py-2.5 text-xs font-semibold tracking-wide transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.key ? 'border-violet-500 text-violet-300' : 'border-transparent text-white/35 hover:text-white/60'
            }`}>
            {t.label}
          </button>
        ))}
        <Link href={`/opportunities/${opp.id}`} onClick={e => e.stopPropagation()}
          className="ml-auto text-[10px] text-violet-400/50 hover:text-violet-400 font-medium hover:underline px-3 py-2.5 transition-colors shrink-0">
          Full Report →
        </Link>
      </div>

      {/* ── Research tab ── */}
      {tab === 'research' && <ResearchTab opp={opp} />}

      {/* ── Suppliers tab ── */}
      {tab === 'suppliers' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Indian Suppliers</h4>
            <span className="text-[10px] text-white/25">Via IndiaMART &amp; Alibaba</span>
          </div>
          {suppliers.length === 0 ? (
            <div className="text-xs text-white/25 py-6 text-center">
              No supplier data yet — run a new search to populate sourcing candidates
            </div>
          ) : (
            <div className="space-y-2">
              {suppliers.map((s: any, i: number) => (
                <div key={i} className={`rounded-lg border p-3 ${i === 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/8 bg-white/[0.02]'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{s.name}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-white/35 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/8">
                          {s.source === 'indiamart' ? '🇮🇳 IndiaMART' : '🌐 Alibaba'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded border capitalize ${
                          s.feasibility === 'easy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          s.feasibility === 'moderate' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                          'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                          {s.feasibility}
                        </span>
                        {i === 0 && <span className="text-emerald-400 font-semibold">Best Price</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-white">{usd(s.costMinor, 2)}</div>
                      <div className="text-[10px] text-white/35">per unit</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-white/40">
                    <span>MOQ <strong className="text-white/60">{s.moq}</strong> units</span>
                    <span>Lead <strong className="text-white/60">{s.leadDays}d</strong></span>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="ml-auto text-violet-400 hover:text-violet-300 font-medium hover:underline">
                      View supplier →
                    </a>
                  </div>
                  {sale > 0 && (
                    <>
                      <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          style={{ width: `${Math.min(100, (1 - s.costMinor / sale) * 100)}%` }} />
                      </div>
                      <div className="text-[10px] text-white/25 mt-0.5">
                        {pct((1 - s.costMinor / sale) * 100)} gross margin room
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-[10px] text-white/25">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: confColor }} />
            <span>AI Confidence: <span className="font-semibold" style={{ color: confColor }}>{confidence}%</span></span>
            {(() => {
              const m = String(opp.product?.description ?? '').match(/Consensus: ([^|]+)/);
              return m ? <span className="text-emerald-500/60">✓ {m[1].trim().split('+').length} models agreed</span> : null;
            })()}
          </div>
        </div>
      )}

      {/* ── Profitability tab ── */}
      {tab === 'profit' && pm && (
        <>
          {/* Detailed cost breakdown (as shown in screenshot) */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
                Cost Breakdown — {platform}
              </h4>
              <div className="space-y-1.5">
                <WaterfallBar label="India Source Cost"  value={src}    total={sale} color="#6366f1" />
                <WaterfallBar label="Int'l Shipping"     value={ship}   total={sale} color="#8b5cf6" />
                <WaterfallBar label="Packaging + Labels" value={pkg}    total={sale} color="#a78bfa" />
                <WaterfallBar label="Import Duties"      value={duty}   total={sale} color="#c4b5fd" />
                <div className="my-2 flex items-center gap-2 text-xs border-t border-white/10 pt-2">
                  <div className="w-40 text-white/70 font-semibold text-right shrink-0">= Landed Cost</div>
                  <div className="flex-1" />
                  <div className="w-14 font-mono font-bold text-violet-300 text-right">{usd(landed, 2)}</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/25 mt-3 mb-1">
                  <div className="w-40 text-right shrink-0">Sale Price</div>
                  <div className="flex-1" />
                  <div className="w-14 font-mono font-semibold text-white/70 text-right">{usd(sale, 2)}</div>
                </div>
                <WaterfallBar label={`Referral (${referralPct}%)`} value={refFee}  total={sale} color="#ef4444" />
                <WaterfallBar label="FBA / Fulfillment"             value={fbaFee}  total={sale} color="#f97316" />
                <WaterfallBar label="Est. Ad Spend (5%)"            value={adSpend} total={sale} color="#eab308" />
                <WaterfallBar label="Landed Cost"                   value={landed}  total={sale} color="#6366f1" />
              </div>
            </div>
            <div>
              <div className={`rounded-lg border p-4 ${net > 0 ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-red-500/25 bg-red-500/8'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white/60">Net Profit / Unit</span>
                  <span className={`text-2xl font-bold ${net > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {net < 0 ? '-' : ''}{usd(Math.abs(net), 2)}
                  </span>
                </div>
                <div className="flex gap-4 text-[10px] text-white/40 mb-3">
                  <span>Margin <strong className={net > 0 ? 'text-emerald-400' : 'text-red-400'}>{pct(margin)}</strong></span>
                  <span>ROI <strong className={net > 0 ? 'text-emerald-400' : 'text-red-400'}>{roi.toFixed(0)}%</strong></span>
                  {pm.breakevenUnits < 999 && (
                    <span>Break-even <strong className="text-white/60">{pm.breakevenUnits} units</strong></span>
                  )}
                </div>
                {pm.monthlyProfitMinor !== undefined && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-white/40 pt-3 border-t border-white/10">
                    <div>Monthly (50 units)
                      <div className="font-semibold text-white/70 text-sm mt-0.5">{usd(Math.abs(pm.monthlyProfitMinor), 0)}</div>
                    </div>
                    <div>Annual projection
                      <div className="font-semibold text-white/70 text-sm mt-0.5">{usd(Math.abs(pm.annualProfitMinor ?? pm.monthlyProfitMinor * 12), 0)}</div>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-2 text-[10px] text-white/20">
                Fees: {platform} standard · Shipping: India air freight · Duties: destination avg · {currency}
              </p>
            </div>
          </div>

          {/* 3D animated waterfall visualization */}
          <div className="border-t border-white/[0.06]">
            <ProfitWaterfallChart pm={pm} currency={currency} platform={platform} />
          </div>
        </>
      )}
      {tab === 'profit' && !pm && (
        <div className="p-6 text-center text-xs text-white/30">No profitability data for this opportunity</div>
      )}
    </div>
  );
}

// ── Marketplace dropdown (portal-based) ───────────────────────────────────────

function MarketplaceDropdown({ marketplaces, value, onChange, loading }: {
  marketplaces: any[]; value: string; onChange: (v: string) => void; loading: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos]       = useState({ top: 0, left: 0, width: 0 });
  const btnRef   = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 288) });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const onDown = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  const grouped: Record<string, any[]> = {};
  for (const mp of marketplaces) {
    const p = platformOf(mp.code);
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(mp);
  }
  const q = search.toLowerCase();
  const filtered: Record<string, any[]> = {};
  for (const [p, mps] of Object.entries(grouped)) {
    const f = mps.filter(mp => p.toLowerCase().includes(q) || mkLabel(mp).toLowerCase().includes(q) || mp.code.includes(q));
    if (f.length) filtered[p] = f;
  }

  const selected = marketplaces.find(mp => mp.code === value);

  const panel = open && typeof window !== 'undefined' ? createPortal(
    <div ref={panelRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-[#0d1526] border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
      <div className="p-2 border-b border-white/5">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-violet-500/60">
          <svg className="w-3.5 h-3.5 text-white/30 shrink-0" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input autoFocus type="text" placeholder={`Search ${marketplaces.length} marketplaces…`}
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder-white/30 focus:outline-none" />
          {search && <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60 text-xs">✕</button>}
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto scrollbar-dark py-1">
        {Object.keys(filtered).length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-white/30">No marketplaces match &ldquo;{search}&rdquo;</div>
        ) : Object.entries(filtered).map(([platform, mps]) => (
          <div key={platform}>
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/25 uppercase tracking-widest sticky top-0 bg-[#0d1526]">{platform}</div>
            {mps.map((mp: any) => (
              <button key={mp.code} type="button" onClick={() => { onChange(mp.code); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2 text-sm leading-snug transition-colors flex items-center gap-2.5 ${
                  mp.code === value ? 'bg-violet-500/20 text-violet-300' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                <span>{mkLabel(mp)}</span>
                {mp.code === value && <svg className="ml-auto w-3.5 h-3.5 text-violet-400" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button ref={btnRef} type="button" onClick={() => { setOpen(o => !o); setSearch(''); }} disabled={loading}
        className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500/60 rounded-xl px-3 py-2.5 text-sm text-white min-w-[220px] min-h-[42px] transition-colors disabled:opacity-50 text-left focus:outline-none">
        <span className="flex-1 leading-snug">{loading ? 'Loading…' : (selected ? mkLabel(selected) : 'Select marketplace')}</span>
        <svg className={`shrink-0 w-3.5 h-3.5 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 8" fill="none">
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {panel}
    </div>
  );
}

// ── Small pill filter ─────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium leading-none transition-colors whitespace-nowrap ${
        active ? 'bg-violet-600 text-white' : 'bg-white/5 border border-white/10 text-white/55 hover:text-white hover:bg-white/10'}`}>
      {label}
    </button>
  );
}

// ── Select pill ───────────────────────────────────────────────────────────────

const SEL = 'bg-white/5 border border-white/10 hover:border-white/20 text-xs text-white/60 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500/40 [&>option]:bg-[#0d1225] cursor-pointer transition-colors min-h-[34px]';

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[180, 120, 110, 80, 90, 80, 40].map((w, i) => (
        <td key={i} className="px-3 py-3.5">
          <div className="h-4 bg-white/10 rounded" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const qc = useQueryClient();

  // Server-side filters
  const [mpFilter,  setMpFilter]  = useState('amazon_us');
  const [recFilter, setRecFilter] = useState('');

  // Client-side filters
  const [catFilter,      setCatFilter]      = useState('');
  const [srcFilter,      setSrcFilter]      = useState('');
  const [strengthFilter, setStrengthFilter] = useState('');
  const [periodFilter,   setPeriodFilter]   = useState('');
  const [sortBy,         setSortBy]         = useState('score');

  // Expand state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [searching,    setSearching]    = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [searchError,  setSearchError]  = useState('');

  const { data: marketplaces = [], isLoading: mktLoading } = useQuery({
    queryKey: ['marketplaces', 'active'],
    queryFn: () => api.marketplaces.list({ active: true }),
  });

  const oppParams: Record<string, string> = {};
  if (mpFilter)  oppParams.marketplace    = mpFilter;
  if (recFilter) oppParams.recommendation = recFilter;

  const { data: opps = [], isLoading } = useQuery({
    queryKey: ['opportunities', { marketplace: mpFilter, recommendation: recFilter }],
    queryFn: () => api.opportunities.list(oppParams),
  });

  const allOpps = opps as any[];

  const categories = useMemo(
    () => [...new Set(allOpps.map(o => o.product?.category).filter(Boolean))].sort() as string[],
    [allOpps]
  );

  const displayed = useMemo(() => {
    const now = Date.now();
    let rows = allOpps.filter(opp => {
      if (catFilter)      { if (opp.product?.category !== catFilter) return false; }
      if (srcFilter)      { if (trendSource(opp.marketplace?.code).key !== srcFilter) return false; }
      if (strengthFilter) { if (trendStrengthLabel(opp.score?.trend ?? 0).key !== strengthFilter) return false; }
      if (periodFilter) {
        const age = now - Number(opp.createdAt || 0);
        if (periodFilter === '2d'  && age > 2  * DAY) return false;
        if (periodFilter === '7d'  && age > 7  * DAY) return false;
        if (periodFilter === '30d' && age > 30 * DAY) return false;
        if (periodFilter === '3m'  && age > 90 * DAY) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sortBy === 'profit')  return (b.profitModel?.netProfitMinor ?? 0) - (a.profitModel?.netProfitMinor ?? 0);
      if (sortBy === 'trend')   return (b.score?.trend ?? 0) - (a.score?.trend ?? 0);
      if (sortBy === 'newest')  return Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0);
      if (sortBy === 'oldest')  return Number(a.createdAt ?? 0) - Number(b.createdAt ?? 0);
      return (b.score?.opportunity ?? 0) - (a.score?.opportunity ?? 0);
    });
    return rows;
  }, [allOpps, catFilter, srcFilter, strengthFilter, periodFilter, sortBy]);

  const hasClientFilters = !!(catFilter || srcFilter || strengthFilter || periodFilter);

  const runSearch = useMutation({
    mutationFn: () => {
      setSearchError(''); setSearching(true); setSearchStatus('AI analysing market…');
      return api.searches.create({ marketplace: mpFilter });
    },
    onSuccess: (data: any) => {
      setSearching(false);
      if (data?.status === 'failed' || data?.error) {
        setSearchError(data.error || 'Search failed'); setSearchStatus('');
      } else {
        setSearchStatus(`✓ Found ${data?.count ?? 0} opportunities`);
        qc.invalidateQueries({ queryKey: ['opportunities'] });
        setTimeout(() => setSearchStatus(''), 4000);
      }
    },
    onError: (err: any) => {
      setSearching(false); setSearchStatus('');
      setSearchError(err?.message || 'Search failed — check Groq API key in Settings');
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Opportunities</h1>
          <p className="text-sm text-white/40 mt-0.5">AI-ranked cross-border eCommerce opportunities · Click any row for research, suppliers &amp; profitability</p>
        </div>
        <button onClick={() => runSearch.mutate()} disabled={searching}
          className="btn-primary text-sm disabled:opacity-60 shrink-0">
          {searching
            ? <><span className="animate-spin inline-block mr-1">⟳</span>{searchStatus}</>
            : searchStatus
            ? <><span className="mr-1">✓</span>{searchStatus}</>
            : <><span className="mr-1">+</span>New Search</>}
        </button>
      </div>

      {searchError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
          <span className="shrink-0 mt-0.5">✕</span>
          <span>{searchError}</span>
          <button onClick={() => setSearchError('')} className="ml-auto shrink-0 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── Filter panel ─────────────────────────────────────── */}
      <div className="card-dark rounded-xl p-3 sm:p-4 mb-4 space-y-3">

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">
              Marketplace{!mktLoading && <span className="ml-1 font-normal text-white/25">({(marketplaces as any[]).length})</span>}
            </label>
            <MarketplaceDropdown marketplaces={marketplaces as any[]} value={mpFilter}
              onChange={v => setMpFilter(v)} loading={mktLoading} />
          </div>

          {categories.length > 0 && (
            <div>
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Category</label>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={SEL}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Sort by</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={SEL}>
              <option value="score">⭐ AI Score</option>
              <option value="profit">💰 Net Profit</option>
              <option value="trend">📈 Trend Strength</option>
              <option value="newest">🕐 Newest First</option>
              <option value="oldest">🕐 Oldest First</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-white/30 self-end pb-1.5">
            {displayed.length} of {allOpps.length} result{allOpps.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest shrink-0">Signal:</span>
          {[['', 'All'], ['launch', '🚀 Launch'], ['hold', '⏸ Hold'], ['reject', '✕ Reject']].map(([v, l]) => (
            <Pill key={v} label={l} active={recFilter === v} onClick={() => setRecFilter(v)} />
          ))}

          <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />

          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest shrink-0">Trend:</span>
          {[['', 'All Sources'], ['search', '🔍 Search'], ['social', '📱 Social'], ['curated', '🎨 Curated'], ['value', '💲 Value']].map(([v, l]) => (
            <Pill key={v} label={l} active={srcFilter === v} onClick={() => setSrcFilter(v)} />
          ))}

          <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />

          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest shrink-0">Strength:</span>
          {[['', 'All'], ['hot', '🔥 Hot'], ['rising', '📈 Rising'], ['stable', '➡️ Stable']].map(([v, l]) => (
            <Pill key={v} label={l} active={strengthFilter === v} onClick={() => setStrengthFilter(v)} />
          ))}

          <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />

          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest shrink-0">Period:</span>
          <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className={SEL}>
            <option value="">All Time</option>
            <option value="2d">Last 2 days</option>
            <option value="7d">This week</option>
            <option value="30d">This month</option>
            <option value="3m">Last 3 months</option>
          </select>

          {hasClientFilters && (
            <button onClick={() => { setCatFilter(''); setSrcFilter(''); setStrengthFilter(''); setPeriodFilter(''); }}
              className="text-xs text-white/35 hover:text-white/70 border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors hover:border-white/20 ml-1">
              Clear ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="card-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Product</th>
                <th className="text-left px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Trend</th>
                <th className="text-left px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Region</th>
                <th className="text-center px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Score</th>
                <th className="text-left px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Signal</th>
                <th className="text-right px-3 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Net Profit</th>
                <th className="px-3 py-3 text-center font-semibold text-white/40 text-xs uppercase tracking-wide">Research</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading
                ? [1, 2, 3].map(i => <SkeletonRow key={i} />)
                : displayed.length === 0
                ? (
                  <tr><td colSpan={7}>
                    <div className="py-14 text-center">
                      <div className="text-4xl mb-3">🎯</div>
                      <p className="font-medium text-white/70 mb-1">
                        {allOpps.length === 0 ? 'No opportunities yet' : 'No results match your filters'}
                      </p>
                      <p className="text-sm text-white/40">
                        {allOpps.length === 0
                          ? 'Click + New Search to discover products'
                          : 'Try adjusting the filters above'}
                      </p>
                    </div>
                  </td></tr>
                )
                : displayed.flatMap((opp: any) => {
                  const mpCode  = opp.marketplace?.code || '';
                  const cc      = countryCode(mpCode);
                  const ts      = trendSource(mpCode);
                  const tStr    = trendStrengthLabel(opp.score?.trend ?? 0);
                  const tenure  = trendTenure(opp.createdAt);
                  const region  = regionName(mpCode);
                  const isOpen  = expandedId === opp.id;

                  const netMinor = opp.profitModel?.trueNetMinor ?? opp.profitModel?.netProfitMinor;
                  const currency = opp.marketplace?.currency || '';

                  const rows: JSX.Element[] = [
                    <tr key={opp.id}
                      className={`hover:bg-violet-500/5 transition-colors cursor-pointer ${isOpen ? 'bg-violet-500/5' : ''}`}
                      onClick={() => setExpandedId(isOpen ? null : opp.id)}>

                      {/* Product */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
                            {opp.product?.imageUrl
                              ? <img src={opp.product.imageUrl} alt={opp.product.title}
                                  className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              : <div className="w-full h-full flex items-center justify-center text-base">🎯</div>}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white line-clamp-1 text-sm">{opp.product?.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {opp.product?.category && (
                                <span className="text-[10px] text-white/35 capitalize leading-snug truncate max-w-[120px]">
                                  {opp.product.category.replace(/_/g, ' ')}
                                </span>
                              )}
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border leading-none"
                                style={{ color: tenure.color, borderColor: tenure.color + '40', backgroundColor: tenure.color + '15' }}>
                                {tenure.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Trend */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-semibold leading-none" style={{ color: ts.color }}>
                            {ts.icon} {ts.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-white/40">{tStr.label}</span>
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden min-w-[40px] max-w-[60px]">
                            <div className="h-full rounded-full" style={{ width: `${opp.score?.trend ?? 0}%`, backgroundColor: tStr.color }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: tStr.color }}>{Math.round(opp.score?.trend ?? 0)}</span>
                        </div>
                      </td>

                      {/* Region */}
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-white/80 leading-snug">
                          {cc ? flag(cc) : '🛒'} {platformOf(mpCode)}
                        </div>
                        <div className="text-[10px] text-white/35 leading-snug mt-0.5">{region}</div>
                      </td>

                      {/* Score */}
                      <td className="px-3 py-3 text-center">
                        <ScoreGauge score={opp.score?.opportunity || 0} size="sm" />
                      </td>

                      {/* Signal */}
                      <td className="px-3 py-3">
                        <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence)} />
                      </td>

                      {/* Net Profit */}
                      <td className="px-3 py-3 text-right font-semibold">
                        {netMinor != null
                          ? <span className={netMinor > 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {netMinor > 0 ? '+' : ''}{currency} {(netMinor / 100).toFixed(0)}
                            </span>
                          : <span className="text-white/25">&mdash;</span>}
                      </td>

                      {/* Research / expand button */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={e => { e.stopPropagation(); setExpandedId(isOpen ? null : opp.id); }}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                              isOpen
                                ? 'bg-violet-500/25 text-violet-300 border border-violet-500/30'
                                : 'bg-white/5 text-white/45 border border-white/10 hover:bg-violet-500/15 hover:text-violet-300 hover:border-violet-500/25'
                            }`}>
                            {isOpen ? 'Close' : '📊 Research'}
                          </button>
                        </div>
                      </td>
                    </tr>,

                  ];
                  if (isOpen) {
                    rows.push(
                      <tr key={`${opp.id}-breakdown`} className="border-t-0">
                        <td colSpan={7} className="p-0">
                          <BreakdownPanel opp={opp} mpCode={mpCode} />
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
