'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ScoreGauge, RecommendationBadge, ScoreBadge } from '@/components/ui/ScoreGauge';
import { ProfitWaterfall } from '@/components/profit/ProfitWaterfall';
import { SupplierProfileDrawer } from '@/components/supplier/SupplierProfileDrawer';

const TABS = ['Overview', 'Research', 'Suppliers', 'Profitability', 'Competition', 'Listing', 'Ads', 'Growth', 'Recommendation', 'Report'];

function minor(v: number) { return (v / 100).toFixed(2); }
function usdD(v: number, d = 2) { return '$' + (v / 100).toFixed(d); }
function pctD(n: number) { return n.toFixed(1) + '%'; }

// ── Trade Intelligence Data ────────────────────────────────────────────────────
type TradeRow = { hsn: string; hs6: string; chapter: string; gst: number; dgft: string; rodtep: boolean };
const TRADE_DB: [string, TradeRow][] = [
  ['home decor',  { hsn: '6304', hs6: '630492', chapter: 'Ch.63 · Made-up Textile Articles', gst: 12, dgft: 'Free', rodtep: true }],
  ['handicraft',  { hsn: '6913', hs6: '691390', chapter: 'Ch.69 · Decorative Ceramic Articles', gst: 12, dgft: 'Free', rodtep: true }],
  ['fashion',     { hsn: '6204', hs6: '620462', chapter: "Ch.62 · Women's Garments", gst: 12, dgft: 'Free', rodtep: true }],
  ['apparel',     { hsn: '6204', hs6: '620462', chapter: 'Ch.62 · Apparel & Clothing', gst: 12, dgft: 'Free', rodtep: true }],
  ['textile',     { hsn: '6217', hs6: '621790', chapter: 'Ch.62 · Clothing Accessories', gst: 5,  dgft: 'Free', rodtep: true }],
  ['health',      { hsn: '3004', hs6: '300490', chapter: 'Ch.30 · Pharmaceutical Products', gst: 12, dgft: 'Free', rodtep: false }],
  ['wellness',    { hsn: '3304', hs6: '330499', chapter: 'Ch.33 · Health Preparations', gst: 18, dgft: 'Free', rodtep: false }],
  ['skincare',    { hsn: '3304', hs6: '330499', chapter: 'Ch.33 · Skin Care Preparations', gst: 18, dgft: 'Free', rodtep: true }],
  ['cosmetic',    { hsn: '3305', hs6: '330590', chapter: 'Ch.33 · Cosmetics & Toiletries', gst: 18, dgft: 'Free', rodtep: true }],
  ['beauty',      { hsn: '3305', hs6: '330590', chapter: 'Ch.33 · Perfumery / Cosmetics', gst: 18, dgft: 'Free', rodtep: true }],
  ['electron',    { hsn: '8543', hs6: '854370', chapter: 'Ch.85 · Electronic Equipment', gst: 18, dgft: 'Free', rodtep: false }],
  ['spice',       { hsn: '0910', hs6: '091099', chapter: 'Ch.09 · Spices', gst: 5,  dgft: 'Free', rodtep: true }],
  ['food',        { hsn: '2106', hs6: '210690', chapter: 'Ch.21 · Food Preparations', gst: 5,  dgft: 'Free', rodtep: true }],
  ['yoga',        { hsn: '9506', hs6: '950699', chapter: 'Ch.95 · Sports / Yoga Equipment', gst: 12, dgft: 'Free', rodtep: true }],
  ['fitness',     { hsn: '9506', hs6: '950699', chapter: 'Ch.95 · Fitness Equipment', gst: 12, dgft: 'Free', rodtep: true }],
  ['sport',       { hsn: '9506', hs6: '950699', chapter: 'Ch.95 · Sports & Recreation', gst: 12, dgft: 'Free', rodtep: true }],
  ['cookware',    { hsn: '7323', hs6: '732394', chapter: 'Ch.73 · Cooking Utensils', gst: 18, dgft: 'Free', rodtep: true }],
  ['kitchen',     { hsn: '7323', hs6: '732399', chapter: 'Ch.73 · Steel/Iron Household Articles', gst: 18, dgft: 'Free', rodtep: true }],
  ['jewel',       { hsn: '7117', hs6: '711790', chapter: 'Ch.71 · Imitation Jewellery', gst: 3,  dgft: 'Free', rodtep: true }],
  ['jewelry',     { hsn: '7117', hs6: '711790', chapter: 'Ch.71 · Imitation Jewellery', gst: 3,  dgft: 'Free', rodtep: true }],
  ['leather',     { hsn: '4202', hs6: '420222', chapter: 'Ch.42 · Leather Goods', gst: 18, dgft: 'Free', rodtep: true }],
  ['bag',         { hsn: '4202', hs6: '420212', chapter: 'Ch.42 · Bags & Travel Articles', gst: 18, dgft: 'Free', rodtep: true }],
  ['candle',      { hsn: '3406', hs6: '340600', chapter: 'Ch.34 · Candles & Wax Articles', gst: 12, dgft: 'Free', rodtep: true }],
  ['wood',        { hsn: '4421', hs6: '442190', chapter: 'Ch.44 · Wood Articles', gst: 12, dgft: 'Free', rodtep: true }],
  ['toy',         { hsn: '9503', hs6: '950300', chapter: 'Ch.95 · Toys & Games', gst: 12, dgft: 'Free', rodtep: true }],
  ['stationery',  { hsn: '4820', hs6: '482010', chapter: 'Ch.48 · Notebooks & Stationery', gst: 12, dgft: 'Free', rodtep: true }],
  ['pottery',     { hsn: '6911', hs6: '691110', chapter: 'Ch.69 · Ceramic Tableware', gst: 12, dgft: 'Free', rodtep: true }],
  ['furniture',   { hsn: '9403', hs6: '940360', chapter: 'Ch.94 · Furniture', gst: 18, dgft: 'Free', rodtep: true }],
  ['carpet',      { hsn: '5701', hs6: '570110', chapter: 'Ch.57 · Hand-knotted Carpets', gst: 5,  dgft: 'Free', rodtep: true }],
  ['rug',         { hsn: '5705', hs6: '570500', chapter: 'Ch.57 · Carpets & Floor Coverings', gst: 5,  dgft: 'Free', rodtep: true }],
  ['lighting',    { hsn: '9405', hs6: '940540', chapter: 'Ch.94 · Lighting Equipment', gst: 12, dgft: 'Free', rodtep: true }],
  ['lamp',        { hsn: '9405', hs6: '940540', chapter: 'Ch.94 · Lamps & Lighting', gst: 12, dgft: 'Free', rodtep: true }],
  ['painting',    { hsn: '9701', hs6: '970190', chapter: 'Ch.97 · Paintings & Art', gst: 5,  dgft: 'Free', rodtep: true }],
  ['art',         { hsn: '9701', hs6: '970110', chapter: 'Ch.97 · Works of Art', gst: 5,  dgft: 'Free', rodtep: true }],
  ['supplement',  { hsn: '2106', hs6: '210690', chapter: 'Ch.21 · Food Supplements', gst: 18, dgft: 'Free', rodtep: false }],
  ['herbal',      { hsn: '1211', hs6: '121190', chapter: 'Ch.12 · Plants for Pharma', gst: 5,  dgft: 'Free', rodtep: true }],
  ['pet',         { hsn: '4201', hs6: '420100', chapter: 'Ch.42 · Pet Accessories', gst: 12, dgft: 'Free', rodtep: true }],
];
function lookupTrade(category: string): TradeRow {
  const cat = (category || '').toLowerCase().replace(/_/g, ' ');
  for (const [k, v] of TRADE_DB) { if (cat.includes(k)) return v; }
  return { hsn: '9999', hs6: '999999', chapter: 'General Merchandise', gst: 18, dgft: 'Free', rodtep: true };
}

type DutyRow = { pct: number; threshold: string; compliance: string[]; notes: string };
const DUTY_DB: Record<string, Record<string, DutyRow>> = {
  us: {
    default:     { pct: 0,    threshold: 'USD $800',   compliance: ['CBP entry >$800', 'ISF filing'],                                          notes: 'No India-US FTA; MFN rates; many India-origin goods duty-free' },
    textile:     { pct: 12.0, threshold: 'USD $800',   compliance: ['FTC Textile label', "CPSC (children's items)"],                           notes: 'India origin exempt from Section 301; CN origin adds 25%+ tariff' },
    electronics: { pct: 0,    threshold: 'USD $800',   compliance: ['FCC ID required', 'UL/ETL preferred'],                                    notes: 'Most electronics duty-free under HTS Chapter 84/85' },
    health:      { pct: 0,    threshold: 'USD $800',   compliance: ['FDA registration', 'cGMP certificate'],                                    notes: 'FDA prior notice 4h before arrival; DSHEA compliance for supplements' },
    beauty:      { pct: 0,    threshold: 'USD $800',   compliance: ['FDA cosmetics', 'INCI ingredient list'],                                   notes: 'MoCRA 2022: facility registration + product listing recommended' },
    food:        { pct: 0,    threshold: 'USD $800',   compliance: ['FDA Food Facility reg', 'Nutrition Facts label', 'FSMA FSVP'],            notes: 'Importer needs FSVP plan; organic needs USDA NOP certification' },
    jewellery:   { pct: 6.5,  threshold: 'USD $800',   compliance: ['CPSC lead/cadmium limits'],                                               notes: 'Imitation: 11%; Fine gold: 5.5%; Fine silver: 3%' },
    leather:     { pct: 4.5,  threshold: 'USD $800',   compliance: ['CITES (exotic leather)', 'COO label'],                                    notes: 'Handbags: 7.2–16%; Wallets: 8–17.6%' },
    toy:         { pct: 0,    threshold: 'USD $800',   compliance: ["CPSC children's safety", 'ASTM F963'],                                    notes: "Children's toys need CPSC certification; lead content <90ppm" },
  },
  gb: {
    default:     { pct: 0,    threshold: 'GBP £135',   compliance: ['UK Global Tariff', 'VAT 20% at import'],                                  notes: 'India-UK FTA under negotiation — potential duty reduction soon' },
    textile:     { pct: 12.0, threshold: 'GBP £135',   compliance: ['UKCA marking', 'REACH compliance'],                                       notes: 'UK DCTS (GSP successor) may reduce duty for India-origin goods' },
    electronics: { pct: 0,    threshold: 'GBP £135',   compliance: ['UKCA mark mandatory', 'RoHS UK SI 2012/3032'],                            notes: 'CE mark invalid in UK from Jan 2025; UKCA required' },
    beauty:      { pct: 0,    threshold: 'GBP £135',   compliance: ['UK Cosmetics Reg 2009', 'UK Responsible Person'],                         notes: 'Post-Brexit: separate UK notification from EU CPNP required' },
    food:        { pct: 0,    threshold: 'GBP £135',   compliance: ['UK FBO registration', 'PPDS allergen labelling'],                         notes: 'SPS checks at GB border; BTOM phased 2024–25' },
    toy:         { pct: 0,    threshold: 'GBP £135',   compliance: ['UK Toys Safety Regs', 'UKCA mark'],                                       notes: 'EN 71 test reports still recognised; UKCA DoC required' },
  },
  de: {
    default:     { pct: 0,    threshold: 'EUR €150',   compliance: ['EU customs entry', 'VAT 19% at import'],                                  notes: 'IOSS registration needed for DTC sales below €150 to EU consumers' },
    textile:     { pct: 12.0, threshold: 'EUR €150',   compliance: ['CE mark', 'REACH', 'Eco-design Directive'],                               notes: 'EU GSP+ preferential rate applies for India on many textile codes' },
    electronics: { pct: 0,    threshold: 'EUR €150',   compliance: ['CE mark mandatory', 'RoHS', 'WEEE registration'],                         notes: 'WEEE producer registration required in each EU member state' },
    beauty:      { pct: 0,    threshold: 'EUR €150',   compliance: ['EU Cosmetics Reg 1223/2009', 'CPNP notification', 'EU Responsible Person'], notes: 'Single CPNP notification covers all EU countries' },
    food:        { pct: 0,    threshold: 'EUR €150',   compliance: ['EU FBO notification', 'DE language labels', 'Allergen declaration'],      notes: 'Organic: EU organic logo + control body code required' },
    toy:         { pct: 4.7,  threshold: 'EUR €150',   compliance: ['CE mark', 'EN 71 test report', 'Technical file'],                        notes: 'EN 71 parts 1–3 mandatory; REACH SVHC chemical check required' },
  },
  ca: {
    default:     { pct: 0,    threshold: 'CAD $20',    compliance: ['CBSA B3 entry form'],                                                     notes: 'De minimis only CAD $20 — most B2C parcels face duties' },
    textile:     { pct: 18.0, threshold: 'CAD $20',    compliance: ['CCPSA compliance', 'Bilingual EN/FR labels'],                             notes: 'No India-Canada FTA; MFN rates apply; higher than US' },
    electronics: { pct: 0,    threshold: 'CAD $20',    compliance: ['ISED Canada', 'CSA/UL certification'],                                    notes: 'Radio equipment needs ISED RSP-100 compliance' },
    food:        { pct: 0,    threshold: 'CAD $20',    compliance: ['CFIA registration', 'Bilingual EN/FR labels'],                            notes: 'Organic: Canada Organic Regime (COR) certification needed' },
    toy:         { pct: 0,    threshold: 'CAD $20',    compliance: ['Canada Consumer Safety', 'ASTM/EN test reports'],                         notes: 'Hazardous Products Act compliance; bilingual labels required' },
  },
  au: {
    default:     { pct: 5,    threshold: 'AUD $1,000', compliance: ['ABF customs entry', 'GST 10% via LVT'],                                   notes: 'GST collected by marketplace (Amazon AU, eBay AU) for orders <A$1,000' },
    textile:     { pct: 10.0, threshold: 'AUD $1,000', compliance: ['ACL compliance', 'Care label required'],                                  notes: 'LVT: GST collected at point of sale by platform' },
    electronics: { pct: 0,    threshold: 'AUD $1,000', compliance: ['RCM mark mandatory', 'ACMA approval for radio'],                         notes: 'Regulatory Compliance Mark (RCM) replaces old A-tick and C-tick' },
    food:        { pct: 0,    threshold: 'AUD $1,000', compliance: ['FSANZ compliance', 'Import permit (some foods)'],                         notes: 'Biosecurity Act: some foods need import permit; check prohibited list' },
    toy:         { pct: 0,    threshold: 'AUD $1,000', compliance: ['ACL Product Safety', 'AS/NZS 8124 toys standard'],                        notes: 'Mandatory safety standard for toys; choking hazard rules apply' },
  },
};
function lookupDuty(mpCode: string, category: string): DutyRow {
  const cc = (mpCode || '').split('_').pop() || 'us';
  const country = DUTY_DB[cc] ?? DUTY_DB['us'];
  const cat = (category || '').toLowerCase().replace(/_/g, ' ');
  const key = cat.includes('textile') || cat.includes('fashion') || cat.includes('apparel') || cat.includes('cloth') ? 'textile'
    : cat.includes('electron') || cat.includes('gadget') ? 'electronics'
    : cat.includes('health') || cat.includes('wellness') || cat.includes('supplement') ? 'health'
    : cat.includes('beauty') || cat.includes('cosmetic') || cat.includes('skincare') ? 'beauty'
    : cat.includes('food') || cat.includes('spice') || cat.includes('snack') ? 'food'
    : cat.includes('jewel') || cat.includes('jewelry') ? 'jewellery'
    : cat.includes('leather') || cat.includes('bag') ? 'leather'
    : cat.includes('toy') || cat.includes('game') ? 'toy'
    : 'default';
  return country[key] ?? country['default'];
}
const EXPORT_DOCS_BASE = [
  'Shipping Bill (filed on ICEGATE)',
  'Commercial Invoice',
  'Packing List',
  'Certificate of Origin (COO)',
  'AD Code letter (Authorized Dealer bank)',
  'LUT/Bond — zero-rated GST export',
];
const EXPORT_DOCS_EXTRA: Record<string, string[]> = {
  food:       ['FSSAI Export NOC', 'Phytosanitary Certificate'],
  health:     ['Drug Controller NOC', 'GMP Certificate'],
  beauty:     ['CPCB Plastic Rules compliance'],
  handicraft: ['Handicraft Mark (EPCH)'],
  textile:    ['Fabric test reports (OEKO-TEX preferred)'],
};
function getExtraDocs(category: string): string[] {
  const cat = (category || '').toLowerCase().replace(/_/g, ' ');
  for (const [k, docs] of Object.entries(EXPORT_DOCS_EXTRA)) {
    if (cat.includes(k)) return docs;
  }
  return [];
}

// ── Profit bar for detail page ─────────────────────────────────────────────────
function ProfitBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-36 text-white/40 text-right shrink-0 text-xs">{label}</div>
      <div className="flex-1 h-4 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="w-16 font-mono font-semibold text-white/80 text-right text-xs">{usdD(value)}</div>
    </div>
  );
}

// ── 3D Profit Waterfall Chart ──────────────────────────────────────────────────
function ProfitWaterfallChart3D({ sale, src, ship, pkg, dutyAmt, refFee, fbaFee, adSpend, trueNet, netMargin, roi, breakeven, monthly50, platform, currency }: {
  sale: number; src: number; ship: number; pkg: number; dutyAmt: number;
  refFee: number; fbaFee: number; adSpend: number; trueNet: number;
  netMargin: number; roi: number; breakeven: number; monthly50: number;
  platform: string; currency: string;
}) {
  const sym = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  const f = (v: number, d = 2) => `${sym}${(Math.abs(v) / 100).toFixed(d)}`;
  const totalCost = src + ship + pkg + dutyAmt + refFee + fbaFee + adSpend;

  const segments = [
    { label: ['Sale', 'Price'],    value: sale,              up: true,          color: '#7c3aed', shade: '#5b21b6' },
    { label: ['Source', 'Cost'],   value: src,               up: false,         color: '#ef4444', shade: '#991b1b' },
    { label: ["Int'l", 'Ship.'],   value: ship,              up: false,         color: '#f97316', shade: '#c2410c' },
    { label: ['Pkg +', 'Label'],   value: pkg,               up: false,         color: '#f59e0b', shade: '#b45309' },
    { label: ['Import', 'Duty'],   value: dutyAmt,           up: false,         color: '#eab308', shade: '#a16207' },
    { label: ['Referral', 'Fee'],  value: refFee,            up: false,         color: '#ec4899', shade: '#9d174d' },
    { label: ['FBA /', 'Fulfil.'], value: fbaFee,            up: false,         color: '#e879f9', shade: '#a21caf' },
    { label: ['Ad', 'Spend'],      value: adSpend,           up: false,         color: '#fb7185', shade: '#be123c' },
    { label: ['Net', 'Profit'],    value: Math.abs(trueNet), up: trueNet >= 0,  color: trueNet >= 0 ? '#22c55e' : '#ef4444', shade: trueNet >= 0 ? '#15803d' : '#991b1b' },
  ].filter(s => s.value > 0);

  const MAX_H = 110;
  const maxVal = Math.max(...segments.map(s => s.value), 1);

  const kpis = [
    { label: 'Net / Unit',  value: `${trueNet < 0 ? '-' : ''}${f(Math.abs(trueNet))}`, pos: trueNet >= 0 },
    { label: 'Total Cost',  value: f(totalCost),                                         pos: false },
    { label: 'Net Margin',  value: `${netMargin.toFixed(1)}%`,                           pos: netMargin >= 15 },
    { label: 'ROI',         value: `${roi.toFixed(0)}%`,                                 pos: roi >= 20 },
    { label: 'Break-even',  value: `${Math.min(breakeven, 999)} units`,                  pos: breakeven < 200 },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0e1e 0%, #0f172a 100%)' }}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-violet-400/60 mb-0.5 font-semibold">Profit Waterfall</div>
            <div className="text-sm font-bold text-white">{platform.toUpperCase()}</div>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            {([['#7c3aed','▲ Revenue'],['#ef4444','▼ Costs'],['#22c55e','▲ Profit']] as [string,string][]).map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: c }} />
                <span className="text-[9px] text-white/40">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-1 mb-1" style={{ height: `${MAX_H * 2 + 2}px` }}>
          {segments.map((seg, i) => {
            const barH = Math.max(6, Math.round((seg.value / maxVal) * MAX_H));
            return (
              <div key={i} className="flex flex-col flex-1 min-w-0" style={{ height: `${MAX_H * 2 + 2}px` }}>
                <div className="flex flex-col justify-end" style={{ height: `${MAX_H}px` }}>
                  {seg.up && (
                    <div className="relative" style={{ height: `${barH}px` }}>
                      <div className="absolute inset-0 rounded-t-sm" style={{ backgroundColor: seg.color, boxShadow: `0 0 10px ${seg.color}50` }} />
                      <div className="absolute top-0 right-0 bottom-0 w-[3px] opacity-40 rounded-tr-sm"
                        style={{ backgroundColor: seg.shade, transform: 'skewY(-6deg) translateX(1.5px)' }} />
                      <div className="absolute left-0 right-0 h-[3px] -top-[2px] opacity-50"
                        style={{ backgroundColor: seg.color, transform: 'skewX(-10deg)' }} />
                    </div>
                  )}
                </div>
                <div className="w-full h-[2px] bg-white/10" />
                <div className="flex flex-col justify-start" style={{ height: `${MAX_H}px` }}>
                  {!seg.up && (
                    <div className="relative" style={{ height: `${barH}px` }}>
                      <div className="absolute inset-0 rounded-b-sm" style={{ backgroundColor: seg.color, boxShadow: `0 0 10px ${seg.color}50` }} />
                      <div className="absolute bottom-0 right-0 top-0 w-[3px] opacity-40 rounded-br-sm"
                        style={{ backgroundColor: seg.shade, transform: 'skewY(6deg) translateX(1.5px)' }} />
                      <div className="absolute left-0 right-0 h-[3px] -bottom-[2px] opacity-50"
                        style={{ backgroundColor: seg.color, transform: 'skewX(10deg)' }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-1 mb-5">
          {segments.map((seg, i) => (
            <div key={i} className="flex-1 min-w-0 text-center">
              {seg.label.map((line, j) => (
                <div key={j} className="text-[7px] text-white/35 leading-[1.3]">{line}</div>
              ))}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-2 border-t border-white/8 pt-4">
          {kpis.map(({ label, value, pos }) => (
            <div key={label} className="text-center">
              <div className="text-[8px] text-white/35 mb-0.5 leading-snug">{label}</div>
              <div className={`text-xs font-bold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl p-3 flex items-center justify-between"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
          <div>
            <div className="text-[9px] text-white/40">Est. Monthly Profit</div>
            <div className="text-[8px] text-white/25">50 units / month</div>
          </div>
          <div className={`text-lg font-bold ${monthly50 >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {monthly50 < 0 ? '-' : ''}{sym}{(Math.abs(monthly50) / 100).toFixed(0)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Leaflet map rendered inside an iframe srcDoc — no package install needed, no SSR issues
function GlobalSupplierMap({ candidates }: { candidates: any[] }) {
  const pins = candidates
    .filter((sc: any) => sc.latitude && sc.longitude)
    .map((sc: any) => ({
      lat: Number(sc.latitude), lon: Number(sc.longitude),
      name: sc.supplierName || sc.supplier?.name || '',
      city: sc.city || '',
      country: sc.country || 'India',
      source: (sc.supplier?.source || sc.source || '').replace(/-/g, ' '),
      isIndia: (sc.country || 'India') === 'India',
      costRaw: sc.productCostMinor || 0,
    }));

  if (pins.length === 0) return null;

  const html = `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>body{margin:0;padding:0;font-family:sans-serif}#map{height:100vh;width:100%}</style>
</head><body><div id="map"></div><script>
const map=L.map('map',{zoomControl:true,attributionControl:false}).setView([25,95],2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
const pins=${JSON.stringify(pins)};
pins.forEach(function(p,i){
  const color=p.isIndia?'#10b981':'#6366f1';
  const icon=L.divIcon({
    html:'<div style="background:'+color+';color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)">'+(i+1)+'<\/div>',
    iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-15],className:''
  });
  const label=p.isIndia?'<span style="color:#10b981;font-weight:700">India Priority<\/span>':'<span style="color:#6366f1">Global Alternative<\/span>';
  L.marker([p.lat,p.lon],{icon}).addTo(map).bindPopup(
    '<b>'+p.name+'<\/b><br>'+label+'<br>'+p.city+(p.city?', ':'')+p.country+'<br><small>via '+p.source+'<\/small>'
  );
});
if(pins.length>1){
  try{map.fitBounds(L.latLngBounds(pins.map(function(p){return[p.lat,p.lon]})),{padding:[30,30],maxZoom:7});}catch(e){}
}
<\/script></body></html>`;

  return (
    <iframe
      srcDoc={html}
      className="w-full border-0"
      style={{ height: 260 }}
      title="Supplier Locations"
      sandbox="allow-scripts"
    />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-white/35 hover:text-white/80 hover:bg-white/5 transition-all">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab');
    return TABS.includes(t || '') ? (t as string) : 'Overview';
  });
  const [genLoading, setGenLoading] = useState(false);
  const [drawerSupplier, setDrawerSupplier] = useState<string | null>(null);

  const { data: opp, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => api.opportunities.get(id),
    enabled: !!id,
  });

  const { data: listing } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.opportunities.getListing(id),
    enabled: !!id && tab === 'Listing',
  });

  const { data: keywords } = useQuery({
    queryKey: ['keywords', id],
    queryFn: () => api.opportunities.getKeywords(id),
    enabled: !!id && tab === 'Listing',
  });

  const genAssets = useMutation({
    mutationFn: () => api.opportunities.generateAssets(id),
    onSuccess: () => setGenLoading(false),
  });

  const genReport = useMutation({
    mutationFn: () => api.opportunities.generateReport(id),
  });

  const genAds = useMutation({
    mutationFn: () => api.opportunities.generateAds(id),
  });

  const genGrowth = useMutation({
    mutationFn: () => api.opportunities.generateGrowth(id),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin text-3xl text-green-400">&#x27F3;</div>
    </div>
  );
  if (!opp) return <div className="card-dark p-8 text-center text-white/40">Opportunity not found</div>;

  const score = opp.score || {};
  const profit = opp.profitModel;
  const sub = [
    { label: 'Demand',      value: score.demand },
    { label: 'Competition', value: score.competition },
    { label: 'Margin',      value: score.margin },
    { label: 'Saturation',  value: score.saturation },
    { label: 'Trend',       value: score.trend },
    { label: 'Shipping',    value: score.shipping },
    { label: 'Mkt Fit',     value: score.marketplaceFit },
  ];

  return (
    <div>
      {/* Header card */}
      <div className="card-dark p-4 sm:p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <div className="w-full sm:w-32 h-40 sm:h-32 rounded-xl overflow-hidden bg-white/8 shrink-0 relative"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 4px 16px rgba(0,0,0,0.3)' }}>
            {opp.product?.imageUrl ? (
              <img
                src={opp.product.imageUrl}
                alt={opp.product.title}
                className="w-full h-full object-cover"
                onError={e => {
                  const el = e.target as HTMLImageElement;
                  el.onerror = null;
                  const q = encodeURIComponent((opp.product?.title || 'product').split(' ').slice(0, 4).join(','));
                  el.src = `https://source.unsplash.com/128x128/?${q}`;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-4xl">📦</div>
            )}
          </div>
          <div className="shrink-0">
            <ScoreGauge score={score.opportunity || 0} size="lg" label="Opportunity Score" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white mb-1 leading-snug">{opp.product?.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs bg-violet-500/15 border border-violet-500/25 text-violet-300 px-2.5 py-1 rounded-lg font-mono font-semibold">
                {opp.marketplace?.code?.toUpperCase()}
              </span>
              <span className="text-xs text-white/40 capitalize">{opp.product?.category?.replace(/_/g, ' ')}</span>
              <span className="text-[10px] text-white/25 font-mono">v{opp.scoreVersion}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence)} />
              {profit && (
                <span className="text-sm font-semibold text-emerald-400">
                  Net: {opp.marketplace?.currency} {minor(profit.netProfitMinor)}/unit
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setGenLoading(true); genAssets.mutate(); }}
            disabled={genLoading}
            className="btn-primary text-sm disabled:opacity-50 w-full sm:w-auto whitespace-nowrap">
            {genLoading ? '⟳ Generating…' : '✨ Generate Launch Assets'}
          </button>
        </div>

        {/* Sub-scores row */}
        <div className="flex gap-2 sm:gap-3 mt-4 pt-4 border-t border-white/5 flex-wrap">
          {sub.map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-[10px] text-white/35 mb-1">{label}</div>
              <ScoreBadge score={value || 0} />
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable tab bar — pill style */}
      <div className="scroll-tabs mb-5 -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="tab-pill-bar min-w-max">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab-pill${tab === t ? ' active' : ''}`}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sub.map(({ label, value }) => (
            <div key={label} className="card-dark p-4 flex items-center gap-3">
              <ScoreGauge score={value || 0} size="sm" />
              <div>
                <div className="text-sm font-medium text-white/80">{label}</div>
                <div className="text-xs text-white/35">{(value || 0) >= 70 ? 'Strong' : (value || 0) >= 40 ? 'Moderate' : 'Weak'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Research ── */}
      {tab === 'Research' && (() => {
        const trade = lookupTrade(opp.product?.category || '');
        const duty  = lookupDuty(opp.marketplace?.code || '', opp.product?.category || '');
        const extraDocs = getExtraDocs(opp.product?.category || '');
        const mpCountry = opp.marketplace?.country || 'United States';
        return (
          <div className="space-y-4">
            {/* Market scores */}
            <div className="card-dark p-4 sm:p-5">
              <h2 className="font-semibold text-white mb-3">Market Intelligence</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Demand',     val: Math.round(score.demand || 0), unit: '/100' },
                  { label: 'Trend',      val: Math.round(score.trend || 0),  unit: '/100' },
                  { label: 'Mkt Fit',    val: Math.round(score.marketplaceFit || 0), unit: '/100' },
                  { label: 'Saturation', val: Math.round(score.saturation || 0), unit: '/100' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-white/5 p-3 text-center">
                    <div className="text-[11px] text-white/35 mb-1">{s.label}</div>
                    <div className={`font-bold text-xl ${s.val >= 70 ? 'text-emerald-400' : s.val >= 45 ? 'text-amber-400' : 'text-red-600'}`}>{s.val}<span className="text-xs font-normal text-white/35">{s.unit}</span></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Classification */}
            <div className="card-dark p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🏷️</span>
                <h3 className="font-semibold text-white">Product Classification &amp; GST</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3">
                  <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">HSN Code (India)</div>
                  <div className="font-bold text-indigo-300 text-2xl font-mono">{trade.hsn}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">Use 8-digit for Shipping Bill</div>
                </div>
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3">
                  <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1">HS Code (International)</div>
                  <div className="font-bold text-purple-300 text-2xl font-mono">{trade.hs6}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">WCO 6-digit standard</div>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1">GST Rate (India)</div>
                  <div className="font-bold text-amber-300 text-2xl">{trade.gst}%</div>
                  <div className="text-[10px] text-white/40 mt-0.5">Exports: 0% (zero-rated)</div>
                </div>
              </div>
              <div className="rounded-xl bg-white/5 px-4 py-3 mb-3">
                <span className="text-[10px] text-white/35">Customs Chapter · </span>
                <span className="text-sm font-medium text-white/80">{trade.chapter}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${trade.dgft === 'Free' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-300'}`}>
                  DGFT: {trade.dgft} to Export
                </span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${trade.rodtep ? 'bg-blue-500/15 text-blue-300' : 'bg-white/8 text-white/40'}`}>
                  RoDTEP: {trade.rodtep ? 'Eligible ✓' : 'Not Eligible'}
                </span>
                <span className="text-xs px-3 py-1 rounded-full font-medium bg-violet-100 text-violet-300">IEC Mandatory</span>
              </div>
            </div>

            {/* Import Duties at destination */}
            <div className="card-dark p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🌍</span>
                <h3 className="font-semibold text-white">Import Duties — {mpCountry}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                  <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider mb-1">Import Duty Rate</div>
                  <div className="font-bold text-rose-300 text-3xl">{duty.pct}%</div>
                  <div className="text-[10px] text-white/40 mt-1">On CIF value at customs</div>
                </div>
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">
                  <div className="text-[10px] font-semibold text-sky-500 uppercase tracking-wider mb-1">De Minimis Threshold</div>
                  <div className="font-bold text-sky-300 text-xl mt-1">{duty.threshold}</div>
                  <div className="text-[10px] text-white/40 mt-1">Below this → no duty charged</div>
                </div>
              </div>
              {duty.compliance.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Compliance Required</div>
                  <div className="flex flex-wrap gap-2">
                    {duty.compliance.map((c: string) => (
                      <span key={c} className="text-xs bg-amber-500/10 border border-amber-500/25 text-amber-300 px-2.5 py-1 rounded-lg">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 text-sm text-blue-200">
                💡 {duty.notes}
              </div>
            </div>

            {/* Export Documents */}
            <div className="card-dark p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📄</span>
                <h3 className="font-semibold text-white">Export from India — Documents Checklist</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 mb-4">
                {EXPORT_DOCS_BASE.map(doc => (
                  <div key={doc} className="flex items-start gap-2 text-sm text-white/80">
                    <span className="text-emerald-500 mt-0.5 shrink-0 font-bold">✓</span>{doc}
                  </div>
                ))}
                {extraDocs.map(doc => (
                  <div key={doc} className="flex items-start gap-2 text-sm text-white/80">
                    <span className="text-amber-500 mt-0.5 shrink-0 font-bold">★</span>{doc}
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 rounded">category-specific</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 space-y-2 text-sm text-violet-200">
                <div><strong>IEC (Import Export Code)</strong> — Mandatory for all exports. Apply at dgft.gov.in — one-time fee ₹500.</div>
                <div><strong>AD Code</strong> — Register your bank's Authorized Dealer code with customs to receive foreign remittance.</div>
                <div><strong>LUT / Bond</strong> — File Letter of Undertaking annually to export under zero-rated GST without upfront payment.</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Suppliers ── */}
      {tab === 'Suppliers' && (
        <div className="space-y-3">
          {/* Global supplier map */}
          {opp.sourcingCandidates?.some((sc: any) => sc.latitude && sc.longitude) && (
            <div className="card overflow-hidden">
              <div className="p-3 border-b border-white/8 flex items-center gap-2">
                <span className="text-sm font-semibold text-white/80">🌍 Global Supplier Map</span>
                <span className="text-xs text-white/35">India suppliers prioritised</span>
              </div>
              <GlobalSupplierMap candidates={opp.sourcingCandidates} />
            </div>
          )}

          {/* Supplier table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Sourcing Candidates</span>
                <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">India First</span>
              </div>
              <span className="text-xs text-white/35">Click a row to view profile &amp; contact</span>
            </div>
            {(opp.sourcingCandidates?.length === 0 || !opp.sourcingCandidates) ? (
              <div className="p-8 text-center text-white/35">No suppliers found</div>
            ) : (
              <div className="table-scroll">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-white/5 text-xs text-white/55">
                    <tr>
                      <th className="text-left px-4 py-2.5">Supplier</th>
                      <th className="text-left px-4 py-2.5">Country</th>
                      <th className="text-left px-4 py-2.5">Platform</th>
                      <th className="text-right px-4 py-2.5">Unit Cost</th>
                      <th className="text-center px-4 py-2.5">Trust</th>
                      <th className="text-right px-4 py-2.5">MOQ</th>
                      <th className="text-right px-4 py-2.5">Lead</th>
                      <th className="text-center px-4 py-2.5">Ease</th>
                      <th className="text-center px-4 py-2.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {opp.sourcingCandidates?.map((sc: any, idx: number) => {
                      const isIndia = (sc.country || 'India') === 'India';
                      const flag = isIndia ? '🇮🇳' : sc.country === 'China' ? '🇨🇳' : sc.country === 'Hong Kong' ? '🇭🇰' : sc.country === 'United States' ? '🇺🇸' : '🌐';
                      const trustPct = Math.round((Number(sc.rating) || 4.0) / 5 * 100);
                      const costLabel = isIndia ? `₹${minor(sc.productCostMinor)}` : `$${((sc.productCostMinor || 0) / 100).toFixed(2)}`;
                      return (
                        <tr key={sc.id} className={`cursor-pointer transition-colors ${isIndia ? 'hover:bg-emerald-500/8 bg-emerald-500/5' : 'hover:bg-white/[0.06]'}`}
                          onClick={() => setDrawerSupplier(sc.id)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isIndia && idx === 0 && (
                                <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded font-bold shrink-0">BEST</span>
                              )}
                              <span className="font-medium text-white leading-tight">{sc.supplier?.name || sc.supplierName}</span>
                            </div>
                            {sc.city && <div className="text-xs text-white/35 mt-0.5">📍 {sc.city}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 text-sm">
                              <span className="text-lg leading-none">{flag}</span>
                              <span className="text-xs text-white/55">{sc.country || 'India'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs uppercase tracking-wide text-white/40 font-mono">
                            {(sc.supplier?.source || sc.source || '').replace(/-/g, ' ')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-white">{costLabel}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${trustPct}%`, background: trustPct >= 80 ? '#10b981' : trustPct >= 60 ? '#f59e0b' : '#ef4444' }}/>
                              </div>
                              <span className="text-[10px] text-white/40">{trustPct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-white/80">{sc.moq}</td>
                          <td className="px-4 py-3 text-right text-white/55">{sc.leadTimeDays}d</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              sc.feasibility === 'easy' ? 'bg-green-500/15 text-green-400' :
                              sc.feasibility === 'moderate' ? 'bg-amber-100 text-amber-300' :
                              'bg-red-500/15 text-red-300'
                            }`}>{sc.feasibility}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={e => { e.stopPropagation(); setDrawerSupplier(sc.id); }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors whitespace-nowrap">
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cost comparison bar */}
          {opp.sourcingCandidates?.length > 1 && (() => {
            const costs = opp.sourcingCandidates.map((sc: any) => sc.productCostMinor || 0);
            const maxCost = Math.max(...costs);
            return (
              <div className="card-dark p-4">
                <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Price Comparison</div>
                <div className="space-y-2">
                  {opp.sourcingCandidates.map((sc: any) => {
                    const isIndia = (sc.country || 'India') === 'India';
                    const pct = maxCost > 0 ? (sc.productCostMinor / maxCost) * 100 : 0;
                    const flag = isIndia ? '🇮🇳' : sc.country === 'China' ? '🇨🇳' : sc.country === 'Hong Kong' ? '🇭🇰' : '🌐';
                    return (
                      <div key={sc.id} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-base leading-none">{flag}</span>
                        <span className="w-28 truncate text-white/55">{(sc.supplier?.source || sc.source || '').replace(/-/g, ' ')}</span>
                        <div className="flex-1 h-4 bg-white/8 rounded overflow-hidden">
                          <div className={`h-full rounded transition-all ${isIndia ? 'bg-green-500' : 'bg-indigo-400'}`}
                            style={{ width: `${pct}%` }}/>
                        </div>
                        <span className="w-16 text-right font-mono font-semibold text-white/80">
                          {isIndia ? `₹${minor(sc.productCostMinor)}` : `$${((sc.productCostMinor||0)/100).toFixed(2)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="card-dark p-4 flex items-start gap-3 text-sm text-white/55 bg-blue-500/10 border-blue-500/20">
            <span className="text-xl shrink-0">💡</span>
            <div>
              <span className="font-semibold text-white">Negotiation tip: </span>
              Contact 2–3 suppliers simultaneously. India suppliers offer craftsmanship advantage — use global prices as leverage to negotiate 15–25% below listed rate.
            </div>
          </div>
        </div>
      )}

      {/* ── Profitability ── */}
      {tab === 'Profitability' && (() => {
        const pm = profit;
        if (!pm) return <div className="card-dark p-8 text-center text-white/35">No profitability data for this opportunity</div>;
        const mpCodeStr = opp.marketplace?.code || '';
        const platform  = mpCodeStr.split('_')[0].charAt(0).toUpperCase() + mpCodeStr.split('_')[0].slice(1) || 'Marketplace';
        const currency  = pm.currency || 'USD';
        const src     = Number(pm.sourcePriceMinor   ?? 0);
        const sale    = Number(pm.salePriceMinor      ?? 0);
        const landed  = Number(pm.landedCostMinor     ?? 0);
        const fees    = Number(pm.marketplaceFeeMinor ?? 0);
        const overhead = Math.max(0, landed - src);
        const ship    = Math.round(overhead * 0.60);
        const pkg     = Math.round(overhead * 0.25);
        const dutyAmt = Math.round(overhead * 0.15);
        const refPct  = mpCodeStr.startsWith('etsy') ? 6.5 : mpCodeStr.startsWith('temu') || mpCodeStr.startsWith('walmart') ? 8 : 15;
        const refFee  = Math.round(sale * refPct / 100);
        const fbaFee  = Math.round(fees - refFee > 0 ? fees - refFee : fees * 0.5);
        const adSpend = Math.round(sale * 0.05);
        const trueNet = sale - landed - fees - adSpend;
        const netMargin = sale > 0 ? (trueNet / sale) * 100 : 0;
        const roi       = src > 0 ? (trueNet / src) * 100 : 0;
        const breakeven = trueNet > 0 ? Math.ceil(5000 / trueNet) : 999;
        const monthly50 = trueNet * 50;
        const annual50  = monthly50 * 12;
        const profitForChart = {
          salePriceMinor: sale, productCostMinor: src, packagingCostMinor: pkg,
          intlShippingMinor: ship, dutyMinor: dutyAmt, fbaFeeMinor: fbaFee,
          referralFeeMinor: refFee, adCostMinor: adSpend, netProfitMinor: trueNet,
          roiPct: roi, netMarginPct: netMargin, breakevenUnits: breakeven,
          monthlyProfitMinor: monthly50, annualProfitMinor: annual50,
        };
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cost breakdown */}
              <div className="card-dark p-5">
                <h3 className="font-semibold text-white mb-4">Cost Breakdown — {platform}</h3>
                <div className="space-y-2.5">
                  <ProfitBar label="India Source Cost"  value={src}    total={sale} color="#6366f1" />
                  <ProfitBar label="Int'l Shipping"     value={ship}   total={sale} color="#8b5cf6" />
                  <ProfitBar label="Packaging + Labels" value={pkg}    total={sale} color="#a78bfa" />
                  <ProfitBar label="Import Duties"      value={dutyAmt} total={sale} color="#c4b5fd" />
                  <div className="flex items-center gap-3 text-xs border-t border-white/8 pt-2 mt-1">
                    <div className="w-36 text-white/55 font-semibold text-right shrink-0">= Landed Cost</div>
                    <div className="flex-1" />
                    <div className="w-16 font-mono font-bold text-indigo-600 text-right">{usdD(landed)}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/35 mt-3 mb-1">
                    <div className="w-36 text-right shrink-0">Sale Price</div>
                    <div className="flex-1" />
                    <div className="w-16 font-mono font-semibold text-white/55 text-right">{usdD(sale)}</div>
                  </div>
                  <ProfitBar label={`Referral (${refPct}%)`} value={refFee}  total={sale} color="#ef4444" />
                  <ProfitBar label="FBA / Fulfillment"        value={fbaFee}  total={sale} color="#f97316" />
                  <ProfitBar label="Est. Ad Spend (5%)"       value={adSpend} total={sale} color="#eab308" />
                  <ProfitBar label="Landed Cost"              value={landed}  total={sale} color="#6366f1" />
                </div>
              </div>
              {/* Net profit summary */}
              <div className="space-y-3">
                <div className={`card-dark p-5 ${trueNet > 0 ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-red-500/20 bg-red-500/10'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white/55">Net Profit / Unit</span>
                    <span className={`text-3xl font-bold ${trueNet > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {trueNet < 0 ? '-' : ''}{usdD(Math.abs(trueNet))}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs text-center py-3 border-t border-b border-white/8 mb-3">
                    <div>
                      <div className="text-white/35 mb-0.5">Net Margin</div>
                      <div className={`font-bold text-sm ${trueNet > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{pctD(netMargin)}</div>
                    </div>
                    <div>
                      <div className="text-white/35 mb-0.5">ROI</div>
                      <div className={`font-bold text-sm ${trueNet > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{roi.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-white/35 mb-0.5">Break-even</div>
                      <div className="font-bold text-sm text-white/80">{Math.min(breakeven, 999)} units</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-white/70 p-3 text-center">
                      <div className="text-white/35 mb-1">Monthly (50 units)</div>
                      <div className="font-bold text-white text-base">{usdD(Math.abs(monthly50), 0)}</div>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3 text-center">
                      <div className="text-white/35 mb-1">Annual projection</div>
                      <div className="font-bold text-white text-base">{usdD(Math.abs(annual50), 0)}</div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/35 px-1">Fees: {platform} standard · Shipping: India air freight estimate · Duties: destination avg · {currency}</p>
              </div>
            </div>
            {/* 3D animated waterfall (yy.PNG) */}
            <ProfitWaterfallChart3D
              sale={sale} src={src} ship={ship} pkg={pkg} dutyAmt={dutyAmt}
              refFee={refFee} fbaFee={fbaFee} adSpend={adSpend} trueNet={trueNet}
              netMargin={netMargin} roi={roi} breakeven={breakeven}
              monthly50={monthly50} platform={platform} currency={currency}
            />
            {/* Recharts waterfall + key metrics (Cap.PNG content) */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0a0e1e 0%, #0f172a 100%)' }}>
              <ProfitWaterfall profit={profitForChart} currency={currency} />
            </div>
          </div>
        );
      })()}

      {/* ── Competition ── */}
      {tab === 'Competition' && (
        <div className="card-dark p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-white">Competition Analysis</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="card-dark p-4">
              <div className="text-xs text-white/40 mb-1">Competition Score</div>
              <div className="text-2xl font-bold text-white">{Math.round(score.competition || 0)}/100</div>
              <div className="text-xs text-white/35 mt-1">Higher = less competition</div>
            </div>
            <div className="card-dark p-4">
              <div className="text-xs text-white/40 mb-1">Saturation Score</div>
              <div className="text-2xl font-bold text-white">{Math.round(score.saturation || 0)}/100</div>
              <div className="text-xs text-white/35 mt-1">Higher = less saturated</div>
            </div>
          </div>
          <div className="p-4 bg-blue-500/10 rounded-xl text-sm text-blue-200">
            Full competitor teardown available once marketplace connectors are configured.
          </div>
        </div>
      )}

      {/* ── Listing ── */}
      {tab === 'Listing' && (
        <div className="space-y-4">
          {listing ? (
            <>
              <div className="card-dark p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-white/35 uppercase tracking-widest">SEO Title</div>
                  <CopyButton text={listing.seoTitle || ''} />
                </div>
                <div className="font-semibold text-white">{listing.seoTitle}</div>
              </div>
              <div className="card-dark p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-white/35 uppercase tracking-widest">Bullets</div>
                  <CopyButton text={(JSON.parse(listing.bullets || '[]') as string[]).join('\n')} />
                </div>
                <ul className="space-y-2">
                  {(JSON.parse(listing.bullets || '[]') as string[]).map((b, i) => (
                    <li key={i} className="text-sm text-white/80 flex gap-2">
                      <span className="text-green-500 shrink-0">&#x2713;</span>{b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-dark p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-white/35 uppercase tracking-widest">Description</div>
                  <CopyButton text={listing.description || ''} />
                </div>
                <div className="text-sm text-white/80 leading-relaxed">{listing.description}</div>
              </div>
              {keywords && (
                <div className="card-dark p-4 sm:p-5">
                  <div className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-3">Keywords</div>
                  <div className="space-y-3">
                    {Object.entries(keywords as Record<string, any>).map(([k, vals]) => (
                      <div key={k}>
                        <div className="text-xs font-semibold text-white/40 capitalize mb-1.5">{k}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(vals) ? vals : []).map((kw: string, i: number) => (
                            <span key={i} className="text-xs bg-green-500/8 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">{kw}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card-dark p-8 sm:p-12 text-center">
              <div className="text-3xl mb-3">📝</div>
              <p className="text-white/40 text-sm">Click &ldquo;Generate Launch Assets&rdquo; to create listing copy</p>
            </div>
          )}
        </div>
      )}

      {/* ── Ads ── */}
      {tab === 'Ads' && (
        <div className="space-y-4">
          <div className="card-dark p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">Ad Campaign Generator</h2>
                <p className="text-xs text-white/40 mt-0.5">AI-crafted ad copy for Facebook, Instagram, YouTube &amp; Google</p>
              </div>
              <button onClick={() => genAds.mutate()} disabled={genAds.isPending}
                className="btn-primary text-sm disabled:opacity-50 whitespace-nowrap">
                {genAds.isPending ? '⟳ Generating…' : genAds.data ? '↻ Regenerate' : '✨ Generate Ads'}
              </button>
            </div>

            {!genAds.data && !genAds.isPending && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Facebook', 'Instagram', 'YouTube', 'Google'].map(p => (
                  <div key={p} className="card-dark p-4 text-center opacity-50">
                    <div className="text-2xl mb-1">
                      {p === 'Facebook' ? '🔵' : p === 'Instagram' ? '🟣' : p === 'YouTube' ? '🔴' : '🟢'}
                    </div>
                    <div className="text-sm font-medium text-white/55">{p}</div>
                  </div>
                ))}
              </div>
            )}

            {genAds.isPending && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin text-3xl text-green-400 mb-3">&#x27F3;</div>
                  <p className="text-sm text-white/40">Crafting your ad campaigns…</p>
                </div>
              </div>
            )}

            {genAds.data && (() => {
              const ads = genAds.data as any;
              return (
                <div className="space-y-4">
                  {/* Facebook */}
                  {ads.facebook && (
                    <div className="border border-blue-500/20 rounded-xl overflow-hidden">
                      <div className="bg-blue-500/10 px-4 py-2.5 flex items-center gap-2">
                        <span className="text-lg">🔵</span>
                        <span className="font-semibold text-blue-200 text-sm">Facebook</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-white/35 uppercase">Headline</span>
                            <CopyButton text={ads.facebook.headline} />
                          </div>
                          <p className="text-sm font-semibold text-white">{ads.facebook.headline}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-white/35 uppercase">Primary Text</span>
                            <CopyButton text={ads.facebook.primaryText} />
                          </div>
                          <p className="text-sm text-white/80 whitespace-pre-line">{ads.facebook.primaryText}</p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className="bg-blue-500/15 text-blue-300 px-2 py-1 rounded">CTA: {ads.facebook.cta}</span>
                          <span className="bg-white/8 text-white/55 px-2 py-1 rounded">{ads.facebook.dailyBudget}</span>
                        </div>
                        {ads.facebook.audience && (
                          <div className="bg-white/5 rounded-lg p-2.5 text-xs text-white/55">
                            <span className="font-semibold">Audience: </span>{ads.facebook.audience}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instagram */}
                  {ads.instagram && (
                    <div className="border border-purple-500/20 rounded-xl overflow-hidden">
                      <div className="bg-purple-500/10 px-4 py-2.5 flex items-center gap-2">
                        <span className="text-lg">🟣</span>
                        <span className="font-semibold text-purple-300 text-sm">Instagram</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-white/35 uppercase">Caption</span>
                            <CopyButton text={ads.instagram.caption} />
                          </div>
                          <p className="text-sm text-white/80">{ads.instagram.caption}</p>
                        </div>
                        {ads.instagram.reelHook && (
                          <div>
                            <div className="text-xs font-semibold text-white/35 uppercase mb-1">Reel Hook</div>
                            <p className="text-sm text-white/80 italic">{ads.instagram.reelHook}</p>
                          </div>
                        )}
                        {ads.instagram.hashtags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {ads.instagram.hashtags.map((tag: string, i: number) => (
                              <span key={i} className="text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* YouTube */}
                  {ads.youtube && (
                    <div className="border border-red-500/20 rounded-xl overflow-hidden">
                      <div className="bg-red-500/10 px-4 py-2.5 flex items-center gap-2">
                        <span className="text-lg">🔴</span>
                        <span className="font-semibold text-red-300 text-sm">YouTube</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {ads.youtube.title && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-white/35 uppercase">Video Title</span>
                              <CopyButton text={ads.youtube.title} />
                            </div>
                            <p className="text-sm font-semibold text-white">{ads.youtube.title}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[['Hook (0–5s)', ads.youtube.hook], ['Body', ads.youtube.body], ['CTA', ads.youtube.cta]].map(([label, text]) => text && (
                            <div key={label as string} className="bg-white/5 rounded-lg p-2.5">
                              <div className="text-xs font-semibold text-white/35 uppercase mb-1">{label as string}</div>
                              <p className="text-xs text-white/80">{text as string}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Google */}
                  {ads.google && (
                    <div className="border border-green-500/20 rounded-xl overflow-hidden">
                      <div className="bg-green-500/8 px-4 py-2.5 flex items-center gap-2">
                        <span className="text-lg">🟢</span>
                        <span className="font-semibold text-green-400 text-sm">Google Shopping / Search</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[ads.google.headline1, ads.google.headline2, ads.google.headline3].filter(Boolean).map((h: string, i) => (
                            <div key={i} className="bg-white/5 rounded p-2">
                              <div className="text-xs text-white/35 mb-0.5">H{i + 1}</div>
                              <p className="text-sm font-semibold text-white">{h}</p>
                            </div>
                          ))}
                        </div>
                        {ads.google.keywords?.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-white/35 uppercase mb-1.5">Target Keywords</div>
                            <div className="flex flex-wrap gap-1.5">
                              {ads.google.keywords.map((kw: string, i: number) => (
                                <span key={i} className="text-xs bg-green-500/8 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {ads.tips?.length > 0 && (
                    <div className="card-dark p-4 bg-amber-500/10 border-amber-500/20">
                      <div className="text-xs font-semibold text-amber-300 uppercase mb-2">Pro Tips</div>
                      <ul className="space-y-1.5">
                        {ads.tips.map((tip: string, i: number) => (
                          <li key={i} className="text-sm text-white/80 flex gap-2">
                            <span className="text-amber-500 shrink-0">&#x2022;</span>{tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Growth ── */}
      {tab === 'Growth' && (
        <div className="space-y-4">
          <div className="card-dark p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">Growth Playbook</h2>
                <p className="text-xs text-white/40 mt-0.5">Personalized strategy for this product &amp; marketplace</p>
              </div>
              <button onClick={() => genGrowth.mutate()} disabled={genGrowth.isPending}
                className="btn-primary text-sm disabled:opacity-50 whitespace-nowrap">
                {genGrowth.isPending ? '⟳ Generating…' : genGrowth.data ? '↻ Refresh' : '🚀 Build Playbook'}
              </button>
            </div>

            {!genGrowth.data && !genGrowth.isPending && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-50">
                {['Quick Wins', 'Listing Optimization', 'Pricing Strategy', 'Review Strategy', 'Launch Sequence', 'PPC Plan'].map(s => (
                  <div key={s} className="card-dark p-3 text-center text-sm text-white/40">{s}</div>
                ))}
              </div>
            )}

            {genGrowth.isPending && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin text-3xl text-green-400 mb-3">&#x27F3;</div>
                  <p className="text-sm text-white/40">Building your growth playbook…</p>
                </div>
              </div>
            )}

            {genGrowth.data && (() => {
              const g = genGrowth.data as any;
              return (
                <div className="space-y-5">
                  {/* Quick Wins */}
                  {g.quickWins?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">⚡ Quick Wins</div>
                      <ul className="space-y-2">
                        {g.quickWins.map((w: string, i: number) => (
                          <li key={i} className="text-sm text-white/80 flex gap-2 p-2.5 rounded-lg bg-green-500/8">
                            <span className="text-green-400 font-bold shrink-0">{i + 1}.</span>{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Listing Optimization */}
                  {g.listingOptimization && (
                    <div>
                      <div className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">📝 Listing Optimization</div>
                      <div className="space-y-3">
                        {g.listingOptimization.title && (
                          <div className="card-dark p-3">
                            <div className="text-xs text-white/40 font-semibold mb-1">Title Formula</div>
                            <p className="text-sm text-white/80">{g.listingOptimization.title}</p>
                          </div>
                        )}
                        {g.listingOptimization.bullets?.length > 0 && (
                          <div className="card-dark p-3">
                            <div className="text-xs text-white/40 font-semibold mb-2">Bullet Framework</div>
                            <ul className="space-y-1">
                              {g.listingOptimization.bullets.map((b: string, i: number) => (
                                <li key={i} className="text-sm text-white/80 flex gap-2">
                                  <span className="text-green-500 shrink-0">&#x2713;</span>{b}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {g.listingOptimization.images?.length > 0 && (
                          <div className="card-dark p-3">
                            <div className="text-xs text-white/40 font-semibold mb-2">Image Strategy</div>
                            <ul className="space-y-1">
                              {g.listingOptimization.images.map((img: string, i: number) => (
                                <li key={i} className="text-sm text-white/80 flex gap-2">
                                  <span className="text-blue-500 shrink-0">🖼</span>{img}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {g.listingOptimization.video && (
                          <div className="bg-amber-500/10 rounded-lg p-3 text-sm text-amber-800">
                            <span className="font-semibold">Video: </span>{g.listingOptimization.video}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pricing */}
                  {g.pricingStrategy && (
                    <div>
                      <div className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">💰 Pricing Strategy</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(g.pricingStrategy as Record<string, string>).map(([key, val]) => (
                          <div key={key} className="card-dark p-3">
                            <div className="text-xs text-white/35 capitalize mb-1">{key}</div>
                            <p className="text-sm text-white/80">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Launch Sequence */}
                  {g.launchSequence?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">🗓 Launch Sequence</div>
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
                        <div className="space-y-3">
                          {g.launchSequence.map((step: any, i: number) => (
                            <div key={i} className="flex gap-4 pl-10 relative">
                              <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0a0e1e] shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                              <div className="card-dark p-3 flex-1">
                                <div className="text-xs font-bold text-green-400 mb-0.5">{step.week}</div>
                                <p className="text-sm text-white/80">{step.action}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PPC */}
                  {g.ppcStrategy && (
                    <div>
                      <div className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">📢 PPC Strategy</div>
                      <div className="card-dark p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-white/80">Budget:</span>
                          <span className="text-green-400 font-medium">{g.ppcStrategy.budget}</span>
                        </div>
                        {g.ppcStrategy.acos && (
                          <p className="text-sm text-white/55">{g.ppcStrategy.acos}</p>
                        )}
                        {g.ppcStrategy.campaigns?.length > 0 && (
                          <ul className="space-y-1">
                            {g.ppcStrategy.campaigns.map((c: string, i: number) => (
                              <li key={i} className="text-sm text-white/80 flex gap-2">
                                <span className="text-green-500 shrink-0">&#x2713;</span>{c}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Monthly Milestones */}
                  {g.monthlyMilestones?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">🎯 Monthly Milestones</div>
                      <div className="grid grid-cols-2 gap-2">
                        {g.monthlyMilestones.map((m: any) => (
                          <div key={m.month} className="card-dark p-3">
                            <div className="text-xs font-bold text-green-400 mb-1">Month {m.month}</div>
                            <p className="text-xs text-white/55">{m.goal}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Strategy */}
                  {g.reviewStrategy?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">⭐ Review Strategy</div>
                      <ul className="space-y-2">
                        {g.reviewStrategy.map((tip: string, i: number) => (
                          <li key={i} className="text-sm text-white/80 flex gap-2">
                            <span className="text-amber-400 shrink-0">★</span>{tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Recommendation ── */}
      {tab === 'Recommendation' && (
        <div className="card-dark p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6">
            <ScoreGauge score={score.opportunity || 0} size="lg" label="Opportunity Score" />
            <div>
              <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence)} />
              <p className="text-sm text-white/55 mt-3 leading-relaxed">
                {opp.recommendation === 'launch'
                  ? 'Strong opportunity — all key metrics exceed thresholds. Recommended to proceed with launch.'
                  : opp.recommendation === 'hold'
                  ? 'Promising opportunity — some metrics need improvement. Monitor and revisit.'
                  : 'Low opportunity — does not meet minimum criteria for cross-border profitability.'}
              </p>
            </div>
          </div>
          <div className="border-t border-white/8 pt-4">
            <div className="text-sm font-medium text-white/80 mb-3">Score Breakdown</div>
            <div className="space-y-2.5">
              {sub.map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-white/40 text-right shrink-0">{label}</div>
                  <div className="flex-1 bg-white/8 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{
                      width: `${value || 0}%`,
                      backgroundColor: (value || 0) >= 70 ? '#16a34a' : (value || 0) >= 40 ? '#d97706' : '#dc2626',
                    }} />
                  </div>
                  <div className="w-8 text-xs font-bold text-white/80 shrink-0">{Math.round(value || 0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Report ── */}
      {tab === 'Report' && (
        <div className="card-dark p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Opportunity Report</h2>
            <button onClick={() => genReport.mutate()}
              disabled={genReport.isPending}
              className="btn-primary text-sm disabled:opacity-50">
              {genReport.isPending ? '&#x27F3; Generating…' : '📄 Generate Report'}
            </button>
          </div>
          {genReport.data ? (
            <div className="space-y-3">
              {Object.entries(((genReport.data as any).content || {}) as Record<string, any>).map(([key, val]) => (
                <div key={key}>
                  <div className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-1.5">{key.replace(/_/g, ' ')}</div>
                  {typeof val === 'string' ? (
                    <p className="text-sm text-white/80 leading-relaxed">{val}</p>
                  ) : Array.isArray(val) ? (
                    <ul className="space-y-1">{(val as any[]).map((v, i) => (
                      <li key={i} className="text-sm text-white/80 flex gap-2"><span className="text-green-500 shrink-0">&#x2022;</span>{String(v)}</li>
                    ))}</ul>
                  ) : (
                    <p className="text-sm text-white/80">{JSON.stringify(val)}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-white/35">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm">Generate a full opportunity report with all data</p>
            </div>
          )}
        </div>
      )}
      <SupplierProfileDrawer
        supplierId={drawerSupplier}
        open={!!drawerSupplier}
        onClose={() => setDrawerSupplier(null)}
        context={{ productTitle: opp.product?.title, opportunityId: id }}
      />
    </div>
  );
}
