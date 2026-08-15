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


// ── Score bar (research tab) ──────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.round(value);
  const color = v >= 70 ? '#10b981' : v >= 45 ? '#f59e0b' : '#ef4444';
  const glow  = v >= 70 ? 'rgba(16,185,129,0.45)' : v >= 45 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)';
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-[90px] text-white/45 text-right shrink-0 leading-tight">{label}</span>
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full animate-bar-fill"
          style={{ width: `${v}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, boxShadow: `0 0 6px ${glow}` }} />
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
  const sale        = pm?.salePriceMinor ?? 0;
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
      {/* Tab bar — pill style */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
        <div className="tab-pill-bar flex-1">
          {PANEL_TABS.map(t => (
            <button key={t.key}
              onClick={e => { e.stopPropagation(); setTab(t.key); }}
              className={`tab-pill${tab === t.key ? ' active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>
        <Link href={`/opportunities/${opp.id}`} onClick={e => e.stopPropagation()}
          className="shrink-0 text-[10px] text-violet-400/50 hover:text-violet-300 font-semibold px-2.5 py-1.5 rounded-lg transition-all duration-200 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20">
          Full Report →
        </Link>
      </div>

      {/* ── Research tab ── */}
      {tab === 'research' && <ResearchTab opp={opp} />}

      {/* ── Profitability tab ── */}
      {tab === 'profit' && (() => {
        if (!pm) return <div className="p-6 text-center text-white/30 text-xs">No profitability data</div>;
        const src       = Number(pm.productCostMinor   ?? 0);
        const saleP     = Number(pm.salePriceMinor     ?? 0);
        const landed    = Number(pm.landedCostMinor    ?? 0);
        const ship      = Number(pm.intlShippingMinor  ?? 0);
        const pkg       = Number(pm.packagingCostMinor ?? 0);
        const dutyAmt   = Number(pm.dutyMinor          ?? 0);
        const refFee    = Number(pm.referralFeeMinor   ?? 0);
        const refPct    = Number(pm.referralPct        ?? 15);
        const fbaFee    = Number(pm.fbaFeeMinor        ?? 0);
        const adSpend   = Number(pm.adCostMinor        ?? 0);
        const trueNet   = Number(pm.trueNetMinor       ?? pm.netProfitMinor ?? 0);
        const netMargin = Number(pm.netMarginPct       ?? 0);
        const roi       = Number(pm.roiPct             ?? 0);
        const breakeven = Number(pm.breakevenUnits     ?? (trueNet > 0 ? Math.ceil(5000 / trueNet) : 999));
        const monthly50 = Number(pm.monthlyProfitMinor ?? trueNet * 50);
        const annual50  = Number(pm.annualProfitMinor  ?? monthly50 * 12);
        const currency  = pm.currency || 'USD';
        const platform  = mpCode.split('_')[0].charAt(0).toUpperCase() + mpCode.split('_')[0].slice(1) || 'Marketplace';
        const sym       = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
        const f = (v: number, d = 2) => `${sym}${(Math.abs(v) / 100).toFixed(d)}`;
        const allRows = [
          { label: 'Sale Price',      value: saleP,             positive: true,  grad: 'linear-gradient(90deg,#10b981,#34d399)',  glow: 'rgba(16,185,129,0.5)',  isSubtotal: false, isNet: false },
          { label: 'Source Cost',     value: src,               positive: false, grad: 'linear-gradient(270deg,#818cf8,#6366f1)', glow: 'rgba(99,102,241,0.5)',  isSubtotal: false, isNet: false },
          { label: "Int'l Ship.",     value: ship,              positive: false, grad: 'linear-gradient(270deg,#a78bfa,#7c3aed)', glow: 'rgba(124,58,237,0.45)', isSubtotal: false, isNet: false },
          { label: 'Packaging',       value: pkg,               positive: false, grad: 'linear-gradient(270deg,#c4b5fd,#8b5cf6)', glow: 'rgba(139,92,246,0.4)',  isSubtotal: false, isNet: false },
          { label: 'Import Duty',     value: dutyAmt,           positive: false, grad: 'linear-gradient(270deg,#ddd6fe,#a78bfa)', glow: 'rgba(167,139,250,0.35)',isSubtotal: false, isNet: false },
          { label: '= Landed',        value: landed,            positive: false, grad: 'linear-gradient(270deg,#818cf8,#4f46e5)', glow: 'rgba(79,70,229,0.5)',   isSubtotal: true,  isNet: false },
          { label: `Ref. ${refPct}%`, value: refFee,            positive: false, grad: 'linear-gradient(270deg,#f87171,#ef4444)', glow: 'rgba(239,68,68,0.5)',   isSubtotal: false, isNet: false },
          { label: 'FBA / Fulfil.',   value: fbaFee,            positive: false, grad: 'linear-gradient(270deg,#fb923c,#f97316)', glow: 'rgba(249,115,22,0.45)', isSubtotal: false, isNet: false },
          { label: 'Ad Spend 5%',     value: adSpend,           positive: false, grad: 'linear-gradient(270deg,#fbbf24,#eab308)', glow: 'rgba(234,179,8,0.45)',  isSubtotal: false, isNet: false },
          { label: 'Net Profit',      value: Math.abs(trueNet), positive: trueNet >= 0,
            grad: trueNet >= 0 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(270deg,#f87171,#ef4444)',
            glow: trueNet >= 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)',
            isSubtotal: false, isNet: true },
        ].filter(r => r.value > 0);
        const maxDivRef = Math.max(saleP, landed, Math.abs(trueNet), 1);


        return (
          <div className="p-4 space-y-3">

            {/* ── DIVERGING COST BREAKDOWN ── */}
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Header */}
              <div className="flex items-center mb-2">
                <div className="flex-1 text-right pr-2">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-red-400/60">← Costs</span>
                </div>
                <div className="w-[76px] shrink-0 text-center">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-white/40">{platform}</div>
                  <div className="text-[7px] text-white/20 mt-px">Cost Breakdown</div>
                </div>
                <div className="flex-1 pl-2">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400/60">Revenue →</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mb-3">
                {([
                  { c: 'rgba(99,102,241,0.75)',  label: 'Sourcing' },
                  { c: 'rgba(239,68,68,0.75)',   label: 'Fees' },
                  { c: 'rgba(16,185,129,0.75)',  label: 'Revenue / Profit' },
                ] as {c:string;label:string}[]).map(({ c, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: c }} />
                    <span className="text-[8px] text-white/35">{label}</span>
                  </div>
                ))}
              </div>

              {/* Diverging rows */}
              <div className="space-y-[3px]">
                {allRows.map((r) => {
                  const pct = Math.min(92, (r.value / maxDivRef) * 100);
                  const rowH = r.isNet ? 26 : r.isSubtotal ? 22 : 18;
                  const barH = r.isNet ? 'h-3' : r.isSubtotal ? 'h-2.5' : 'h-2';
                  return (
                    <div key={r.label}>
                      {r.isSubtotal && (
                        <div className="h-px my-1" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }} />
                      )}
                      {r.isNet && (
                        <div className="h-px my-1.5" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)' }} />
                      )}
                      <div className="flex items-center" style={{ height: rowH }}>
                        {/* Left half — costs, bar grows rightward from axis */}
                        <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0"
                          style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                          {!r.positive && (
                            <>
                              <span className={`text-[9px] font-mono shrink-0 ${r.isNet ? 'font-bold text-red-400' : r.isSubtotal ? 'font-semibold text-indigo-300' : 'text-white/55'}`}>
                                -{f(r.value)}
                              </span>
                              <div className={`${barH} rounded-l-full flex-shrink-0`}
                                style={{ width: `${pct}%`, background: r.grad, boxShadow: `0 0 5px ${r.glow}` }} />
                            </>
                          )}
                        </div>

                        {/* Center — label at zero axis */}
                        <div className="w-[76px] shrink-0 flex items-center justify-center px-1">
                          <span className={`text-center leading-tight ${r.isNet ? 'text-[10px] font-bold text-white/90' : r.isSubtotal ? 'text-[9px] font-semibold text-indigo-400' : 'text-[9px] text-white/45'}`}>
                            {r.label}
                          </span>
                        </div>

                        {/* Right half — revenue/profit, bar grows leftward from axis */}
                        <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0"
                          style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                          {r.positive && (
                            <>
                              <div className={`${barH} rounded-r-full flex-shrink-0`}
                                style={{ width: `${pct}%`, background: r.grad, boxShadow: `0 0 5px ${r.glow}` }} />
                              <span className={`text-[9px] font-mono shrink-0 ${r.isNet ? 'font-bold text-emerald-400' : 'text-white/55'}`}>
                                +{f(r.value)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── UNIFIED METRICS ── */}
            <div className="grid grid-cols-6 gap-2">

              {/* Hero: Net Profit / Unit */}
              <div className="col-span-2 rounded-xl p-3 flex flex-col justify-between"
                style={{
                  background: trueNet >= 0
                    ? 'linear-gradient(135deg,rgba(16,185,129,0.1) 0%,rgba(16,185,129,0.03) 100%)'
                    : 'linear-gradient(135deg,rgba(239,68,68,0.1) 0%,rgba(239,68,68,0.03) 100%)',
                  border: `1px solid ${trueNet >= 0 ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.22)'}`,
                }}>
                <div className="text-[9px] font-semibold text-white/35 uppercase tracking-widest">Net Profit / Unit</div>
                <div className={`text-3xl font-black tabular-nums leading-none my-1.5 ${trueNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  style={{ textShadow: trueNet >= 0 ? '0 0 20px rgba(16,185,129,0.3)' : '0 0 20px rgba(239,68,68,0.3)' }}>
                  {trueNet < 0 ? '-' : '+'}{f(Math.abs(trueNet))}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${trueNet >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    Margin {netMargin.toFixed(1)}%
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${roi >= 20 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    ROI {roi.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Total Cost / Unit */}
              <div className="rounded-xl p-3 text-center flex flex-col justify-between"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[9px] text-white/30 uppercase tracking-widest font-medium">Total Cost / Unit</div>
                <div className="text-xl font-bold text-red-400 tabular-nums my-1">
                  {f(src + ship + pkg + dutyAmt + refFee + fbaFee + adSpend)}
                </div>
                <div className="text-[9px] text-white/20">all-in landed</div>
              </div>

              {/* Break-even */}
              <div className="rounded-xl p-3 text-center flex flex-col justify-between"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[9px] text-white/30 uppercase tracking-widest font-medium">Break-even</div>
                <div className={`text-xl font-bold tabular-nums my-1 ${breakeven < 200 ? 'text-emerald-400' : breakeven < 500 ? 'text-amber-400' : 'text-red-400'}`}>
                  {Math.min(breakeven, 999)}
                </div>
                <div className="text-[9px] text-white/20">units to profit</div>
              </div>

              {/* Monthly · 50u */}
              <div className="rounded-xl p-3 text-center flex flex-col justify-between"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[9px] text-white/30 uppercase tracking-widest font-medium">Monthly</div>
                <div className={`text-xl font-bold tabular-nums my-1 ${monthly50 >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {monthly50 < 0 ? '-' : ''}{sym}{(Math.abs(monthly50) / 100).toFixed(0)}
                </div>
                <div className="text-[9px] text-white/20">est. · 50 units</div>
              </div>

              {/* Annual · 50u */}
              <div className="rounded-xl p-3 text-center flex flex-col justify-between"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[9px] text-white/30 uppercase tracking-widest font-medium">Annual</div>
                <div className={`text-xl font-bold tabular-nums my-1 ${annual50 >= 0 ? 'text-violet-300' : 'text-red-400'}`}
                  style={{ textShadow: annual50 >= 0 ? '0 0 14px rgba(167,139,250,0.3)' : undefined }}>
                  {annual50 < 0 ? '-' : ''}{sym}{(Math.abs(annual50) / 100).toFixed(0)}
                </div>
                <div className="text-[9px] text-white/20">est. · 50 units</div>
              </div>

            </div>

          </div>
        );
      })()}

      {/* ── Suppliers tab ── */}
      {tab === 'suppliers' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Global Suppliers <span className="text-emerald-400/70">· India First</span></h4>
            <span className="text-[10px] text-white/25">IndiaMART · Alibaba · DHgate · more</span>
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
                          {s.country === 'India' ? '🇮🇳' : s.country === 'China' ? '🇨🇳' : s.country === 'Hong Kong' ? '🇭🇰' : '🌐'} {(s.source || '').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
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

// ── Filter select style ───────────────────────────────────────────────────────

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

      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="card-dark rounded-xl border border-white/8 p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">

          {/* Marketplace */}
          <MarketplaceDropdown marketplaces={marketplaces as any[]} value={mpFilter}
            onChange={v => setMpFilter(v)} loading={mktLoading} />

          {/* Category */}
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={SEL}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Signal */}
          <select value={recFilter} onChange={e => setRecFilter(e.target.value)} className={SEL}>
            <option value="">All Signals</option>
            <option value="launch">🚀 Launch</option>
            <option value="hold">⏸ Hold</option>
            <option value="reject">✕ Reject</option>
          </select>

          {/* Trend source */}
          <select value={srcFilter} onChange={e => setSrcFilter(e.target.value)} className={SEL}>
            <option value="">All Trends</option>
            <option value="search">🔍 Search</option>
            <option value="social">📱 Social</option>
            <option value="curated">🎨 Curated</option>
            <option value="value">💲 Value</option>
          </select>

          {/* Trend strength */}
          <select value={strengthFilter} onChange={e => setStrengthFilter(e.target.value)} className={SEL}>
            <option value="">All Channels</option>
            <option value="hot">🔥 Hot</option>
            <option value="rising">📈 Rising</option>
            <option value="stable">➡️ Stable</option>
          </select>

          {/* Period */}
          <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className={SEL}>
            <option value="">All Time</option>
            <option value="2d">Last 2 days</option>
            <option value="7d">This week</option>
            <option value="30d">This month</option>
            <option value="3m">Last 3 months</option>
          </select>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={SEL}>
            <option value="score">⭐ Best Score</option>
            <option value="profit">💰 Most Profit</option>
            <option value="trend">📈 Trending</option>
            <option value="newest">🕐 Newest</option>
            <option value="oldest">🕐 Oldest</option>
          </select>

          {/* Clear + count */}
          <div className="ml-auto flex items-center gap-2.5">
            {hasClientFilters && (
              <button onClick={() => { setCatFilter(''); setSrcFilter(''); setStrengthFilter(''); setPeriodFilter(''); }}
                className="text-xs text-white/35 hover:text-white/70 border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors hover:border-white/20">
                Clear ✕
              </button>
            )}
            <span className="text-xs text-white/30 whitespace-nowrap">
              {displayed.length} of {allOpps.length} result{allOpps.length !== 1 ? 's' : ''}
            </span>
          </div>

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
                      style={isOpen ? { background: 'linear-gradient(90deg,rgba(124,58,237,0.07) 0%,rgba(124,58,237,0.03) 100%)', boxShadow: 'inset 3px 0 0 rgba(124,58,237,0.5)' } : undefined}
                      className="transition-all duration-200 cursor-pointer hover:bg-violet-500/[0.06]"
                      onClick={() => setExpandedId(isOpen ? null : opp.id)}>

                      {/* Product */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0 relative">
                            {opp.product?.imageUrl
                              ? <img src={opp.product.imageUrl} alt={opp.product.title}
                                  loading="lazy" decoding="async" width="40" height="40"
                                  className="w-full h-full object-cover"
                                  onLoad={e => { (e.target as HTMLImageElement).style.opacity = '1'; }}
                                  style={{ opacity: 0, transition: 'opacity 0.25s ease' }}
                                  onError={e => { (e.target as HTMLImageElement).parentElement!.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px">🎯</div>'; }} />
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
                            style={isOpen ? {
                              background: 'linear-gradient(135deg,rgba(124,58,237,0.3) 0%,rgba(99,102,241,0.2) 100%)',
                              borderColor: 'rgba(124,58,237,0.45)',
                              color: '#c4b5fd',
                              boxShadow: '0 2px 10px rgba(124,58,237,0.22)',
                            } : undefined}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap border select-none transition-all duration-200 ${
                              isOpen
                                ? 'border-violet-500/45'
                                : 'bg-white/5 text-white/50 border-white/10 hover:bg-violet-500/12 hover:text-violet-300 hover:border-violet-500/25 hover:shadow-[0_2px_8px_rgba(124,58,237,0.18)]'
                            }`}>
                            {isOpen ? '✕ Close' : '📊 Research'}
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
