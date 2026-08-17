'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api, isPro } from '@/lib/api';
import { ScoreGauge, RecommendationBadge } from '@/components/ui/ScoreGauge';
import { getWishlist, addToWishlist, removeFromWishlist } from '@/lib/wishlist';

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
              <div className="text-[10px] text-white/55 bg-white/3 rounded-lg p-2.5 leading-relaxed border border-white/8">
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

function BreakdownPanel({ opp, mpCode, isFree }: { opp: any; mpCode: string; isFree: boolean }) {
  const [tab, setTab] = useState<'research' | 'suppliers' | 'profit'>('research');
  const [extraSuppliers, setExtraSuppliers] = useState<any[]>([]);
  const [fetchingMore,   setFetchingMore]   = useState(false);
  const [moreError,      setMoreError]      = useState('');
  const [showFreeGate,   setShowFreeGate]   = useState(false);
  const pm          = opp.profitModel;
  const sale        = pm?.salePriceMinor ?? 0;
  const suppliers: any[] = opp.suppliers ?? [];
  const confidence  = Math.round(opp.confidence ?? 0);
  const confColor   = confidence >= 80 ? '#10b981' : confidence >= 65 ? '#f59e0b' : '#6b7280';
  const allSuppliers    = [...suppliers, ...extraSuppliers];
  const cappedSuppliers = isFree ? allSuppliers.slice(0, 10) : allSuppliers;

  async function searchMoreSuppliers() {
    setFetchingMore(true); setMoreError('');
    try {
      const more = await api.opportunities.getSuppliers(opp.id) as any[];
      const seen = new Set(allSuppliers.map((s: any) => s.name));
      setExtraSuppliers(prev => [...prev, ...more.filter((s: any) => !seen.has(s.name))]);
    } catch (e: any) {
      setMoreError(e?.message || 'Failed to search for more suppliers');
    } finally { setFetchingMore(false); }
  }

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
          className="shrink-0 relative inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-violet-600 hover:bg-violet-500 shadow-[0_0_10px_rgba(124,58,237,0.5)] hover:shadow-[0_0_18px_rgba(124,58,237,0.8)] transition-all duration-200 border border-violet-400/30">
          Full Report
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>

      {/* ── Research tab ── */}
      {tab === 'research' && <ResearchTab opp={opp} />}

      {/* ── Profitability tab ── */}
      {tab === 'profit' && (() => {
        if (!pm) return <div className="p-6 text-center text-white/50 text-xs">No profitability data</div>;
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
                  <div className="text-[7px] text-white/50 mt-px">Cost Breakdown</div>
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
                    <span className="text-[8px] text-white/55">{label}</span>
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
                <div className="text-[9px] font-semibold text-white/55 uppercase tracking-widest">Net Profit / Unit</div>
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
                <div className="text-[9px] text-white/50 uppercase tracking-widest font-medium">Total Cost / Unit</div>
                <div className="text-xl font-bold text-red-400 tabular-nums my-1">
                  {f(src + ship + pkg + dutyAmt + refFee + fbaFee + adSpend)}
                </div>
                <div className="text-[9px] text-white/50">all-in landed</div>
              </div>

              {/* Break-even */}
              <div className="rounded-xl p-3 text-center flex flex-col justify-between"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[9px] text-white/50 uppercase tracking-widest font-medium">Break-even</div>
                <div className={`text-xl font-bold tabular-nums my-1 ${breakeven < 200 ? 'text-emerald-400' : breakeven < 500 ? 'text-amber-400' : 'text-red-400'}`}>
                  {Math.min(breakeven, 999)}
                </div>
                <div className="text-[9px] text-white/50">units to profit</div>
              </div>

              {/* Monthly · 50u */}
              <div className="rounded-xl p-3 text-center flex flex-col justify-between"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[9px] text-white/50 uppercase tracking-widest font-medium">Monthly</div>
                <div className={`text-xl font-bold tabular-nums my-1 ${monthly50 >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {monthly50 < 0 ? '-' : ''}{sym}{(Math.abs(monthly50) / 100).toFixed(0)}
                </div>
                <div className="text-[9px] text-white/50">est. · 50 units</div>
              </div>

              {/* Annual · 50u */}
              <div className="rounded-xl p-3 text-center flex flex-col justify-between"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[9px] text-white/50 uppercase tracking-widest font-medium">Annual</div>
                <div className={`text-xl font-bold tabular-nums my-1 ${annual50 >= 0 ? 'text-violet-300' : 'text-red-400'}`}
                  style={{ textShadow: annual50 >= 0 ? '0 0 14px rgba(167,139,250,0.3)' : undefined }}>
                  {annual50 < 0 ? '-' : ''}{sym}{(Math.abs(annual50) / 100).toFixed(0)}
                </div>
                <div className="text-[9px] text-white/50">est. · 50 units</div>
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
            <span className="text-[10px] text-white/50">IndiaMART · TradeIndia · GEM · ExportHub · Udaan · Alibaba · more</span>
          </div>
          {cappedSuppliers.length === 0 ? (
            <div className="text-xs text-white/50 py-6 text-center">
              No supplier data yet — run a new search to populate sourcing candidates
            </div>
          ) : (
            <div className="space-y-2">
              {cappedSuppliers.map((s: any, i: number) => (
                <div key={i} className={`rounded-lg border p-3 ${i === 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/8 bg-white/[0.02]'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{s.name}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-white/55 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/8">
                          {s.country === 'India' ? '🇮🇳' : s.country === 'China' ? '🇨🇳' : s.country === 'Hong Kong' ? '🇭🇰' : '🌐'} {({'indiamart':'IndiaMART','tradeindia':'TradeIndia','gem':'GEM Portal','exporthub':'ExportHub','udaan':'Udaan','alibaba':'Alibaba','dhgate':'DHgate','globalsources':'GlobalSources','made-in-china':'Made-in-China','ec21':'EC21'} as Record<string,string>)[s.source] || (s.source||'').replace(/-/g,' ').replace(/\b\w/g,(ch:string)=>ch.toUpperCase())}
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
                      <div className="text-[10px] text-white/55">per unit</div>
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
                      <div className="text-[10px] text-white/50 mt-0.5">
                        {pct((1 - s.costMinor / sale) * 100)} gross margin room
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* ── Search More Suppliers footer ── */}
          <div className="mt-4 pt-3 border-t border-white/8 space-y-3">
            {isFree && allSuppliers.length > 10 && (
              <p className="text-[10px] text-violet-400/60 text-center">
                Showing 10 of {allSuppliers.length} suppliers · {allSuppliers.length - 10} locked
              </p>
            )}
            {isFree ? (
              showFreeGate ? (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-center">
                  <div className="text-2xl mb-2">🔒</div>
                  <p className="text-xs font-semibold text-white mb-1">Pro unlocks full supplier search</p>
                  <p className="text-[11px] text-white/40 mb-3 leading-snug">
                    Free shows up to 10 suppliers · Pro searches IndiaMART, Alibaba &amp; 8 more sources in real-time
                  </p>
                  <Link href="/register?plan=pro" onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-violet-600 hover:bg-violet-500 shadow-[0_0_10px_rgba(124,58,237,0.4)] transition-all">
                    Upgrade to Pro →
                  </Link>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); setShowFreeGate(true); }}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl border border-white/10 text-white/40 hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/8 transition-all">
                  🔍 Search More Suppliers
                </button>
              )
            ) : (
              <div className="space-y-2">
                {moreError && <p className="text-[10px] text-red-400 text-center">{moreError}</p>}
                <button onClick={e => { e.stopPropagation(); searchMoreSuppliers(); }} disabled={fetchingMore}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl border border-white/10 text-white/50 hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/8 transition-all disabled:opacity-40">
                  {fetchingMore
                    ? <><span className="animate-spin inline-block text-sm">⟳</span> Searching suppliers…</>
                    : <>🔍 Search More Suppliers</>}
                </button>
                {extraSuppliers.length > 0 && (
                  <p className="text-[10px] text-emerald-400/60 text-center">
                    +{extraSuppliers.length} additional supplier{extraSuppliers.length === 1 ? '' : 's'} found
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-[10px] text-white/50">
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
          {search && <button onClick={() => setSearch('')} className="text-white/50 hover:text-white/70 text-xs">✕</button>}
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto scrollbar-dark py-1">
        {Object.keys(filtered).length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-white/50">No marketplaces match &ldquo;{search}&rdquo;</div>
        ) : Object.entries(filtered).map(([platform, mps]) => (
          <div key={platform}>
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/50 uppercase tracking-widest sticky top-0 bg-[#0d1526]">{platform}</div>
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

// ── Scan progress panel ───────────────────────────────────────────────────────

const SCAN_STAGES = [
  { icon: '🔍', label: 'Discovering products',  detail: 'Scanning marketplace listings & search trends',  ms: 2000 },
  { icon: '📈', label: 'Demand signals',         detail: 'Processing search volume & buyer intent',        ms: 2500 },
  { icon: '⚔️', label: 'Competition map',       detail: 'Counting sellers, reviews & market share',       ms: 2000 },
  { icon: '🏭', label: 'India suppliers',        detail: 'IndiaMART · TradeIndia · GEM · Alibaba',         ms: 3000 },
  { icon: '💰', label: 'Profit model',           detail: 'Landed cost + marketplace fees + ad spend',      ms: 2500 },
  { icon: '🤖', label: 'AI scoring',             detail: 'Running 7-dimension opportunity score (0→100)',  ms: 2000 },
  { icon: '✨', label: 'AI verdicts',            detail: 'Launch / Hold / Reject with confidence %',       ms: 2000 },
];

function ScanProgress({ searching }: { searching: boolean }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!searching) { setActiveStep(0); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cum = 0;
    for (let i = 1; i < SCAN_STAGES.length - 1; i++) {
      cum += SCAN_STAGES[i - 1].ms;
      const idx = i;
      timers.push(setTimeout(() => setActiveStep(idx), cum));
    }
    return () => timers.forEach(clearTimeout);
  }, [searching]);

  if (!searching) return null;

  const pct = Math.min(88, Math.round((activeStep / (SCAN_STAGES.length - 1)) * 100));
  const stage = SCAN_STAGES[activeStep];

  return (
    <div className="mb-5 rounded-xl border border-violet-500/25 overflow-hidden"
      style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.08) 0%,rgba(15,23,42,0.85) 100%)' }}>
      {/* Progress bar */}
      <div className="h-[3px] bg-white/5">
        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-[900ms] ease-out"
          style={{ width: `${pct}%` }} />
      </div>

      <div className="p-4 sm:p-5">
        {/* Current step */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0 text-base">
            <span className="animate-pulse">{stage?.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white leading-snug">{stage?.label}…</div>
            <div className="text-[11px] text-white/40 mt-0.5 leading-snug">{stage?.detail}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-white/50 tabular-nums">{pct}%</span>
            <span className="text-sm text-violet-400 animate-spin inline-block">⟳</span>
          </div>
        </div>

        {/* Step pills */}
        <div className="flex flex-wrap gap-1.5">
          {SCAN_STAGES.map((s, i) => {
            const done   = i < activeStep;
            const active = i === activeStep;
            return (
              <div key={i}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all duration-500 ${
                  done   ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400/80' :
                  active ? 'bg-violet-500/15 border-violet-500/35 text-violet-300' :
                           'bg-white/5 border-white/8 text-white/20'
                }`}>
                <span>{done ? '✓' : s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
  const [nameFilter,     setNameFilter]     = useState('');
  const [catFilter,      setCatFilter]      = useState('');
  const [srcFilter,      setSrcFilter]      = useState('');
  const [strengthFilter, setStrengthFilter] = useState('');
  const [periodFilter,   setPeriodFilter]   = useState('');
  const [sortBy,         setSortBy]         = useState('score');

  // Expand state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Wishlist state (localStorage-backed)
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  useEffect(() => { setWishlist(new Set(getWishlist())); }, []);
  function toggleWishlist(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (wishlist.has(id)) { removeFromWishlist(id); setWishlist(prev => { const s = new Set(prev); s.delete(id); return s; }); }
    else { addToWishlist(id); setWishlist(prev => new Set([...prev, id])); }
  }

  const [searching,    setSearching]    = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [searchError,  setSearchError]  = useState('');
  const [scanStep,     setScanStep]     = useState(0);

  useEffect(() => {
    if (!searching) { setScanStep(0); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cum = 0;
    for (let i = 1; i < SCAN_STAGES.length - 1; i++) {
      cum += SCAN_STAGES[i - 1].ms;
      const idx = i;
      timers.push(setTimeout(() => setScanStep(idx), cum));
    }
    return () => timers.forEach(clearTimeout);
  }, [searching]);
  const scanPct = Math.min(88, Math.round((scanStep / (SCAN_STAGES.length - 1)) * 100));
  const [isFree, setIsFree] = useState(false);
  const [dismissedOnboarding, setDismissedOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('bs_onboarding_dismissed') === '1';
  });
  useEffect(() => { setIsFree(!isPro()); }, []);

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
    const q = nameFilter.trim().toLowerCase();
    let rows = allOpps.filter(opp => {
      if (q) {
        const title = (opp.product?.title       ?? '').toLowerCase();
        const desc  = (opp.product?.description ?? '').toLowerCase();
        const cat   = (opp.product?.category    ?? '').toLowerCase();
        const keys  = (opp.product?.keywords    ?? []).join(' ').toLowerCase();
        if (!title.includes(q) && !desc.includes(q) && !cat.includes(q) && !keys.includes(q)) return false;
      }
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
  }, [allOpps, nameFilter, catFilter, srcFilter, strengthFilter, periodFilter, sortBy]);

  const hasClientFilters = !!(nameFilter || catFilter || srcFilter || strengthFilter || periodFilter);

  // Quick stats for hero
  const hotCount        = allOpps.filter(o => trendStrengthLabel(o.score?.trend ?? 0).key === 'hot').length;
  const risingCount     = allOpps.filter(o => trendStrengthLabel(o.score?.trend ?? 0).key === 'rising').length;
  const launchCount     = allOpps.filter(o => (o.recommendation || '').toLowerCase() === 'launch').length;
  const profitableCount = allOpps.filter(o => (o.profitModel?.trueNetMinor ?? o.profitModel?.netProfitMinor ?? 0) > 0).length;
  const newThisWeek     = allOpps.filter(o => Date.now() - Number(o.createdAt || 0) < 7 * DAY).length;

  const runSearch = useMutation({
    mutationFn: () => {
      setSearchError(''); setSearching(true); setSearchStatus('');
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

      {/* ── Scout hero ──────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {/* Live pill */}
            {!isLoading && allOpps.length > 0 && (
              <div className="flex items-center gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-2.5 py-1 rounded-full tracking-wide uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  {allOpps.length} live
                </span>
              </div>
            )}
            {/* Headline */}
            <h1 className="text-[28px] sm:text-[36px] font-black text-white tracking-tight leading-none mb-2">
              Scout
            </h1>
            <p className="text-sm text-white/65 leading-snug max-w-lg">
              AI-ranked products sourced from India — ready to sell on Amazon, Etsy &amp; 70+ global marketplaces
            </p>
          </div>

          {/* Action */}
          <button
            onClick={() => runSearch.mutate()}
            disabled={searching}
            className={`relative overflow-hidden text-sm font-semibold shrink-0
              inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl
              min-w-[200px] min-h-[44px] select-none transition-all duration-300
              ${searching
                ? 'cursor-not-allowed animate-pulse-glow'
                : 'btn-primary'}`}
            style={searching ? {
              background: 'linear-gradient(135deg, rgba(109,40,217,0.95) 0%, rgba(79,70,229,0.95) 100%)',
              boxShadow: '0 0 24px rgba(124,58,237,0.6), 0 4px 16px rgba(124,58,237,0.3)',
            } : {}}
          >
            {searching && (
              <>
                <span
                  className="absolute inset-0 bg-white/10 transition-all duration-[900ms] ease-out pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - scanPct}% 0 0)` }}
                />
                <span
                  className="absolute inset-0 pointer-events-none animate-shimmer"
                  style={{
                    background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
                    backgroundSize: '200% 100%',
                  }}
                />
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 pointer-events-none overflow-hidden">
                  <span
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-300 to-indigo-300 transition-all duration-[900ms] ease-out"
                    style={{ width: `${scanPct}%` }}
                  />
                </span>
              </>
            )}
            <span className="relative z-10 flex items-center gap-2">
              {searching ? (
                <>
                  <span className="text-lg animate-pulse leading-none">{SCAN_STAGES[scanStep]?.icon}</span>
                  <span className="truncate">{SCAN_STAGES[scanStep]?.label}…</span>
                  <span className="text-[11px] text-violet-200/70 font-mono tabular-nums ml-1">{scanPct}%</span>
                </>
              ) : searchStatus ? (
                <>{searchStatus}</>
              ) : (
                <><span className="text-base">＋</span> New Scan</>
              )}
            </span>
          </button>
        </div>

        {/* Quick-stat chips — clickable filters */}
        {!isLoading && allOpps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[
              { icon: '🔥', label: 'Hot', count: hotCount,        color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',  action: () => setStrengthFilter(strengthFilter === 'hot' ? '' : 'hot') },
              { icon: '📈', label: 'Rising', count: risingCount,  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', action: () => setStrengthFilter(strengthFilter === 'rising' ? '' : 'rising') },
              { icon: '🚀', label: 'Launch-ready', count: launchCount, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', action: () => setRecFilter(recFilter === 'launch' ? '' : 'launch') },
              { icon: '💰', label: 'Profitable', count: profitableCount, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', action: null },
              { icon: '🆕', label: 'This week', count: newThisWeek, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.25)', action: () => setPeriodFilter(periodFilter === '7d' ? '' : '7d') },
            ].filter(s => s.count > 0).map(s => (
              <button key={s.label}
                onClick={s.action ?? undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${s.action ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'}`}
                style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                <span>{s.icon}</span>
                <span className="font-black tabular-nums">{s.count}</span>
                <span className="text-white/50">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Thin scan progress bar (first scan only) ── */}
      {allOpps.length === 0 && searching && (
        <div className="h-[3px] rounded-full bg-white/5 mb-5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-[900ms] ease-out"
            style={{ width: `${Math.min(88, Math.round((scanStep / (SCAN_STAGES.length - 1)) * 100))}%` }} />
        </div>
      )}

      {/* Onboarding checklist — shown only on first use */}
      {allOpps.length === 0 && !searching && !dismissedOnboarding && (
        <div className="card-dark p-5 sm:p-6 border border-violet-500/15 mb-4 relative">
          <button
            onClick={() => { setDismissedOnboarding(true); localStorage.setItem('bs_onboarding_dismissed', '1'); }}
            className="absolute top-3 right-3 text-white/50 hover:text-white/70 transition-colors text-sm">
            ✕
          </button>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🚀</span>
            <h2 className="font-bold text-white text-sm">Get started — 3 steps to your first opportunity</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                step: '1', done: false, icon: '🛒',
                title: 'Pick a marketplace',
                body: 'Select Amazon US (best for beginners) or any of the 13 supported marketplaces from the dropdown above.',
              },
              {
                step: '2', done: false, icon: '🔭',
                title: 'Run your first scan',
                body: 'Click "＋ New Scan". The AI runs a 7-stage pipeline: Discover → Demand → Competition → Suppliers → Profit → Score → Verdict.',
              },
              {
                step: '3', done: false, icon: '🎯',
                title: 'Open an opportunity',
                body: 'Click any result to see the full 12-tab breakdown: scores, suppliers, profit model, listing, ads, and your Launch / Hold / Reject recommendation.',
              },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 text-xs font-bold shrink-0">{s.step}</div>
                <div>
                  <div className="text-xs font-semibold text-white mb-1">{s.icon} {s.title}</div>
                  <p className="text-[11px] text-white/40 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <a href="/guide" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Read the full User Guide →</a>
            <span className="text-white/15 text-xs">·</span>
            <button onClick={() => { setDismissedOnboarding(true); localStorage.setItem('bs_onboarding_dismissed', '1'); }}
              className="text-xs text-white/50 hover:text-white/65 transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {searchError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
          <span className="shrink-0 mt-0.5">✕</span>
          <span>{searchError}</span>
          <button onClick={() => setSearchError('')} className="ml-auto shrink-0 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Free account Pro upsell strip */}
      {isFree && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-violet-500/20 bg-violet-500/8">
          <span className="text-violet-400 text-base shrink-0">✦</span>
          <p className="flex-1 text-xs text-violet-200/65 leading-snug">
            <strong className="text-violet-200/90">Free account:</strong> browse AI-scored opportunities.{' '}
            <strong className="text-violet-200/90">Pro</strong> unlocks unlimited AI scans, supplier sourcing, full profit models &amp; AI listing generator.
          </p>
          <Link href="/register?plan=pro"
            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-violet-600 hover:bg-violet-500 shadow-[0_0_8px_rgba(124,58,237,0.4)] transition-all whitespace-nowrap">
            Upgrade to Pro →
          </Link>
        </div>
      )}

      {/* ── Filter bar — sticky, visually attached to top nav ── */}
      <div className="sticky top-14 z-20 -mx-3 sm:-mx-4 md:-mx-5 lg:-mx-6 xl:-mx-8 mb-4">
        <div className="filter-bar-inner px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 py-2.5 overflow-x-auto scroll-tabs">
          <div className="flex items-center gap-2 min-w-max sm:min-w-0 sm:flex-wrap">

            {/* Marketplace */}
            <MarketplaceDropdown marketplaces={marketplaces as any[]} value={mpFilter}
              onChange={v => setMpFilter(v)} loading={mktLoading} />

            {/* Product name / keyword search */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 text-xs pointer-events-none">🔍</span>
              <input
                type="text"
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
                placeholder="Search products…"
                className="pl-7 pr-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/80 placeholder-white/25 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 w-40 transition-colors"
              />
              {nameFilter && (
                <button onClick={() => setNameFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 text-xs">✕</button>
              )}
            </div>

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
            <div className="ml-auto flex items-center gap-2.5 pl-2">
              {hasClientFilters && (
                <button onClick={() => { setNameFilter(''); setCatFilter(''); setSrcFilter(''); setStrengthFilter(''); setPeriodFilter(''); setRecFilter(''); }}
                  className="text-xs text-white/55 hover:text-white/80 border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors hover:border-white/20 whitespace-nowrap">
                  Clear ✕
                </button>
              )}
              <span className="text-xs text-white/50 whitespace-nowrap tabular-nums">
                {displayed.length}<span className="text-white/40"> / {allOpps.length}</span>
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="card-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="dark:bg-white/5 bg-slate-50/80 border-b dark:border-white/10 border-slate-200">
              <tr>
                <th className="text-left px-3 py-3 font-semibold dark:text-white/40 text-slate-400 text-xs uppercase tracking-wide">Product</th>
                <th className="text-left px-3 py-3 font-semibold dark:text-white/40 text-slate-400 text-xs uppercase tracking-wide">Trend</th>
                <th className="text-left px-3 py-3 font-semibold dark:text-white/40 text-slate-400 text-xs uppercase tracking-wide">Region</th>
                <th className="text-center px-3 py-3 font-semibold dark:text-white/40 text-slate-400 text-xs uppercase tracking-wide">Score</th>
                <th className="text-left px-3 py-3 font-semibold dark:text-white/40 text-slate-400 text-xs uppercase tracking-wide">Signal</th>
                <th className="text-right px-3 py-3 font-semibold dark:text-white/40 text-slate-400 text-xs uppercase tracking-wide">Net Profit</th>
                <th className="px-3 py-3 text-center font-semibold dark:text-white/40 text-slate-400 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5 divide-slate-100">
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
                : [
                    ...(isFree ? displayed.slice(0, 10) : displayed).flatMap((opp: any) => {
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
                          <div className="w-10 h-10 rounded-lg overflow-hidden dark:bg-white/10 bg-slate-200 shrink-0 relative">
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
                            <div className="font-medium dark:text-white text-slate-900 line-clamp-1 text-sm">{opp.product?.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {opp.product?.category && (
                                <span className="text-[10px] text-white/55 capitalize leading-snug truncate max-w-[120px]">
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
                          <div className="flex-1 h-1 dark:bg-white/10 bg-slate-200 rounded-full overflow-hidden min-w-[40px] max-w-[60px]">
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
                        <div className="text-[10px] text-white/55 leading-snug mt-0.5">{region}</div>
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
                          : <span className="text-white/50">&mdash;</span>}
                      </td>

                      {/* Actions: Full Report (primary) + Research inline + wishlist */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* PRIMARY: Full Report — always visible, glowing violet */}
                          <Link href={`/opportunities/${opp.id}`}
                            onClick={e => e.stopPropagation()}
                            title="Open full analysis report"
                            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-white bg-violet-600 hover:bg-violet-500 border border-violet-400/25 shadow-[0_0_10px_rgba(124,58,237,0.45)] hover:shadow-[0_0_18px_rgba(124,58,237,0.75)] transition-all duration-200 whitespace-nowrap select-none">
                            Full Report
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 opacity-80">
                              <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
                            </svg>
                          </Link>
                          {/* SECONDARY: Research inline expand */}
                          <button
                            onClick={e => { e.stopPropagation(); setExpandedId(isOpen ? null : opp.id); }}
                            title={isOpen ? 'Close inline panel' : 'Quick research preview'}
                            style={isOpen ? {
                              background: 'linear-gradient(135deg,rgba(124,58,237,0.3) 0%,rgba(99,102,241,0.2) 100%)',
                              borderColor: 'rgba(124,58,237,0.45)',
                              color: '#c4b5fd',
                              boxShadow: '0 2px 10px rgba(124,58,237,0.22)',
                            } : undefined}
                            className={`text-xs px-2 py-1.5 rounded-lg font-semibold whitespace-nowrap border select-none transition-all duration-200 ${
                              isOpen
                                ? 'border-violet-500/45'
                                : 'bg-white/5 text-white/40 border-white/10 hover:bg-violet-500/12 hover:text-violet-300 hover:border-violet-500/25 hover:shadow-[0_2px_8px_rgba(124,58,237,0.18)]'
                            }`}>
                            {isOpen ? '✕' : '📊'}
                          </button>
                          {/* Bookmark / save to wishlist */}
                          <button
                            onClick={e => toggleWishlist(e, opp.id)}
                            title={wishlist.has(opp.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                            className={`p-1.5 rounded-lg border transition-all duration-200 ${
                              wishlist.has(opp.id)
                                ? 'bg-amber-500/15 border-amber-500/35 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                                : 'bg-white/5 border-white/10 text-white/50 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/25'
                            }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M2 2.75A2.75 2.75 0 0 1 4.75 0h6.5A2.75 2.75 0 0 1 14 2.75v12.5a.75.75 0 0 1-1.175.619L8 13.075l-4.825 2.694A.75.75 0 0 1 2 15.25V2.75Z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>,

                  ];
                  if (isOpen) {
                    rows.push(
                      <tr key={`${opp.id}-breakdown`} className="border-t-0">
                        <td colSpan={7} className="p-0">
                          <BreakdownPanel opp={opp} mpCode={mpCode} isFree={isFree} />
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                }),
                ...(isFree && displayed.length > 10 ? [
                  <tr key="free-gate">
                    <td colSpan={7} className="p-0">
                      <div className="py-12 text-center border-t border-white/5"
                        style={{ background: 'linear-gradient(to top,rgba(2,8,23,0.98) 0%,rgba(2,8,23,0.55) 100%)' }}>
                        <div className="text-4xl mb-3">🔒</div>
                        <p className="text-sm font-semibold text-white mb-1">
                          {displayed.length - 10} more opportunit{displayed.length - 10 === 1 ? 'y' : 'ies'} on this marketplace
                        </p>
                        <p className="text-xs text-white/40 mb-5 leading-snug max-w-xs mx-auto">
                          Free account shows 10 results per marketplace · Upgrade to Pro for unlimited AI scans &amp; full results
                        </p>
                        <Link href="/register?plan=pro"
                          className="inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-xl text-white bg-violet-600 hover:bg-violet-500 shadow-[0_0_14px_rgba(124,58,237,0.5)] hover:shadow-[0_0_24px_rgba(124,58,237,0.8)] transition-all">
                          Unlock All Results — Upgrade to Pro →
                        </Link>
                      </div>
                    </td>
                  </tr>,
                ] : []),
              ]
            }
          </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom bar: result count + Scan for More ── */}
      {!isLoading && allOpps.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/8 px-4 py-3 space-y-3"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Count + mini stats */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
            <span>
              Showing{' '}
              <span className="font-semibold text-white/70 tabular-nums">
                {isFree ? Math.min(10, displayed.length) : displayed.length}
              </span>
              {isFree && allOpps.length > 10 && (
                <span className="text-white/50"> of <span className="font-semibold text-white/70 tabular-nums">{allOpps.length}</span></span>
              )}{' '}
              opportunit{(isFree ? Math.min(10, displayed.length) : displayed.length) === 1 ? 'y' : 'ies'}
              {isFree && allOpps.length > 10 && (
                <span className="text-violet-400/70"> · {allOpps.length - 10} locked</span>
              )}
            </span>
            <div className="flex items-center gap-2.5">
              {hotCount > 0 && <span>🔥 <span className="font-semibold tabular-nums">{hotCount}</span> hot</span>}
              {launchCount > 0 && <span>🚀 <span className="font-semibold tabular-nums">{launchCount}</span> launch-ready</span>}
              {profitableCount > 0 && <span>💰 <span className="font-semibold tabular-nums">{profitableCount}</span> profitable</span>}
            </div>
          </div>
          {/* CTA */}
          <div className="sm:ml-auto">
            {isFree ? (
              <Link href="/register?plan=pro"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-white bg-violet-600 hover:bg-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.4)] hover:shadow-[0_0_20px_rgba(124,58,237,0.7)] transition-all">
                🔒 Upgrade to Pro — Unlock All
              </Link>
            ) : (
              <button
                onClick={() => runSearch.mutate()}
                disabled={searching}
                className={`relative overflow-hidden text-sm font-semibold
                  inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                  min-w-[200px] min-h-[44px] select-none transition-all duration-300
                  ${searching
                    ? 'cursor-not-allowed animate-pulse-glow border border-violet-500/50'
                    : 'border border-white/15 text-white/60 hover:border-violet-500/50 hover:text-violet-300 hover:bg-violet-500/8 disabled:opacity-40'}`}
                style={searching ? {
                  background: 'linear-gradient(135deg, rgba(109,40,217,0.85) 0%, rgba(79,70,229,0.85) 100%)',
                  boxShadow: '0 0 20px rgba(124,58,237,0.5), 0 4px 12px rgba(124,58,237,0.25)',
                } : {}}
              >
                {searching && (
                  <>
                    <span
                      className="absolute inset-0 bg-white/10 transition-all duration-[900ms] ease-out pointer-events-none"
                      style={{ clipPath: `inset(0 ${100 - scanPct}% 0 0)` }}
                    />
                    <span
                      className="absolute inset-0 pointer-events-none animate-shimmer"
                      style={{
                        background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)',
                        backgroundSize: '200% 100%',
                      }}
                    />
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 pointer-events-none overflow-hidden">
                      <span
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-300 to-indigo-300 transition-all duration-[900ms] ease-out"
                        style={{ width: `${scanPct}%` }}
                      />
                    </span>
                  </>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {searching ? (
                    <>
                      <span className="text-lg animate-pulse leading-none">{SCAN_STAGES[scanStep]?.icon}</span>
                      <span className="truncate">{SCAN_STAGES[scanStep]?.label}…</span>
                      <span className="text-[11px] text-violet-200/70 font-mono tabular-nums ml-1">{scanPct}%</span>
                    </>
                  ) : (
                    <>Scan for More <span className="text-base leading-none">↓</span></>
                  )}
                </span>
              </button>
            )}
          </div>
        </div>
        </div>
      )}

    </div>
  );
}
