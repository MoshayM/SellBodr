'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function minor(val: number) { return (val / 100).toFixed(2); }

interface Props { profit: any; currency?: string; }

export function ProfitWaterfall({ profit, currency = 'USD' }: Props) {
  if (!profit) return <div className="text-gray-400 text-sm">No profit data</div>;

  const items = [
    { name: 'Sale Price', value: +minor(profit.salePriceMinor), type: 'positive' },
    { name: 'Product Cost', value: -+minor(profit.productCostMinor), type: 'negative' },
    { name: 'Packaging', value: -+minor(profit.packagingCostMinor), type: 'negative' },
    { name: 'Intl Shipping', value: -+minor(profit.intlShippingMinor), type: 'negative' },
    { name: 'Duty', value: -+minor(profit.dutyMinor), type: 'negative' },
    { name: 'FBA Fee', value: -+minor(profit.fbaFeeMinor), type: 'negative' },
    { name: 'Referral', value: -+minor(profit.referralFeeMinor), type: 'negative' },
    { name: 'Ads', value: -+minor(profit.adCostMinor), type: 'negative' },
    { name: 'Net Profit', value: +minor(profit.netProfitMinor), type: profit.netProfitMinor >= 0 ? 'result' : 'loss' },
  ];

  const colors: Record<string, string> = { positive: '#16a34a', negative: '#ef4444', result: '#2563eb', loss: '#dc2626' };

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={items} margin={{ top: 8, right: 8, bottom: 32, left: 32 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
          <Tooltip formatter={(v: any) => [`$${Math.abs(v)}`, '']} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {items.map((item, i) => <Cell key={i} fill={colors[item.type]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        {[
          { label: 'Net Profit/unit', value: `${currency} ${minor(profit.netProfitMinor)}`, positive: profit.netProfitMinor >= 0 },
          { label: 'ROI', value: `${profit.roiPct?.toFixed(1)}%`, positive: profit.roiPct >= 0 },
          { label: 'Net Margin', value: `${profit.netMarginPct?.toFixed(1)}%`, positive: profit.netMarginPct >= 15 },
          { label: 'Break-even', value: `${profit.breakevenUnits} units`, positive: profit.breakevenUnits < 200 },
          { label: 'Monthly Profit', value: `${currency} ${minor(profit.monthlyProfitMinor)}`, positive: profit.monthlyProfitMinor >= 0 },
          { label: 'Annual Profit', value: `${currency} ${minor(profit.annualProfitMinor)}`, positive: profit.annualProfitMinor >= 0 },
        ].map(({ label, value, positive }) => (
          <div key={label} className="card p-3">
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`font-bold ${positive ? 'text-green-700' : 'text-red-600'}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
