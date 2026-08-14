'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function usd(val: number, currency = 'USD') {
  const sym = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  return `${sym}${(Math.abs(val) / 100).toFixed(2)}`;
}

interface Props { profit: any; currency?: string; }

export function ProfitWaterfall({ profit, currency = 'USD' }: Props) {
  if (!profit) return <div className="text-white/40 text-sm">No profit data available</div>;

  const p = profit;
  const sale     = Number(p.salePriceMinor     ?? 0);
  const src      = Number(p.productCostMinor   ?? 0);
  const pkg      = Number(p.packagingCostMinor ?? 0);
  const ship     = Number(p.intlShippingMinor  ?? 0);
  const duty     = Number(p.dutyMinor          ?? 0);
  const fba      = Number(p.fbaFeeMinor        ?? 0);
  const ref      = Number(p.referralFeeMinor   ?? 0);
  const ads      = Number(p.adCostMinor        ?? 0);
  const net      = Number(p.netProfitMinor     ?? 0);
  const roi      = Number(p.roiPct             ?? 0);
  const margin   = Number(p.netMarginPct       ?? 0);
  const breakeven     = Number(p.breakevenUnits    ?? (net > 0 ? Math.ceil(50000 / net) : 999));
  const monthly  = Number(p.monthlyProfitMinor ?? net * 50);
  const annual   = Number(p.annualProfitMinor  ?? net * 600);

  const items = [
    { name: 'Sale Price',   value: sale / 100,   type: 'positive' },
    { name: 'Product Cost', value: -src / 100,   type: 'negative' },
    { name: 'Packaging',    value: -pkg / 100,   type: 'negative' },
    { name: 'Int. Shipping',value: -ship / 100,  type: 'negative' },
    { name: 'Duty',         value: -duty / 100,  type: 'negative' },
    { name: 'FBA Fee',      value: -fba / 100,   type: 'negative' },
    { name: 'Referral',     value: -ref / 100,   type: 'negative' },
    { name: 'Ads',          value: -ads / 100,   type: 'negative' },
    { name: 'Net Profit',   value: net / 100,    type: net >= 0 ? 'result' : 'loss' },
  ].filter(item => item.value !== 0 || item.name === 'Net Profit');

  const colors: Record<string, string> = {
    positive: '#7c3aed',
    negative: '#ef4444',
    result:   '#16a34a',
    loss:     '#dc2626',
  };

  const sym = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const v = payload[0]?.value ?? 0;
    return (
      <div className="bg-[#0d1225] border border-white/15 rounded-xl px-3 py-2 text-xs shadow-xl">
        <div className="text-white/60 mb-0.5">{label}</div>
        <div className={`font-bold text-sm ${v >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {sym}{Math.abs(v).toFixed(2)}
        </div>
      </div>
    );
  };

  const stats = [
    { label: 'Net Profit / unit', value: usd(net, currency), positive: net >= 0, highlight: true },
    { label: 'ROI',               value: `${roi.toFixed(1)}%`,   positive: roi >= 0 },
    { label: 'Net Margin',        value: `${margin.toFixed(1)}%`, positive: margin >= 15 },
    { label: 'Break-even (units)',value: `${breakeven}`,          positive: breakeven < 200 },
    { label: 'Est. Monthly Profit', value: usd(monthly, currency), positive: monthly >= 0 },
    { label: 'Est. Annual Profit',  value: usd(annual, currency),  positive: annual >= 0 },
  ];

  return (
    <div>
      {/* Waterfall chart */}
      <div className="mb-5">
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Cost Waterfall</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={items} margin={{ top: 4, right: 4, bottom: 36, left: 24 }}>
            <XAxis
              dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.35)' }}
              angle={-35} textAnchor="end" axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
              tickFormatter={v => `${sym}${Math.abs(v)}`}
              axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {items.map((item, i) => <Cell key={i} fill={colors[item.type]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats grid */}
      <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Key Metrics</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {stats.map(({ label, value, positive, highlight }) => (
          <div key={label} className={`rounded-xl p-3 border ${
            highlight
              ? 'bg-violet-500/10 border-violet-500/20'
              : 'bg-white/5 border-white/8'
          }`}>
            <div className="text-[10px] text-white/40 mb-1 leading-snug">{label}</div>
            <div className={`font-bold text-sm leading-snug ${positive ? 'text-green-400' : 'text-red-400'}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 flex-wrap">
        {[
          { color: '#7c3aed', label: 'Revenue' },
          { color: '#ef4444', label: 'Costs' },
          { color: '#16a34a', label: 'Net Profit' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-white/40">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
