'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { ScoreGauge, RecommendationBadge } from '@/components/ui/ScoreGauge';

// ── Display metadata ──────────────────────────────────────────────
const MKT_META: Record<string, { label: string; flag: string; region: string }> = {
  // Amazon
  amazon_us: { label: 'Amazon US',    flag: '🇺🇸', region: 'Amazon' },
  amazon_uk: { label: 'Amazon UK',    flag: '🇬🇧', region: 'Amazon' },
  amazon_de: { label: 'Amazon DE',    flag: '🇩🇪', region: 'Amazon' },
  amazon_ca: { label: 'Amazon CA',    flag: '🇨🇦', region: 'Amazon' },
  amazon_au: { label: 'Amazon AU',    flag: '🇦🇺', region: 'Amazon' },
  amazon_fr: { label: 'Amazon FR',    flag: '🇫🇷', region: 'Amazon' },
  amazon_it: { label: 'Amazon IT',    flag: '🇮🇹', region: 'Amazon' },
  amazon_es: { label: 'Amazon ES',    flag: '🇪🇸', region: 'Amazon' },
  amazon_nl: { label: 'Amazon NL',    flag: '🇳🇱', region: 'Amazon' },
  amazon_se: { label: 'Amazon SE',    flag: '🇸🇪', region: 'Amazon' },
  amazon_pl: { label: 'Amazon PL',    flag: '🇵🇱', region: 'Amazon' },
  amazon_tr: { label: 'Amazon TR',    flag: '🇹🇷', region: 'Amazon' },
  amazon_ae: { label: 'Amazon AE',    flag: '🇦🇪', region: 'Amazon' },
  amazon_sa: { label: 'Amazon SA',    flag: '🇸🇦', region: 'Amazon' },
  amazon_sg: { label: 'Amazon SG',    flag: '🇸🇬', region: 'Amazon' },
  amazon_in: { label: 'Amazon IN',    flag: '🇮🇳', region: 'Amazon' },
  amazon_jp: { label: 'Amazon JP',    flag: '🇯🇵', region: 'Amazon' },
  amazon_mx: { label: 'Amazon MX',    flag: '🇲🇽', region: 'Amazon' },
  amazon_br: { label: 'Amazon BR',    flag: '🇧🇷', region: 'Amazon' },
  // Shopee
  shopee_sg: { label: 'Shopee SG',    flag: '🇸🇬', region: 'Shopee' },
  shopee_my: { label: 'Shopee MY',    flag: '🇲🇾', region: 'Shopee' },
  shopee_th: { label: 'Shopee TH',    flag: '🇹🇭', region: 'Shopee' },
  shopee_ph: { label: 'Shopee PH',    flag: '🇵🇭', region: 'Shopee' },
  shopee_id: { label: 'Shopee ID',    flag: '🇮🇩', region: 'Shopee' },
  shopee_vn: { label: 'Shopee VN',    flag: '🇻🇳', region: 'Shopee' },
  shopee_tw: { label: 'Shopee TW',    flag: '🇹🇼', region: 'Shopee' },
  shopee_br: { label: 'Shopee BR',    flag: '🇧🇷', region: 'Shopee' },
  // Lazada
  lazada_sg: { label: 'Lazada SG',    flag: '🇸🇬', region: 'Lazada' },
  lazada_my: { label: 'Lazada MY',    flag: '🇲🇾', region: 'Lazada' },
  lazada_th: { label: 'Lazada TH',    flag: '🇹🇭', region: 'Lazada' },
  lazada_ph: { label: 'Lazada PH',    flag: '🇵🇭', region: 'Lazada' },
  lazada_id: { label: 'Lazada ID',    flag: '🇮🇩', region: 'Lazada' },
  lazada_vn: { label: 'Lazada VN',    flag: '🇻🇳', region: 'Lazada' },
  // TikTok Shop
  tiktok_us: { label: 'TikTok US',    flag: '🇺🇸', region: 'TikTok Shop' },
  tiktok_uk: { label: 'TikTok UK',    flag: '🇬🇧', region: 'TikTok Shop' },
  tiktok_de: { label: 'TikTok DE',    flag: '🇩🇪', region: 'TikTok Shop' },
  tiktok_sg: { label: 'TikTok SG',    flag: '🇸🇬', region: 'TikTok Shop' },
  tiktok_my: { label: 'TikTok MY',    flag: '🇲🇾', region: 'TikTok Shop' },
  tiktok_th: { label: 'TikTok TH',    flag: '🇹🇭', region: 'TikTok Shop' },
  tiktok_ph: { label: 'TikTok PH',    flag: '🇵🇭', region: 'TikTok Shop' },
  tiktok_id: { label: 'TikTok ID',    flag: '🇮🇩', region: 'TikTok Shop' },
  tiktok_vn: { label: 'TikTok VN',    flag: '🇻🇳', region: 'TikTok Shop' },
  // eBay
  ebay_us:   { label: 'eBay US',      flag: '🇺🇸', region: 'eBay' },
  ebay_uk:   { label: 'eBay UK',      flag: '🇬🇧', region: 'eBay' },
  ebay_de:   { label: 'eBay DE',      flag: '🇩🇪', region: 'eBay' },
  ebay_au:   { label: 'eBay AU',      flag: '🇦🇺', region: 'eBay' },
  // Walmart
  walmart:   { label: 'Walmart US',   flag: '🇺🇸', region: 'Walmart' },
  walmart_ca:{ label: 'Walmart CA',   flag: '🇨🇦', region: 'Walmart' },
  // Noon
  noon_ae:   { label: 'Noon AE',      flag: '🇦🇪', region: 'Noon' },
  noon_sa:   { label: 'Noon SA',      flag: '🇸🇦', region: 'Noon' },
  noon_eg:   { label: 'Noon EG',      flag: '🇪🇬', region: 'Noon' },
  // Temu
  temu_us:   { label: 'Temu US',      flag: '🇺🇸', region: 'Temu' },
  temu_uk:   { label: 'Temu UK',      flag: '🇬🇧', region: 'Temu' },
  temu_de:   { label: 'Temu DE',      flag: '🇩🇪', region: 'Temu' },
  // MercadoLibre
  mercadolibre_br: { label: 'MercadoLibre BR', flag: '🇧🇷', region: 'MercadoLibre' },
  mercadolibre_mx: { label: 'MercadoLibre MX', flag: '🇲🇽', region: 'MercadoLibre' },
  mercadolibre_ar: { label: 'MercadoLibre AR', flag: '🇦🇷', region: 'MercadoLibre' },
  mercadolibre_co: { label: 'MercadoLibre CO', flag: '🇨🇴', region: 'MercadoLibre' },
  mercadolibre_cl: { label: 'MercadoLibre CL', flag: '🇨🇱', region: 'MercadoLibre' },
  // India
  flipkart_in: { label: 'Flipkart',   flag: '🇮🇳', region: 'India' },
  meesho_in:   { label: 'Meesho',     flag: '🇮🇳', region: 'India' },
  // East Asia
  coupang_kr:  { label: 'Coupang KR', flag: '🇰🇷', region: 'East Asia' },
  rakuten_jp:  { label: 'Rakuten JP', flag: '🇯🇵', region: 'East Asia' },
  // Europe
  allegro_pl:  { label: 'Allegro PL', flag: '🇵🇱', region: 'Europe' },
  bol_nl:      { label: 'Bol.com NL', flag: '🇳🇱', region: 'Europe' },
  zalando_eu:  { label: 'Zalando EU', flag: '🇪🇺', region: 'Europe' },
  otto_de:     { label: 'Otto DE',    flag: '🇩🇪', region: 'Europe' },
  cdiscount_fr:{ label: 'Cdiscount FR',flag: '🇫🇷', region: 'Europe' },
  onbuy_uk:    { label: 'OnBuy UK',   flag: '🇬🇧', region: 'Europe' },
  // Africa
  jumia_ng:    { label: 'Jumia NG',   flag: '🇳🇬', region: 'Africa' },
  jumia_ke:    { label: 'Jumia KE',   flag: '🇰🇪', region: 'Africa' },
  takealot_za: { label: 'Takealot ZA',flag: '🇿🇦', region: 'Africa' },
  // South Asia
  daraz_pk:    { label: 'Daraz PK',   flag: '🇵🇰', region: 'South Asia' },
  daraz_lk:    { label: 'Daraz LK',   flag: '🇱🇰', region: 'South Asia' },
  daraz_bd:    { label: 'Daraz BD',   flag: '🇧🇩', region: 'South Asia' },
  // Other
  etsy:        { label: 'Etsy',       flag: '🛍️', region: 'Other' },
};

const REGION_ORDER = [
  'Amazon', 'Shopee', 'Lazada', 'TikTok Shop', 'eBay', 'Walmart',
  'Noon', 'Temu', 'MercadoLibre', 'India', 'East Asia',
  'Europe', 'Africa', 'South Asia', 'Other',
];

function getMeta(code: string) {
  return MKT_META[code] || { label: code.replace(/_/g, ' ').toUpperCase(), flag: '🛒', region: 'Other' };
}

function minor(v: number, currency = '') {
  return `${currency} ${(v / 100).toFixed(0)}`.trim();
}

// ── Page ──────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>('All');

  const { data: marketplaces = [], isLoading: mkLoading } = useQuery({
    queryKey: ['marketplaces'],
    queryFn: () => api.marketplaces.list(),
  });

  const { data: opps = [], isLoading: oppLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => api.opportunities.list({}),
  });

  // Build opportunity counts + avg score per marketplace code
  const oppStats: Record<string, { count: number; avgScore: number; list: any[] }> = {};
  for (const opp of (opps as any[])) {
    const code = opp.marketplace?.code || 'unknown';
    if (!oppStats[code]) oppStats[code] = { count: 0, avgScore: 0, list: [] };
    oppStats[code].list.push(opp);
    oppStats[code].count++;
  }
  for (const stat of Object.values(oppStats)) {
    stat.avgScore = Math.round(stat.list.reduce((a, o) => a + (o.score?.opportunity || 0), 0) / stat.list.length);
  }

  // Group marketplaces by region
  const byRegion: Record<string, any[]> = {};
  for (const mp of (marketplaces as any[])) {
    const meta = getMeta(mp.code);
    const region = meta.region;
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(mp);
  }

  const regions = ['All', ...REGION_ORDER.filter(r => byRegion[r])];
  const isLoading = mkLoading || oppLoading;

  const filteredRegions = regionFilter === 'All'
    ? REGION_ORDER.filter(r => byRegion[r])
    : [regionFilter].filter(r => byRegion[r]);

  // If a marketplace is selected, show its opportunities
  if (selected) {
    const meta = getMeta(selected);
    const stat = oppStats[selected];
    const list = stat?.list || [];

    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <span className="text-lg leading-none">←</span>
            <span>All Marketplaces</span>
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800">{meta.flag} {meta.label}</span>
        </div>

        {list.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">{meta.flag}</div>
            <p className="font-medium text-gray-700 mb-1">No opportunities yet for {meta.label}</p>
            <p className="text-sm text-gray-400">
              <Link href="/opportunities" className="text-green-600 hover:underline">Run a search</Link> to discover opportunities here
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{meta.flag}</span>
                <span className="font-semibold text-gray-800">{meta.label}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {list.length} opp{list.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Avg score: <strong className="text-gray-700">{stat?.avgScore ?? '—'}</strong>
              </div>
            </div>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-gray-50">
              {list.map((opp: any) => (
                <Link key={opp.id} href={`/opportunities/${opp.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {opp.product?.imageUrl
                      ? <Image src={opp.product.imageUrl} alt={opp.product.title} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                  </div>
                  <ScoreGauge score={opp.score?.opportunity || 0} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{opp.product?.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence)} />
                      {opp.profitModel && (
                        <span className="text-xs text-gray-500">
                          {minor(opp.profitModel.netProfitMinor, opp.marketplace?.currency)}/unit
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-300 text-lg shrink-0">›</span>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead className="bg-gray-50/50 text-xs text-gray-500">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-semibold uppercase tracking-wide">Product</th>
                    <th className="text-center px-4 py-2.5 font-semibold uppercase tracking-wide">Score</th>
                    <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wide">Decision</th>
                    <th className="text-right px-4 py-2.5 font-semibold uppercase tracking-wide">Net Profit</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((opp: any) => (
                    <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            {opp.product?.imageUrl
                              ? <Image src={opp.product.imageUrl} alt={opp.product.title || ''} width={36} height={36} className="w-full h-full object-cover" unoptimized />
                              : <div className="w-full h-full flex items-center justify-center text-sm">📦</div>}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 line-clamp-1">{opp.product?.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{opp.product?.category?.replace(/_/g, ' ')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreGauge score={opp.score?.opportunity || 0} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence)} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {opp.profitModel
                          ? minor(opp.profitModel.netProfitMinor, opp.marketplace?.currency)
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/opportunities/${opp.id}`}
                          className="text-xs text-green-600 hover:underline font-medium whitespace-nowrap">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main marketplace catalog view ─────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Marketplace Intelligence</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {isLoading ? 'Loading…' : `${(marketplaces as any[]).length} global marketplaces · click any to explore opportunities`}
        </p>
      </div>

      {/* Region filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 scrollbar-none">
        {regions.map(r => (
          <button key={r} onClick={() => setRegionFilter(r)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              regionFilter === r
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {r}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-24 mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[1,2,3,4,5].map(j => <div key={j} className="h-20 bg-gray-50 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRegions.map(region => {
            const mps = byRegion[region] || [];
            return (
              <div key={region} className="card overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-800 text-sm">{region}</span>
                  <span className="text-xs text-gray-400">{mps.length} marketplace{mps.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
                  {mps.map((mp: any) => {
                    const meta = getMeta(mp.code);
                    const stat = oppStats[mp.code];
                    const fees = (() => { try { return JSON.parse(mp.feeSchedule || '{}'); } catch { return {}; } })();

                    return (
                      <button key={mp.id} onClick={() => setSelected(mp.code)}
                        className={`text-left p-3 rounded-xl border transition-all hover:shadow-sm active:scale-[0.98] ${
                          mp.active
                            ? 'border-gray-200 hover:border-green-300 bg-white hover:bg-green-50/30'
                            : 'border-dashed border-gray-200 bg-gray-50 opacity-60'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl leading-none">{meta.flag}</span>
                          {stat ? (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              stat.avgScore >= 65 ? 'bg-green-100 text-green-700' :
                              stat.avgScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {stat.avgScore}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-300 font-medium">—</span>
                          )}
                        </div>

                        <div className="text-xs font-semibold text-gray-800 leading-tight line-clamp-1 mb-0.5">
                          {meta.label}
                        </div>
                        <div className="text-[10px] text-gray-400 mb-1.5">{mp.currency}</div>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">
                            {stat ? `${stat.count} opp${stat.count !== 1 ? 's' : ''}` : 'No opps'}
                          </span>
                          {fees.referralPct != null && (
                            <span className="text-[10px] text-gray-400">{fees.referralPct}% ref</span>
                          )}
                        </div>

                        {!mp.active && (
                          <div className="mt-1.5 text-[10px] text-gray-400 font-medium">Inactive</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary bar */}
      {!isLoading && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap gap-4 text-sm text-gray-600">
          <span>
            <strong className="text-gray-900">{(marketplaces as any[]).filter((m: any) => m.active).length}</strong> active
          </span>
          <span>
            <strong className="text-gray-900">{(marketplaces as any[]).filter((m: any) => !m.active).length}</strong> inactive
          </span>
          <span>
            <strong className="text-gray-900">{Object.values(oppStats).reduce((a, s) => a + s.count, 0)}</strong> total opportunities
          </span>
          <span className="ml-auto">
            <Link href="/settings" className="text-green-600 hover:underline text-xs font-medium">
              Manage marketplaces →
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}
