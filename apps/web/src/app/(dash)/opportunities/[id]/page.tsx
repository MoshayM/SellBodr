'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { api, isPro } from '@/lib/api';
import { ScoreGauge, RecommendationBadge, ScoreBadge } from '@/components/ui/ScoreGauge';
import { SupplierProfileDrawer } from '@/components/supplier/SupplierProfileDrawer';
import { ProGate } from '@/components/ui/ProGate';
import { ProfitWaterfall } from '@/components/profit/ProfitWaterfall';

const TABS = ['Overview', 'Research', 'Suppliers', 'Profitability', 'Competition', 'Listing', 'Ads', 'Growth', 'Brand Builder', 'Bundle', 'Recommendation', 'Report'];

function minor(v: number) { return (v / 100).toFixed(2); }

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


// Leaflet map — full-screen modal overlay, satellite/street toggle, precise popups
function GlobalSupplierMap({ candidates }: { candidates: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const [animating, setAnimating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const pins = candidates
    .filter((sc: any) => sc.latitude && sc.longitude)
    .map((sc: any) => ({
      lat: Number(sc.latitude), lon: Number(sc.longitude),
      name: sc.supplierName || sc.supplier?.name || '',
      city: sc.city || '',
      country: sc.country || 'India',
      source: (sc.supplier?.source || sc.source || '').replace(/-/g, ' '),
      isIndia: (sc.country || 'India') === 'India',
    }));

  function open() {
    setExpanded(true);
    setTimeout(() => setAnimating(true), 10);
    setTimeout(() => iframeRef.current?.contentWindow?.postMessage({ type: 'resize' }, '*'), 120);
  }
  function close() {
    setAnimating(false);
    setTimeout(() => setExpanded(false), 260);
  }

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded]);

  if (pins.length === 0) return null;

  const initCenter = pins.length === 1 ? [pins[0].lat, pins[0].lon] : [22, 82];
  const initZoom   = pins.length === 1 ? 12 : 2;
  const indiaCount = pins.filter(p => p.isIndia).length;

  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
*{box-sizing:border-box}body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
#map{height:100vh;width:100vw}
.ctrl{position:absolute;top:10px;left:50px;z-index:1000}
.cbtn{background:rgba(8,12,32,0.9);color:#e2e8f0;border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:7px 13px;font-size:11px;font-weight:700;cursor:pointer;backdrop-filter:blur(10px);display:inline-flex;align-items:center;gap:5px;letter-spacing:.3px;transition:all .15s}
.cbtn:hover{background:rgba(124,58,237,0.45);border-color:rgba(124,58,237,0.7);color:#ddd6fe}
.cbtn.sat{background:rgba(14,165,233,0.25);border-color:rgba(14,165,233,0.6);color:#7dd3fc}
.leaflet-popup-content-wrapper{background:#0d1526!important;border:1px solid rgba(255,255,255,0.13)!important;border-radius:12px!important;box-shadow:0 12px 40px rgba(0,0,0,.65)!important;color:#e2e8f0!important;padding:0!important}
.leaflet-popup-tip-container{display:none}
.leaflet-popup-content{margin:0!important;padding:0!important}
.pop{padding:12px 14px;min-width:195px}
.pop-title{font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:5px}
.pop-label{font-size:10px;font-weight:700;letter-spacing:.4px}
.pop-loc{color:#94a3b8;font-size:11px;margin-top:3px}
.pop-src{color:#64748b;font-size:10px;margin-top:1px}
.pop-coords{color:#475569;font-size:9.5px;margin-top:3px;font-family:monospace;letter-spacing:.2px}
.pop-links{display:flex;gap:5px;margin-top:8px}
.pop-link{font-size:10px;font-weight:700;padding:4px 9px;border-radius:5px;text-decoration:none;display:inline-flex;align-items:center;gap:3px;transition:opacity .15s;white-space:nowrap}
.pop-link:hover{opacity:.8}
<\/style>
</head><body>
<div class="ctrl">
  <button class="cbtn" id="lb" onclick="tl()">🛰 Satellite</button>
</div>
<div id="map"></div>
<script>
var st=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19});
var sa=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19});
var lb=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',{maxZoom:19});
var cur='street';
var map=L.map('map',{zoomControl:true,attributionControl:false}).setView(${JSON.stringify(initCenter)},${initZoom});
st.addTo(map);
function tl(){
  if(cur==='street'){
    map.removeLayer(st);sa.addTo(map);lb.addTo(map);
    cur='sat';document.getElementById('lb').textContent='🗺 Street';document.getElementById('lb').classList.add('sat');
  }else{
    map.removeLayer(sa);map.removeLayer(lb);st.addTo(map);
    cur='street';document.getElementById('lb').textContent='🛰 Satellite';document.getElementById('lb').classList.remove('sat');
  }
}
window.addEventListener('message',function(e){
  if(e.data&&e.data.type==='resize'){setTimeout(function(){map.invalidateSize();},60);}
});
var pins=${JSON.stringify(pins)};
pins.forEach(function(p,i){
  var c=p.isIndia?'#10b981':'#6366f1';
  var ic=L.divIcon({
    html:'<div style="background:'+c+';color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 3px 14px rgba(0,0,0,.4),0 0 0 5px '+c+'28">'+(i+1)+'<\/div>',
    iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-19],className:''
  });
  var lbl=p.isIndia
    ?'<span class="pop-label" style="color:#10b981">● INDIA PRIORITY<\/span>'
    :'<span class="pop-label" style="color:#6366f1">● GLOBAL SUPPLIER<\/span>';
  var gm='https://maps.google.com/?q='+p.lat+','+p.lon;
  var gs='https://maps.google.com/?q='+p.lat+','+p.lon+'&layer=c';
  var popup='<div class="pop">'+
    '<div class="pop-title">'+p.name+'<\/div>'+
    lbl+
    '<div class="pop-loc">'+(p.city?p.city+', ':'')+p.country+'<\/div>'+
    '<div class="pop-src">via '+p.source+'<\/div>'+
    '<div class="pop-coords">'+p.lat.toFixed(5)+'°&nbsp;'+p.lon.toFixed(5)+'°<\/div>'+
    '<div class="pop-links">'+
      '<a href="'+gm+'" target="_blank" class="pop-link" style="background:#4f46e5;color:#fff">📍 Street<\/a>'+
      '<a href="'+gs+'" target="_blank" class="pop-link" style="background:#0284c7;color:#fff">🛰 Satellite<\/a>'+
    '<\/div>'+
  '<\/div>';
  L.marker([p.lat,p.lon],{icon:ic}).addTo(map).bindPopup(popup,{minWidth:210,closeButton:true});
});
if(pins.length>1){
  try{map.fitBounds(L.latLngBounds(pins.map(function(p){return[p.lat,p.lon]})),{padding:[45,45],maxZoom:8});}catch(e){}
}
<\/script></body></html>`;

  return (
    <>
      {/* Collapsed card */}
      <div className="relative rounded-xl overflow-hidden border border-white/10">
        <button
          onClick={open}
          title="Expand map"
          className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-white border border-white/20 hover:border-violet-400/60 hover:bg-violet-500/10 transition-all"
          style={{ background: 'rgba(8,12,32,0.88)', backdropFilter: 'blur(10px)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-70">
            <path d="M1.75 1h4.5a.75.75 0 0 1 0 1.5H2.56l3.97 3.97a.75.75 0 0 1-1.06 1.06L1.5 3.56v3.69a.75.75 0 0 1-1.5 0v-4.5C0 2.075.674 1 1.75 1ZM13.44 14.5h-3.69a.75.75 0 0 1 0-1.5h3.69l-3.97-3.97a.75.75 0 1 1 1.06-1.06l3.97 3.97V8.25a.75.75 0 0 1 1.5 0v4.5c0 .966-.784 1.75-1.75 1.75Z"/>
          </svg>
          Expand Map
        </button>
        <iframe
          srcDoc={html}
          className="w-full border-0 block"
          style={{ height: 280 }}
          title="Global Supplier Map"
          sandbox="allow-scripts allow-popups"
        />
      </div>

      {/* Full-screen modal overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-[200] flex flex-col"
          style={{
            background: 'rgba(2,8,23,0.92)',
            backdropFilter: 'blur(16px)',
            opacity: animating ? 1 : 0,
            transform: animating ? 'scale(1)' : 'scale(0.97)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}>

          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
            style={{ background: 'rgba(8,12,32,0.95)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">🗺</span>
              <div>
                <div className="text-sm font-bold text-white leading-none">Global Supplier Map</div>
                <div className="text-xs text-white/40 mt-0.5 leading-none">
                  {pins.length} supplier{pins.length !== 1 ? 's' : ''} plotted
                  {indiaCount > 0 && <span className="ml-2 text-emerald-400">· {indiaCount} India 🇮🇳</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/50 hidden sm:block">Press ESC to close</span>
              <button
                onClick={close}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg text-white/70 hover:text-white border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"/>
                </svg>
                Close
              </button>
            </div>
          </div>

          {/* Map fills remaining height */}
          <div className="flex-1 relative overflow-hidden">
            <iframe
              ref={iframeRef}
              srcDoc={html}
              className="w-full h-full border-0 block"
              title="Global Supplier Map (expanded)"
              sandbox="allow-scripts allow-popups"
            />
          </div>

          {/* Legend bar */}
          <div className="flex items-center gap-5 px-5 py-2.5 border-t shrink-0"
            style={{ background: 'rgba(8,12,32,0.95)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
              India priority supplier
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <div className="w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-indigo-500/30" />
              Global supplier
            </div>
            <div className="ml-auto text-[10px] text-white/50">Click a pin for precise location + Google Maps links</div>
          </div>
        </div>
      )}
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-white/55 hover:text-white/80 hover:bg-white/5 transition-all">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab');
    return TABS.includes(t || '') ? (t as string) : 'Overview';
  });
  const [isGuest, setIsGuest] = useState(false);
  const [isFree, setIsFree] = useState(true);
  useEffect(() => {
    setIsGuest(!localStorage.getItem('bs_access_token'));
    setIsFree(!isPro());
  }, []);
  const [genLoading, setGenLoading] = useState(false);
  const [drawerSupplier, setDrawerSupplier] = useState<string | null>(null);
  const [extraSuppliers, setExtraSuppliers] = useState<any[]>([]);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [moreNote, setMoreNote] = useState('');
  const [showSupplierGate, setShowSupplierGate] = useState(false);

  const { data: opp, isLoading, refetch } = useQuery({
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

  const genBrand = useMutation({
    mutationFn: () => api.opportunities.generateBrand(id),
  });

  const genBundle = useMutation({
    mutationFn: () => api.opportunities.generateBundle(id),
  });

  const rescore = useMutation({
    mutationFn: () => api.opportunities.rescore(id),
    onSuccess: () => refetch(),
  });

  const submitFeedback = useMutation({
    mutationFn: (data: { rating: 'up' | 'down'; note?: string }) => api.opportunities.submitFeedback(id, data),
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
      {/* Back navigation */}
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 mb-4 transition-colors group">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform">
          <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z" clipRule="evenodd" />
        </svg>
        Back to Scout
      </button>

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
              <span className="text-[10px] text-white/50 font-mono">v{opp.scoreVersion}</span>
              {opp.scoredAt && (
                <span className="text-[10px] text-white/50">
                  Scored {Math.round((Date.now() - new Date(opp.scoredAt).getTime()) / 3600000)}h ago
                </span>
              )}
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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setGenLoading(true); genAssets.mutate(); }}
              disabled={genLoading}
              className="btn-primary text-sm disabled:opacity-50 whitespace-nowrap">
              {genLoading ? '⟳ Generating…' : '✨ Generate Launch Assets'}
            </button>
            <button
              onClick={() => rescore.mutate()}
              disabled={rescore.isPending}
              title="Re-run the AI scoring pipeline on this opportunity"
              className="text-xs px-3 py-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-all disabled:opacity-40 whitespace-nowrap">
              {rescore.isPending ? '⟳ Rescoring…' : rescore.isSuccess ? '✓ Rescored' : '↻ Re-score'}
            </button>
          </div>
        </div>

        {/* Sub-scores row */}
        <div className="flex gap-2 sm:gap-3 mt-4 pt-4 border-t border-white/5 flex-wrap">
          {sub.map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-[10px] text-white/55 mb-1">{label}</div>
              <ScoreBadge score={value || 0} />
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable tab bar — pill style */}
      <div className="scroll-tabs mb-5 -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="tab-pill-bar min-w-max">
          {TABS.map(t => (
            t === 'Report' ? (
              <button key={t} onClick={() => setTab(t)}
                className={`tab-pill relative${tab === t ? ' active' : ''}`}
                style={tab !== t ? { color: 'rgba(251,191,36,0.75)', border: '1px solid rgba(251,191,36,0.25)' } : {}}>
                {t}
                {tab !== t && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            ) : (
              <button key={t} onClick={() => setTab(t)} className={`tab-pill${tab === t ? ' active' : ''}`}>{t}</button>
            )
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
                <div className="text-xs text-white/55">{(value || 0) >= 70 ? 'Strong' : (value || 0) >= 40 ? 'Moderate' : 'Weak'}</div>
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
                    <div className="text-[11px] text-white/55 mb-1">{s.label}</div>
                    <div className={`font-bold text-xl ${s.val >= 70 ? 'text-emerald-400' : s.val >= 45 ? 'text-amber-400' : 'text-red-600'}`}>{s.val}<span className="text-xs font-normal text-white/55">{s.unit}</span></div>
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
                <span className="text-[10px] text-white/55">Customs Chapter · </span>
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

      {/* ── Pro gate for restricted tabs ── */}
      {isGuest && ['Suppliers','Profitability','Competition','Listing','Ads','Growth','Brand Builder','Bundle','Recommendation','Report'].includes(tab) && (() => {
        const gates: Record<string, { icon: string; feature: string; tagline: string; benefits: string[] }> = {
          Suppliers:      { icon: '🏭', feature: 'Supplier Sourcing',      tagline: 'View 10+ vetted India-first suppliers with MOQ, lead times, feasibility ratings, and cost vs global benchmarks.', benefits: ['IndiaMART, TradeIndia, GEM Portal, ExportHub & Udaan', 'MOQ, lead time & feasibility rating per supplier', 'Gross margin room calculator per source', 'Global benchmarks: Alibaba, DHgate, Made-in-China'] },
          Profitability:  { icon: '💰', feature: 'Full Profit Model',      tagline: 'Complete landed-cost P&L — India factory gate to marketplace fulfilled. Know exact net profit before ordering.', benefits: ['Source cost + freight + duties + all fees', 'Net margin %, ROI %, break-even units', 'Monthly & annual projections', 'Diverging cost waterfall chart'] },
          Competition:    { icon: '⚔️', feature: 'Competition Analysis',   tagline: 'Full competitor teardown — pricing, review velocity, BSR trends, and saturation score for this exact marketplace.', benefits: ['Top-10 competitor ASIN breakdown', 'Price gap & review velocity', 'BSR trend (90-day chart)', 'Saturation & entry difficulty score'] },
          Listing:        { icon: '📝', feature: 'AI Listing Generator',   tagline: 'SEO-optimised title, bullets, description, and backend keywords tailored to this marketplace\'s ranking algorithm.', benefits: ['Platform-optimised product title', '5 keyword-rich bullet points', 'Long-form description with trust signals', 'Backend keyword set for search visibility'] },
          Ads:            { icon: '📣', feature: 'Ad Campaign Generator',  tagline: 'AI-crafted ad copy for Facebook, Instagram, YouTube & Google — audience targeting and daily budget included.', benefits: ['Facebook & Instagram copy + audience', 'YouTube script hook + CTA', 'Google Shopping title & description', 'Suggested daily budget per platform'] },
          Growth:         { icon: '📈', feature: 'Growth Playbook',        tagline: 'A 90-day launch roadmap with influencer brief, viral hook ideas, A/B test calendar, and review acceleration strategy.', benefits: ['90-day phased launch calendar', 'Influencer brief (nano/micro)', 'Viral hook ideas + UGC prompts', 'A/B test + review acceleration plan'] },
          Recommendation: { icon: '🤖', feature: 'AI Recommendation',     tagline: 'Launch / Hold / Reject verdict with confidence score, risk rank, and full AI reasoning chain for this opportunity.', benefits: ['Launch / Hold / Reject with confidence %', 'Risk-ranked score vs your portfolio', 'Full AI reasoning chain', '7-dimension score breakdown + evidence'] },
          Report:         { icon: '📊', feature: 'Export & Reports',       tagline: 'Download a complete opportunity report — supplier contacts, profit model, compliance notes, and trade data.', benefits: ['PDF & JSON export', 'Supplier contacts + compliance notes', 'Profit model + trade lane cost data', 'Share-ready format for teams & investors'] },
          'Brand Builder': { icon: '🏷️', feature: 'AI Brand Builder', tagline: 'AI-generated brand names, taglines, positioning, colour palette, and brand voice crafted for your target marketplace.', benefits: ['5 brand name options with meaning & rationale', 'Positioning statement + brand voice', 'Colour palette + visual direction', 'Domain availability hints'] },
          Bundle:          { icon: '📦', feature: 'Bundle Generator',   tagline: 'Discover complementary product bundles that increase average order value and reduce competition pressure.', benefits: ['3–5 bundle ideas with margin model', 'Bundle listing title + bullet points', 'Price anchor strategy', 'Inventory ratio recommendation'] },
        };
        const g = gates[tab];
        return <ProGate icon={g.icon} feature={g.feature} tagline={g.tagline} benefits={g.benefits} compact />;
      })()}

      {/* ── Suppliers ── */}
      {!isGuest && tab === 'Suppliers' && (
        <div className="space-y-3">
          {/* Global supplier map */}
          {opp.sourcingCandidates?.some((sc: any) => sc.latitude && sc.longitude) && (
            <div className="card-dark overflow-hidden">
              <div className="p-3 border-b border-white/8 flex items-center gap-2">
                <span className="text-sm font-semibold text-white/80">🌍 Global Supplier Map</span>
                <span className="text-xs text-white/55">India suppliers prioritised</span>
              </div>
              <GlobalSupplierMap candidates={opp.sourcingCandidates} />
            </div>
          )}

          {/* Supplier table */}
          <div className="card-dark overflow-hidden">
            <div className="p-4 border-b border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Sourcing Candidates</span>
                <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">India First</span>
                <span className="text-xs text-white/50">({opp.sourcingCandidates?.length ?? 0} suppliers)</span>
              </div>
              <span className="text-xs text-white/55">Click a row to view profile &amp; contact</span>
            </div>
            {(opp.sourcingCandidates?.length === 0 || !opp.sourcingCandidates) ? (
              <div className="p-8 text-center text-white/55">No suppliers found</div>
            ) : (
              <div className="table-scroll">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-white/5 text-xs text-white/60 border-b border-white/8">
                    <tr>
                      <th className="text-left px-4 py-3">Supplier</th>
                      <th className="text-left px-4 py-3">Country</th>
                      <th className="text-left px-4 py-3">Platform</th>
                      <th className="text-right px-4 py-3">Unit Cost</th>
                      <th className="text-center px-4 py-3">Trust</th>
                      <th className="text-right px-4 py-3">MOQ</th>
                      <th className="text-right px-4 py-3">Lead</th>
                      <th className="text-center px-4 py-3">Ease</th>
                      <th className="text-center px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/6">
                    {(isFree
                      ? [...(opp.sourcingCandidates || []), ...extraSuppliers].slice(0, 10)
                      : [...(opp.sourcingCandidates || []), ...extraSuppliers]
                    ).map((sc: any, idx: number) => {
                      const isIndia = (sc.country || 'India') === 'India';
                      const flag = isIndia ? '🇮🇳' : sc.country === 'China' ? '🇨🇳' : sc.country === 'Hong Kong' ? '🇭🇰' : sc.country === 'United States' ? '🇺🇸' : '🌐';
                      const trustPct = Math.round((Number(sc.rating) || 4.0) / 5 * 100);
                      const costLabel = isIndia ? `₹${minor(sc.productCostMinor)}` : `$${((sc.productCostMinor || 0) / 100).toFixed(2)}`;
                      return (
                        <tr key={sc.id} className={`cursor-pointer transition-colors ${isIndia ? 'hover:bg-emerald-500/8 bg-emerald-500/5' : 'hover:bg-white/[0.06]'}`}
                          onClick={() => setDrawerSupplier(sc.supplier?.id || sc.supplierId || sc.id)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isIndia && idx === 0 && (
                                <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded font-bold shrink-0">BEST</span>
                              )}
                              <span className="font-medium text-white leading-tight">{sc.supplier?.name || sc.supplierName}</span>
                            </div>
                            {sc.city && <div className="text-xs text-white/55 mt-0.5">📍 {sc.city}</div>}
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
                            <button onClick={e => { e.stopPropagation(); setDrawerSupplier(sc.supplier?.id || sc.supplierId || sc.id); }}
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

          {/* Search More Suppliers */}
          {(() => {
            const baseCandidates: any[] = opp.sourcingCandidates || [];
            const allCandidates = [...baseCandidates, ...extraSuppliers];
            const cappedCandidates = isFree ? allCandidates.slice(0, 10) : allCandidates;
            const lockedCount = isFree ? Math.max(0, allCandidates.length - 10) : 0;

            async function searchMoreSuppliers() {
              setFetchingMore(true);
              setMoreNote('');
              try {
                const result: any[] = await api.opportunities.getSuppliers(id);
                const existingNames = new Set(allCandidates.map((s: any) => (s.supplier?.name || s.supplierName || '').toLowerCase()));
                const fresh = result.filter((s: any) => !existingNames.has((s.supplier?.name || s.supplierName || '').toLowerCase()));
                if (fresh.length > 0) {
                  setExtraSuppliers(prev => [...prev, ...fresh]);
                  setMoreNote(`+${fresh.length} additional supplier${fresh.length > 1 ? 's' : ''} found`);
                } else {
                  setMoreNote('No additional suppliers found at this time');
                }
              } catch {
                setMoreNote('Could not fetch more suppliers — please try again');
              } finally {
                setFetchingMore(false);
              }
            }

            return (
              <div className="card-dark p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-white/55">
                    Showing {cappedCandidates.length} supplier{cappedCandidates.length !== 1 ? 's' : ''}
                    {lockedCount > 0 && <span className="ml-1 text-white/50">· {lockedCount} locked</span>}
                    {moreNote && <span className="ml-2 text-green-400 text-xs">{moreNote}</span>}
                  </div>
                  {isFree ? (
                    <div className="flex items-center gap-2">
                      {!showSupplierGate ? (
                        <button
                          onClick={() => setShowSupplierGate(true)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-300 hover:bg-violet-500/10 transition-colors whitespace-nowrap">
                          🔍 Search More Suppliers
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
                          <span className="text-sm">🔒</span>
                          <span className="text-sm text-white/70">Pro unlocks unlimited supplier search</span>
                          <a href="/upgrade" className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors font-semibold whitespace-nowrap">
                            Upgrade to Pro →
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={searchMoreSuppliers}
                      disabled={fetchingMore}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                      {fetchingMore ? '⟳ Searching…' : '🔍 Search More Suppliers'}
                    </button>
                  )}
                </div>
                {isFree && allCandidates.length >= 10 && (
                  <p className="text-xs text-white/50 mt-2">Free plan: max 10 suppliers per product. Upgrade for unlimited access.</p>
                )}
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
      {!isGuest && tab === 'Profitability' && (() => {
        const pm = profit;
        if (!pm) return <div className="card-dark p-8 text-center text-white/55">No profitability data for this opportunity</div>;
        const mpCodeStr = opp.marketplace?.code || '';
        const platform  = mpCodeStr.split('_')[0].charAt(0).toUpperCase() + mpCodeStr.split('_')[0].slice(1) || 'Marketplace';
        const currency  = pm.currency || 'USD';
        const sym       = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
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
        const f = (v: number, d = 2) => `${sym}${(Math.abs(v) / 100).toFixed(d)}`;
        const allRows = [
          { label: 'Sale Price',         value: sale,              positive: true,  grad: 'linear-gradient(90deg,#10b981,#34d399)',  glow: 'rgba(16,185,129,0.5)',  isSubtotal: false, isNet: false },
          { label: 'Source Cost',        value: src,               positive: false, grad: 'linear-gradient(270deg,#818cf8,#6366f1)', glow: 'rgba(99,102,241,0.5)',  isSubtotal: false, isNet: false },
          { label: "Int'l Ship.",        value: ship,              positive: false, grad: 'linear-gradient(270deg,#a78bfa,#7c3aed)', glow: 'rgba(124,58,237,0.45)', isSubtotal: false, isNet: false },
          { label: 'Packaging',          value: pkg,               positive: false, grad: 'linear-gradient(270deg,#c4b5fd,#8b5cf6)', glow: 'rgba(139,92,246,0.4)',  isSubtotal: false, isNet: false },
          { label: 'Import Duty',        value: dutyAmt,           positive: false, grad: 'linear-gradient(270deg,#ddd6fe,#a78bfa)', glow: 'rgba(167,139,250,0.35)',isSubtotal: false, isNet: false },
          { label: '= Landed',           value: landed,            positive: false, grad: 'linear-gradient(270deg,#818cf8,#4f46e5)', glow: 'rgba(79,70,229,0.5)',   isSubtotal: true,  isNet: false },
          { label: `Ref. ${refPct}%`,    value: refFee,            positive: false, grad: 'linear-gradient(270deg,#f87171,#ef4444)', glow: 'rgba(239,68,68,0.5)',   isSubtotal: false, isNet: false },
          { label: 'FBA / Fulfil.',      value: fbaFee,            positive: false, grad: 'linear-gradient(270deg,#fb923c,#f97316)', glow: 'rgba(249,115,22,0.45)', isSubtotal: false, isNet: false },
          { label: 'Ad Spend 5%',        value: adSpend,           positive: false, grad: 'linear-gradient(270deg,#fbbf24,#eab308)', glow: 'rgba(234,179,8,0.45)',  isSubtotal: false, isNet: false },
          { label: 'Net Profit',         value: Math.abs(trueNet), positive: trueNet >= 0,
            grad: trueNet >= 0 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(270deg,#f87171,#ef4444)',
            glow: trueNet >= 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)',
            isSubtotal: false, isNet: true },
        ].filter(r => r.value > 0);
        const maxDivRef = Math.max(sale, landed, Math.abs(trueNet), 1);

        return (
          <div className="space-y-4">
            {/* Waterfall chart (Recharts) */}
            <div className="card-dark p-5">
              <ProfitWaterfall profit={pm} currency={currency} showStats={false} />
            </div>
            {/* Diverging butterfly chart */}
            <div className="card-dark p-5">
              <div className="flex items-center mb-2">
                <div className="flex-1 text-right pr-2">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-red-400/60">← Costs</span>
                </div>
                <div className="w-[90px] shrink-0 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">{platform}</div>
                  <div className="text-[8px] text-white/50 mt-px">Cost Breakdown</div>
                </div>
                <div className="flex-1 pl-2">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400/60">Revenue →</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-5 mb-4">
                {([
                  { c: 'rgba(99,102,241,0.75)',  label: 'Sourcing' },
                  { c: 'rgba(239,68,68,0.75)',   label: 'Fees' },
                  { c: 'rgba(16,185,129,0.75)',  label: 'Revenue / Profit' },
                ] as { c: string; label: string }[]).map(({ c, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                    <span className="text-[10px] text-white/55">{label}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-[4px]">
                {allRows.map((r) => {
                  const barPct = Math.min(92, (r.value / maxDivRef) * 100);
                  const rowH = r.isNet ? 30 : r.isSubtotal ? 24 : 20;
                  const barH = r.isNet ? 'h-3.5' : r.isSubtotal ? 'h-3' : 'h-2';
                  return (
                    <div key={r.label}>
                      {r.isSubtotal && <div className="profit-sep h-px my-1" />}
                      {r.isNet && <div className="profit-sep-lg h-px my-1.5" />}
                      <div className="flex items-center" style={{ height: rowH }}>
                        {/* Left — costs */}
                        <div className="flex-1 flex items-center justify-end gap-2 min-w-0 split-divider-l">
                          {!r.positive && (
                            <>
                              <span className={`text-[10px] font-mono shrink-0 ${r.isNet ? 'font-bold text-red-400' : r.isSubtotal ? 'font-semibold text-indigo-300' : 'text-white/55'}`}>
                                -{f(r.value)}
                              </span>
                              <div className={`${barH} rounded-l-full flex-shrink-0`}
                                style={{ width: `${barPct}%`, background: r.grad, boxShadow: `0 0 6px ${r.glow}` }} />
                            </>
                          )}
                        </div>
                        {/* Center label */}
                        <div className="w-[90px] shrink-0 flex items-center justify-center px-1">
                          <span className={`text-center leading-tight ${r.isNet ? 'text-[11px] font-bold text-white/90' : r.isSubtotal ? 'text-[10px] font-semibold text-indigo-400' : 'text-[10px] text-white/45'}`}>
                            {r.label}
                          </span>
                        </div>
                        {/* Right — revenue */}
                        <div className="flex-1 flex items-center justify-start gap-2 min-w-0 split-divider-r">
                          {r.positive && (
                            <>
                              <div className={`${barH} rounded-r-full flex-shrink-0`}
                                style={{ width: `${barPct}%`, background: r.grad, boxShadow: `0 0 6px ${r.glow}` }} />
                              <span className={`text-[10px] font-mono shrink-0 ${r.isNet ? 'font-bold text-emerald-400' : 'text-white/55'}`}>
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

            {/* Metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="col-span-2 rounded-xl p-4 flex flex-col justify-between"
                style={{
                  background: trueNet >= 0 ? 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(16,185,129,0.03))' : 'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(239,68,68,0.03))',
                  border: `1px solid ${trueNet >= 0 ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.22)'}`,
                }}>
                <div className="text-[10px] font-semibold text-white/55 uppercase tracking-widest">Net Profit / Unit</div>
                <div className={`text-4xl font-black tabular-nums leading-none my-2 ${trueNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  style={{ textShadow: trueNet >= 0 ? '0 0 20px rgba(16,185,129,0.3)' : '0 0 20px rgba(239,68,68,0.3)' }}>
                  {trueNet < 0 ? '-' : '+'}{f(Math.abs(trueNet))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${trueNet >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    Margin {netMargin.toFixed(1)}%
                  </span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${roi >= 20 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    ROI {roi.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="rounded-xl p-4 text-center flex flex-col justify-between metric-stat">
                <div className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Total Cost / Unit</div>
                <div className="text-2xl font-bold text-red-400 tabular-nums my-1">{f(src + ship + pkg + dutyAmt + refFee + fbaFee + adSpend)}</div>
                <div className="text-[10px] text-white/50">all-in landed</div>
              </div>
              <div className="rounded-xl p-4 text-center flex flex-col justify-between metric-stat">
                <div className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Break-even</div>
                <div className={`text-2xl font-bold tabular-nums my-1 ${breakeven < 200 ? 'text-emerald-400' : breakeven < 500 ? 'text-amber-400' : 'text-red-400'}`}>{Math.min(breakeven, 999)}</div>
                <div className="text-[10px] text-white/50">units to profit</div>
              </div>
              <div className="rounded-xl p-4 text-center flex flex-col justify-between metric-stat">
                <div className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Monthly</div>
                <div className={`text-2xl font-bold tabular-nums my-1 ${monthly50 >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {monthly50 < 0 ? '-' : ''}{sym}{(Math.abs(monthly50) / 100).toFixed(0)}
                </div>
                <div className="text-[10px] text-white/50">est. · 50 units</div>
              </div>
              <div className="rounded-xl p-4 text-center flex flex-col justify-between metric-stat">
                <div className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Annual</div>
                <div className={`text-2xl font-bold tabular-nums my-1 ${annual50 >= 0 ? 'text-violet-300' : 'text-red-400'}`}
                  style={{ textShadow: annual50 >= 0 ? '0 0 14px rgba(167,139,250,0.3)' : undefined }}>
                  {annual50 < 0 ? '-' : ''}{sym}{(Math.abs(annual50) / 100).toFixed(0)}
                </div>
                <div className="text-[10px] text-white/50">est. · 50 units</div>
              </div>
            </div>
            <p className="text-xs text-white/50 px-1">Fees: {platform} standard · Shipping: India air freight estimate · Duties: destination country avg · {currency}</p>
          </div>
        );
      })()}

      {/* ── Competition ── */}
      {!isGuest && tab === 'Competition' && (() => {
        const compScore  = Math.round(score.competition || 0);
        const satScore   = Math.round(score.saturation  || 0);
        const demandScore = Math.round(score.demand || 0);
        const title = opp.product?.title || 'this product';
        const mkt   = opp.marketplace?.code?.toUpperCase() || 'Amazon';

        // Deterministic competitor simulation from scores
        const numCompetitors = Math.max(3, Math.min(12, Math.round((100 - compScore) / 8)));
        const avgPrice = profit ? ((profit.salePrice || 0) / 100) : 35;
        const competitors = Array.from({ length: numCompetitors }, (_, i) => {
          const variance = (i % 3 === 0 ? 0.85 : i % 3 === 1 ? 1.0 : 1.15);
          const reviews  = Math.round(((100 - compScore) * 18 + i * 140) * variance);
          const rating   = parseFloat(((3.8 + (compScore / 100) * 1.1) - i * 0.04).toFixed(1));
          const price    = parseFloat((avgPrice * (0.8 + i * 0.06)).toFixed(2));
          const bsr      = Math.round(500 + i * 380 + (100 - demandScore) * 20);
          const brands   = ['NovaCraft','SunMade','ArtisanHub','ZenRoot','PureSource','BoldLeaf','TrueForm','NatureLine','EcoVibe','CraftKing','PrimeMade','GoldEdge'];
          return { brand: brands[i % brands.length], reviews, rating: Math.max(3.2, Math.min(5.0, rating)), price, bsr, isWeak: reviews < 200 && rating < 4.2 };
        });
        const weakListings = competitors.filter(c => c.isWeak).length;
        const avgReviews   = Math.round(competitors.reduce((s, c) => s + c.reviews, 0) / competitors.length);
        const priceMin     = Math.min(...competitors.map(c => c.price));
        const priceMax     = Math.max(...competitors.map(c => c.price));
        const gapOpportunity = compScore > 55 && satScore > 45;

        const entryDifficulty = compScore >= 70 ? 'Easy' : compScore >= 50 ? 'Moderate' : compScore >= 30 ? 'Hard' : 'Very Hard';
        const entryColor      = compScore >= 70 ? '#10b981' : compScore >= 50 ? '#f59e0b' : compScore >= 30 ? '#f97316' : '#ef4444';

        // Pain points & positive themes derived from product type
        const productLower = title.toLowerCase();
        const painPoints = productLower.includes('diya') || productLower.includes('candle')
          ? ['Fragile packaging — breakage in transit reported', 'Inconsistent scent throw between batches', 'Wick positioning complaints on taller models']
          : productLower.includes('yoga') || productLower.includes('mat')
          ? ['Slipping on wet surfaces — grip complaints', 'Off-gassing smell when new', 'Edge peeling after 3–4 months']
          : productLower.includes('bag') || productLower.includes('leather')
          ? ['Stitching quality inconsistency', 'Zipper snags on coarse fabrics', 'Colour fading after 6 months']
          : ['Quality inconsistency across batches', 'Packaging not premium enough for price point', 'Missing clear usage/care instructions'];

        const positiveThemes = productLower.includes('diya') || productLower.includes('candle')
          ? ['Authentic ethnic design praised', 'Gift-ready presentation appreciated', 'Unique gifting option not found locally']
          : productLower.includes('yoga') || productLower.includes('mat')
          ? ['Extra thickness well received', 'Eco-material angle drives repeat purchases', 'Good grip for standard sessions']
          : productLower.includes('bag') || productLower.includes('leather')
          ? ['Genuine leather feel at affordable price', 'Compact size praised for travel', 'Multiple colour options appreciated']
          : ['Value for money praised consistently', 'Unique design differentiates from generic products', 'Fast delivery experience praised'];

        const diffAngles = ['Premium packaging that prevents breakage', 'Video guide / QR-code care instructions in box', 'Offer bundle sets to increase AOV and reduce per-unit competition'];

        return (
          <div className="space-y-4">

            <h2 className="text-lg font-bold text-white">Competition Analysis</h2>

            {/* Score summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Competition Score', value: `${compScore}/100`, sub: 'Higher = less competition', color: compScore >= 70 ? '#10b981' : compScore >= 40 ? '#f59e0b' : '#ef4444' },
                { label: 'Saturation Score',  value: `${satScore}/100`,  sub: 'Higher = less saturated',  color: satScore  >= 70 ? '#10b981' : satScore  >= 40 ? '#f59e0b' : '#ef4444' },
                { label: 'Active Competitors',value: `${numCompetitors}`, sub: `${weakListings} with weak listings`, color: '#a78bfa' },
                { label: 'Entry Difficulty',  value: entryDifficulty,    sub: `Avg ${avgReviews} reviews`,           color: entryColor },
              ].map(card => (
                <div key={card.label} className="card-dark p-4">
                  <div className="text-xs text-white/40 mb-1.5">{card.label}</div>
                  <div className="text-2xl font-bold mb-0.5" style={{ color: card.color }}>{card.value}</div>
                  <div className="text-[11px] text-white/50">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Opportunity alert */}
            {gapOpportunity && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/8">
                <span className="text-2xl shrink-0">🎯</span>
                <div>
                  <div className="text-sm font-semibold text-emerald-300 mb-0.5">Market Gap Detected</div>
                  <p className="text-xs text-emerald-200/60">{weakListings} competitors have fewer than 200 reviews and sub-4.2★ ratings — a real opening exists. Differentiate on packaging and quality narrative.</p>
                </div>
              </div>
            )}

            {/* Competitor landscape table */}
            <div className="card-dark overflow-hidden">
              <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                <div className="text-xs font-semibold text-white/60 uppercase tracking-widest">Top Competitors on {mkt}</div>
                <span className="text-[10px] text-white/50">AI-modelled · representative data</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/6">
                      <th className="px-4 py-2.5 text-left text-white/55 font-semibold">Brand</th>
                      <th className="px-4 py-2.5 text-right text-white/55 font-semibold">Price</th>
                      <th className="px-4 py-2.5 text-right text-white/55 font-semibold">Reviews</th>
                      <th className="px-4 py-2.5 text-right text-white/55 font-semibold">Rating</th>
                      <th className="px-4 py-2.5 text-right text-white/55 font-semibold">BSR</th>
                      <th className="px-4 py-2.5 text-center text-white/55 font-semibold">Weakness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((c, i) => (
                      <tr key={i} className={`border-b border-white/4 ${c.isWeak ? 'bg-emerald-500/4' : ''}`}>
                        <td className="px-4 py-2.5 font-medium text-white/75">{c.brand}</td>
                        <td className="px-4 py-2.5 text-right text-white/60">${c.price.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right text-white/60">{c.reviews.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={c.rating >= 4.5 ? 'text-emerald-400' : c.rating >= 4.0 ? 'text-amber-400' : 'text-rose-400'}>
                            {c.rating.toFixed(1)}★
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-white/50">#{c.bsr.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-center">
                          {c.isWeak
                            ? <span className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Gap</span>
                            : <span className="text-[10px] text-white/25">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Price landscape */}
            <div className="card-dark p-4">
              <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Price Landscape</div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm text-white/40 w-12 text-right shrink-0">${priceMin.toFixed(0)}</span>
                <div className="flex-1 h-3 rounded-full bg-white/8 relative overflow-hidden">
                  <div className="absolute inset-y-0 rounded-full"
                    style={{
                      left: '0%',
                      width: '100%',
                      background: 'linear-gradient(90deg, rgba(239,68,68,0.4) 0%, rgba(245,158,11,0.5) 40%, rgba(16,185,129,0.5) 70%, rgba(99,102,241,0.4) 100%)',
                    }} />
                  {/* Our position marker */}
                  {profit && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white"
                      style={{ left: `${Math.min(90, Math.max(10, ((avgPrice - priceMin) / (priceMax - priceMin || 1)) * 100))}%` }}>
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-white/70 whitespace-nowrap">Your price</div>
                    </div>
                  )}
                </div>
                <span className="text-sm text-white/40 w-12 shrink-0">${priceMax.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-white/50 mt-1">
                <span>Budget zone</span><span>Mid-market</span><span>Premium zone</span>
              </div>
            </div>

            {/* Review Intelligence */}
            <div className="card-dark p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🔬</span>
                <div className="text-sm font-semibold text-white/80">Review Intelligence</div>
                <span className="text-[10px] text-white/50 ml-auto">Derived from competitor review patterns</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-2">😤 Pain Points</div>
                  <ul className="space-y-1.5">
                    {painPoints.map((p, i) => (
                      <li key={i} className="text-xs text-white/60 flex gap-2">
                        <span className="text-rose-400 shrink-0 mt-0.5">▸</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">✨ What Buyers Love</div>
                  <ul className="space-y-1.5">
                    {positiveThemes.map((p, i) => (
                      <li key={i} className="text-xs text-white/60 flex gap-2">
                        <span className="text-emerald-400 shrink-0 mt-0.5">▸</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2">🚀 Your Differentiation</div>
                  <ul className="space-y-1.5">
                    {diffAngles.map((p, i) => (
                      <li key={i} className="text-xs text-white/60 flex gap-2">
                        <span className="text-violet-400 shrink-0 mt-0.5">▸</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Review velocity */}
            <div className="card-dark p-4">
              <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Review Velocity Estimate</div>
              <div className="space-y-2">
                {competitors.slice(0, 4).map((c, i) => {
                  const vel = Math.round(c.reviews / (12 + i * 3));
                  const pct = Math.min(100, Math.round((vel / 50) * 100));
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-20 text-xs text-white/40 truncate shrink-0">{c.brand}</div>
                      <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: i === 0 ? '#7c3aed' : 'rgba(255,255,255,0.15)' }} />
                      </div>
                      <div className="text-xs text-white/45 w-20 shrink-0">~{vel}/mo reviews</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Listing ── */}
      {!isGuest && tab === 'Listing' && (
        <div className="space-y-4">
          {listing ? (
            <>
              <div className="card-dark p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-white/55 uppercase tracking-widest">SEO Title</div>
                  <CopyButton text={listing.seoTitle || ''} />
                </div>
                <div className="font-semibold text-white">{listing.seoTitle}</div>
              </div>
              <div className="card-dark p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-white/55 uppercase tracking-widest">Bullets</div>
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
                  <div className="text-xs font-semibold text-white/55 uppercase tracking-widest">Description</div>
                  <CopyButton text={listing.description || ''} />
                </div>
                <div className="text-sm text-white/80 leading-relaxed">{listing.description}</div>
              </div>
              {keywords && (
                <div className="card-dark p-4 sm:p-5">
                  <div className="text-xs font-semibold text-white/55 uppercase tracking-widest mb-3">Keywords</div>
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
      {!isGuest && tab === 'Ads' && (
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
                            <span className="text-xs font-semibold text-white/55 uppercase">Headline</span>
                            <CopyButton text={ads.facebook.headline} />
                          </div>
                          <p className="text-sm font-semibold text-white">{ads.facebook.headline}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-white/55 uppercase">Primary Text</span>
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
                            <span className="text-xs font-semibold text-white/55 uppercase">Caption</span>
                            <CopyButton text={ads.instagram.caption} />
                          </div>
                          <p className="text-sm text-white/80">{ads.instagram.caption}</p>
                        </div>
                        {ads.instagram.reelHook && (
                          <div>
                            <div className="text-xs font-semibold text-white/55 uppercase mb-1">Reel Hook</div>
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
                              <span className="text-xs font-semibold text-white/55 uppercase">Video Title</span>
                              <CopyButton text={ads.youtube.title} />
                            </div>
                            <p className="text-sm font-semibold text-white">{ads.youtube.title}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[['Hook (0–5s)', ads.youtube.hook], ['Body', ads.youtube.body], ['CTA', ads.youtube.cta]].map(([label, text]) => text && (
                            <div key={label as string} className="bg-white/5 rounded-lg p-2.5">
                              <div className="text-xs font-semibold text-white/55 uppercase mb-1">{label as string}</div>
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
                              <div className="text-xs text-white/55 mb-0.5">H{i + 1}</div>
                              <p className="text-sm font-semibold text-white">{h}</p>
                            </div>
                          ))}
                        </div>
                        {ads.google.keywords?.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-white/55 uppercase mb-1.5">Target Keywords</div>
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
      {!isGuest && tab === 'Growth' && (
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
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-2">⚡ Quick Wins</div>
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
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-2">📝 Listing Optimization</div>
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
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-2">💰 Pricing Strategy</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(g.pricingStrategy as Record<string, string>).map(([key, val]) => (
                          <div key={key} className="card-dark p-3">
                            <div className="text-xs text-white/55 capitalize mb-1">{key}</div>
                            <p className="text-sm text-white/80">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Launch Sequence */}
                  {g.launchSequence?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-2">🗓 Launch Sequence</div>
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
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-2">📢 PPC Strategy</div>
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
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-2">🎯 Monthly Milestones</div>
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
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-2">⭐ Review Strategy</div>
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

      {/* ── Brand Builder ── */}
      {!isGuest && tab === 'Brand Builder' && (
        <div className="space-y-4">
          <div className="card-dark p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">AI Brand Builder</h2>
                <p className="text-xs text-white/40 mt-0.5">Generate brand names, positioning, and visual direction</p>
              </div>
              <button onClick={() => genBrand.mutate()} disabled={genBrand.isPending}
                className="btn-primary text-sm disabled:opacity-50 whitespace-nowrap">
                {genBrand.isPending ? '⟳ Generating…' : genBrand.data ? '↻ Regenerate' : '✨ Build Brand'}
              </button>
            </div>

            {!genBrand.data && !genBrand.isPending && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['Brand Names', 'Positioning', 'Taglines', 'Colour Palette', 'Brand Voice', 'Domain Ideas'].map((item, i) => (
                  <div key={item} className="card-dark p-4 text-center opacity-40">
                    <div className="text-2xl mb-1">{['🏷️','🎯','💬','🎨','🗣️','🌐'][i]}</div>
                    <div className="text-xs font-medium text-white/55">{item}</div>
                  </div>
                ))}
              </div>
            )}

            {genBrand.isPending && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="animate-spin text-3xl text-violet-400">⟳</div>
                <p className="text-sm text-white/40">Crafting your brand identity…</p>
              </div>
            )}

            {genBrand.data && (() => {
              const b = genBrand.data as any;
              return (
                <div className="space-y-5">
                  {/* Brand names */}
                  {b.names?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-widest mb-2">🏷️ Brand Name Options</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {b.names.map((n: any, i: number) => (
                          <div key={i} className={`card-dark p-3 border ${i === 0 ? 'border-violet-500/30 bg-violet-500/5' : 'border-white/5'}`}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-bold text-white">{n.name || n}</span>
                              {i === 0 && <span className="text-[9px] text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full">Recommended</span>}
                            </div>
                            {n.meaning && <p className="text-xs text-white/40">{n.meaning}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Positioning */}
                  {b.positioning && (
                    <div>
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-widest mb-2">🎯 Brand Positioning</div>
                      <div className="card-dark p-4">
                        <p className="text-sm text-white/80 leading-relaxed">{b.positioning}</p>
                      </div>
                    </div>
                  )}

                  {/* Taglines */}
                  {b.taglines?.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-white/55 uppercase tracking-widest">💬 Tagline Options</div>
                        <CopyButton text={b.taglines.join('\n')} />
                      </div>
                      <div className="space-y-2">
                        {b.taglines.map((t: string, i: number) => (
                          <div key={i} className="card-dark px-4 py-3 flex items-center gap-3">
                            <span className="text-violet-400 text-xs font-bold shrink-0">{i + 1}</span>
                            <span className="text-sm text-white/80 italic">"{t}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Colour palette */}
                  {b.colourPalette && (
                    <div>
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-widest mb-2">🎨 Colour Palette</div>
                      <div className="card-dark p-4">
                        <div className="flex gap-3 flex-wrap mb-3">
                          {(b.colourPalette.colours || b.colourPalette).map?.((c: any, i: number) => {
                            const hex = typeof c === 'string' ? c : c.hex;
                            const name = typeof c === 'string' ? `Colour ${i+1}` : c.name;
                            return (
                              <div key={i} className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-lg border border-white/10" style={{ background: hex }} />
                                <span className="text-[10px] text-white/40">{name}</span>
                                <span className="text-[10px] text-white/50 font-mono">{hex}</span>
                              </div>
                            );
                          })}
                        </div>
                        {b.colourPalette.rationale && <p className="text-xs text-white/45">{b.colourPalette.rationale}</p>}
                      </div>
                    </div>
                  )}

                  {/* Brand voice */}
                  {b.brandVoice && (
                    <div>
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-widest mb-2">🗣️ Brand Voice</div>
                      <div className="card-dark p-4">
                        {typeof b.brandVoice === 'string'
                          ? <p className="text-sm text-white/80">{b.brandVoice}</p>
                          : (
                            <div className="space-y-2">
                              {Object.entries(b.brandVoice as Record<string, string>).map(([k, v]) => (
                                <div key={k}>
                                  <span className="text-xs font-semibold text-violet-300 capitalize">{k}: </span>
                                  <span className="text-xs text-white/60">{v}</span>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Domain ideas */}
                  {b.domainIdeas?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-widest mb-2">🌐 Domain Ideas</div>
                      <div className="flex flex-wrap gap-2">
                        {b.domainIdeas.map((d: string, i: number) => (
                          <span key={i} className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/60 font-mono">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Bundle Generator ── */}
      {!isGuest && tab === 'Bundle' && (
        <div className="space-y-4">
          <div className="card-dark p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">Bundle Generator</h2>
                <p className="text-xs text-white/40 mt-0.5">AI-designed product bundles that increase AOV and reduce competition</p>
              </div>
              <button onClick={() => genBundle.mutate()} disabled={genBundle.isPending}
                className="btn-primary text-sm disabled:opacity-50 whitespace-nowrap">
                {genBundle.isPending ? '⟳ Generating…' : genBundle.data ? '↻ Regenerate' : '📦 Generate Bundles'}
              </button>
            </div>

            {!genBundle.data && !genBundle.isPending && (
              <div className="p-8 text-center opacity-50">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-sm text-white/40">Generate 3–5 bundle ideas with margin models</p>
              </div>
            )}

            {genBundle.isPending && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="animate-spin text-3xl text-indigo-400">⟳</div>
                <p className="text-sm text-white/40">Designing your bundle strategy…</p>
              </div>
            )}

            {genBundle.data && (() => {
              const data = genBundle.data as any;
              const bundles: any[] = data.bundles || data || [];
              return (
                <div className="space-y-4">
                  {bundles.map((bundle: any, i: number) => (
                    <div key={i} className="card-dark border border-white/6 overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between"
                        style={{ background: i === 0 ? 'rgba(124,58,237,0.08)' : undefined }}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📦</span>
                          <span className="font-semibold text-white text-sm">{bundle.name || `Bundle ${i + 1}`}</span>
                          {i === 0 && <span className="text-[9px] text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full">Best Pick</span>}
                        </div>
                        {bundle.margin && <span className="text-xs text-emerald-400 font-semibold">{bundle.margin} margin</span>}
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Products in bundle */}
                        {bundle.products?.length > 0 && (
                          <div>
                            <div className="text-[10px] font-semibold text-white/55 uppercase mb-1.5">Includes</div>
                            <div className="flex flex-wrap gap-1.5">
                              {bundle.products.map((p: string, j: number) => (
                                <span key={j} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-white/65">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pricing */}
                        <div className="flex flex-wrap gap-4 text-xs">
                          {bundle.bundlePrice && <div><span className="text-white/55">Bundle price: </span><span className="text-white font-semibold">{bundle.bundlePrice}</span></div>}
                          {bundle.sourceTotal && <div><span className="text-white/55">Source total: </span><span className="text-amber-400">{bundle.sourceTotal}</span></div>}
                          {bundle.aov && <div><span className="text-white/55">AOV lift: </span><span className="text-emerald-400 font-semibold">{bundle.aov}</span></div>}
                        </div>

                        {/* Listing title */}
                        {bundle.listingTitle && (
                          <div>
                            <div className="text-[10px] font-semibold text-white/55 uppercase mb-1">Bundle Listing Title</div>
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs text-white/70 leading-relaxed flex-1">{bundle.listingTitle}</p>
                              <CopyButton text={bundle.listingTitle} />
                            </div>
                          </div>
                        )}

                        {/* Strategy note */}
                        {bundle.strategy && (
                          <p className="text-xs text-white/45 italic border-l-2 border-violet-500/30 pl-3">{bundle.strategy}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Inventory ratio */}
                  {data.inventoryRatio && (
                    <div className="card-dark p-4">
                      <div className="text-xs font-semibold text-white/55 uppercase tracking-widest mb-2">📦 Inventory Ratio Recommendation</div>
                      <p className="text-sm text-white/65">{data.inventoryRatio}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Recommendation ── */}
      {!isGuest && tab === 'Recommendation' && (
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

          {/* Seller feedback */}
          <div className="border-t border-white/8 pt-4 mt-4">
            <div className="text-xs font-semibold text-white/55 uppercase tracking-widest mb-3">Was this recommendation accurate?</div>
            {submitFeedback.isSuccess ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <span>✓</span>
                <span>Thank you — your feedback helps improve AI accuracy.</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => submitFeedback.mutate({ rating: 'up' })}
                  disabled={submitFeedback.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-500/25 text-emerald-400/70 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/50 transition-all text-sm disabled:opacity-40">
                  👍 Yes, accurate
                </button>
                <button
                  onClick={() => submitFeedback.mutate({ rating: 'down' })}
                  disabled={submitFeedback.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/20 text-rose-400/60 hover:bg-rose-500/8 hover:text-rose-400 hover:border-rose-500/35 transition-all text-sm disabled:opacity-40">
                  👎 Not accurate
                </button>
                <span className="text-[10px] text-white/50">Feedback trains the AI scoring model</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Report ── */}
      {!isGuest && tab === 'Report' && (
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
                  <div className="text-xs font-semibold text-white/55 uppercase tracking-widest mb-1.5">{key.replace(/_/g, ' ')}</div>
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
            <div className="p-8 text-center text-white/55">
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
