'use client';
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getWishlist, removeFromWishlist } from '@/lib/wishlist';
import { RecommendationBadge, ScoreBadge } from '@/components/ui/ScoreGauge';

// ── Formatters ────────────────────────────────────────────────────────────────

function usd(v: number) { return '$' + (v / 100).toFixed(0); }

const PLATFORM_NAMES: Record<string, string> = {
  amazon: 'Amazon', ebay: 'eBay', shopee: 'Shopee', lazada: 'Lazada',
  tiktok: 'TikTok Shop', walmart: 'Walmart', noon: 'Noon', temu: 'Temu',
  etsy: 'Etsy', flipkart: 'Flipkart', meesho: 'Meesho',
};

function platformOf(code: string) {
  const p = (code || '').split('_')[0];
  return PLATFORM_NAMES[p] || p.charAt(0).toUpperCase() + p.slice(1);
}
function countryCode(mpCode: string) {
  const parts = (mpCode || '').split('_');
  const last = parts[parts.length - 1];
  return last.length === 2 ? last.toUpperCase() : '';
}
function flag(cc: string) {
  if (!cc || cc.length !== 2) return '';
  return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

// ── Filter options ─────────────────────────────────────────────────────────────

const SIGNAL_OPTIONS = ['All Signals', 'launch', 'hold', 'reject'];
const TREND_OPTIONS  = ['All Trends', 'hot', 'rising', 'stable', 'declining'];
const CHANNEL_OPTIONS = ['All Channels', 'amazon', 'ebay', 'etsy', 'tiktok', 'walmart', 'shopee'];
const TIME_OPTIONS   = ['All Time', 'Last 2 days', 'This week', 'This month', 'Last 3 months'];

const DAY = 86_400_000;
function ageKey(ts: number) {
  const age = Date.now() - Number(ts || 0);
  if (age < 2 * DAY)  return 'Last 2 days';
  if (age < 7 * DAY)  return 'This week';
  if (age < 30 * DAY) return 'This month';
  if (age < 90 * DAY) return 'Last 3 months';
  return 'Older';
}

function trendLabel(score: number) {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'rising';
  if (score >= 40) return 'stable';
  return 'declining';
}

// ── Wishlist page ──────────────────────────────────────────────────────────────

export default function WishlistPage() {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [mounted, setMounted]         = useState(false);

  // Filters
  const [marketplace, setMarketplace] = useState('All Marketplaces');
  const [signal,      setSignal]      = useState('All Signals');
  const [trend,       setTrend]       = useState('All Trends');
  const [channel,     setChannel]     = useState('All Channels');
  const [timeRange,   setTimeRange]   = useState('All Time');

  useEffect(() => {
    setMounted(true);
    setWishlistIds(getWishlist());
  }, []);

  // Fetch all opportunities then filter to wishlist IDs
  const { data: allOpps = [], isLoading } = useQuery<any[]>({
    queryKey: ['opportunities'],
    queryFn: () => api.opportunities.list(),
    enabled: mounted,
  });

  const wishlistedOpps = useMemo(
    () => allOpps.filter((o: any) => wishlistIds.includes(o.id)),
    [allOpps, wishlistIds],
  );

  // Unique marketplaces across wishlisted items
  const mpOptions = useMemo(() => {
    const seen = new Set<string>();
    wishlistedOpps.forEach((o: any) => {
      const code = o.marketplace?.code || '';
      if (code) seen.add(code);
    });
    return ['All Marketplaces', ...Array.from(seen)];
  }, [wishlistedOpps]);

  const filtered = useMemo(() => {
    return wishlistedOpps.filter((o: any) => {
      const code = o.marketplace?.code || '';
      const sig  = (o.score?.signal || o.recommendation || '').toLowerCase();
      const tr   = trendLabel(o.score?.trend || 0);
      const ch   = code.split('_')[0];
      const age  = ageKey(o.createdAt);

      if (marketplace !== 'All Marketplaces' && code !== marketplace) return false;
      if (signal !== 'All Signals' && sig !== signal) return false;
      if (trend  !== 'All Trends'  && tr  !== trend)  return false;
      if (channel !== 'All Channels' && ch !== channel) return false;
      if (timeRange !== 'All Time' && age !== timeRange) return false;
      return true;
    });
  }, [wishlistedOpps, marketplace, signal, trend, channel, timeRange]);

  function handleRemove(id: string) {
    removeFromWishlist(id);
    setWishlistIds(prev => prev.filter(i => i !== id));
  }

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page heading */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white">Wishlist</h1>
        <p className="text-sm text-white/40 mt-1">
          Saved scout opportunities — {wishlistIds.length} saved{filtered.length !== wishlistIds.length ? `, ${filtered.length} shown` : ''}
        </p>
      </div>

      {/* Filter bar — matches filter.PNG layout */}
      <div className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-2xl border border-white/8 bg-white/[0.02]">
        <select value={marketplace} onChange={e => setMarketplace(e.target.value)}
          className="bg-transparent border border-white/12 text-white/70 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500/50 cursor-pointer">
          {mpOptions.map(m => (
            <option key={m} value={m} className="bg-[#0d1225]">{m}</option>
          ))}
        </select>

        <select value={signal} onChange={e => setSignal(e.target.value)}
          className="bg-transparent border border-white/12 text-white/70 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500/50 cursor-pointer">
          {SIGNAL_OPTIONS.map(s => (
            <option key={s} value={s} className="bg-[#0d1225] capitalize">{s === 'All Signals' ? 'All Signals' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <select value={trend} onChange={e => setTrend(e.target.value)}
          className="bg-transparent border border-white/12 text-white/70 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500/50 cursor-pointer">
          {TREND_OPTIONS.map(t => (
            <option key={t} value={t} className="bg-[#0d1225] capitalize">{t === 'All Trends' ? 'All Trends' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        <select value={channel} onChange={e => setChannel(e.target.value)}
          className="bg-transparent border border-white/12 text-white/70 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500/50 cursor-pointer">
          {CHANNEL_OPTIONS.map(c => (
            <option key={c} value={c} className="bg-[#0d1225] capitalize">{c === 'All Channels' ? 'All Channels' : PLATFORM_NAMES[c] || c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>

        <select value={timeRange} onChange={e => setTimeRange(e.target.value)}
          className="bg-transparent border border-white/12 text-white/70 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500/50 cursor-pointer">
          {TIME_OPTIONS.map(t => (
            <option key={t} value={t} className="bg-[#0d1225]">{t}</option>
          ))}
        </select>

        {(marketplace !== 'All Marketplaces' || signal !== 'All Signals' || trend !== 'All Trends' || channel !== 'All Channels' || timeRange !== 'All Time') && (
          <button onClick={() => { setMarketplace('All Marketplaces'); setSignal('All Signals'); setTrend('All Trends'); setChannel('All Channels'); setTimeRange('All Time'); }}
            className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded-lg hover:bg-violet-500/10 transition-colors ml-auto">
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin text-3xl text-violet-400">⟳</div>
        </div>
      ) : wishlistIds.length === 0 ? (
        /* Empty state — nothing saved */
        <div className="card-dark rounded-2xl p-16 text-center">
          <div className="text-6xl mb-5">🌟</div>
          <h2 className="text-xl font-bold text-white mb-2">No saved opportunities yet</h2>
          <p className="text-sm text-white/40 mb-6 max-w-sm mx-auto">
            Go to Scout, click the bookmark icon on any opportunity row, and it will appear here.
          </p>
          <Link href="/opportunities" className="btn-primary text-sm">
            Browse Scout →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        /* Filtered — nothing matched */
        <div className="card-dark rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-white/50 mb-4">No saved opportunities match the current filters.</p>
          <button onClick={() => { setMarketplace('All Marketplaces'); setSignal('All Signals'); setTrend('All Trends'); setChannel('All Channels'); setTimeRange('All Time'); }}
            className="btn-secondary text-sm">
            Clear filters
          </button>
        </div>
      ) : (
        {/* Mobile card list */}
        <div className="sm:hidden space-y-2">
          {filtered.map((opp: any) => {
            const code = opp.marketplace?.code || '';
            const cc   = countryCode(code);
            const net  = opp.profitModel?.netProfitMinor ?? 0;
            const sig  = (opp.score?.signal || opp.recommendation || '').toLowerCase();
            const score = Math.round(opp.score?.opportunity || 0);
            const scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
            return (
              <div key={opp.id} className="card-dark rounded-xl p-4 flex flex-col gap-3">
                {/* Top: title + score */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm leading-snug line-clamp-2">
                      {opp.product?.title || 'Unnamed product'}
                    </div>
                    <div className="text-xs text-white/45 mt-1 leading-snug">
                      {cc ? flag(cc) : '🛒'} {platformOf(code)}{cc ? ` · ${cc}` : ''}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 shrink-0"
                    style={{ color: scoreColor, borderColor: scoreColor+'60', backgroundColor: scoreColor+'12' }}>
                    {score}
                  </div>
                </div>
                {/* Middle: signal + net profit */}
                <div className="flex items-center justify-between gap-2">
                  <RecommendationBadge rec={sig} />
                  <span className={`text-sm font-bold tabular-nums ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {net < 0 ? '-' : '+'}{usd(Math.abs(net))}/unit
                  </span>
                </div>
                {/* Bottom: actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/8">
                  <Link href={`/opportunities/${opp.id}`}
                    className="flex-1 text-center text-xs px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors shadow-[0_0_8px_rgba(124,58,237,0.4)] whitespace-nowrap">
                    Full Report →
                  </Link>
                  <button onClick={() => handleRemove(opp.id)}
                    className="px-3 py-2 rounded-lg border border-white/10 text-white/50 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/8 transition-colors text-xs">
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block card-dark rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8 text-[11px] text-white/55 uppercase tracking-widest">
                <th className="text-left px-5 py-3 font-semibold">Product</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Marketplace</th>
                <th className="text-center px-4 py-3 font-semibold">Score</th>
                <th className="text-center px-4 py-3 font-semibold hidden md:table-cell">Signal</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">Net Profit</th>
                <th className="text-center px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((opp: any) => {
                const code = opp.marketplace?.code || '';
                const cc   = countryCode(code);
                const net  = opp.profitModel?.netProfitMinor ?? 0;
                const sig  = (opp.score?.signal || opp.recommendation || '').toLowerCase();
                return (
                  <tr key={opp.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-medium text-white text-sm leading-snug line-clamp-2 max-w-xs">
                        {opp.product?.title || 'Unnamed product'}
                      </div>
                      <div className="text-[11px] text-white/55 mt-0.5 sm:hidden">
                        {cc ? flag(cc) : '🛒'} {platformOf(code)}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-white/55">
                        <span>{cc ? flag(cc) : '🛒'}</span>
                        <span>{platformOf(code)}</span>
                        {cc && <span className="text-[10px] text-white/50">{cc}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <ScoreBadge score={opp.score?.opportunity || 0} />
                    </td>
                    <td className="px-4 py-4 text-center hidden md:table-cell">
                      <RecommendationBadge rec={sig} />
                    </td>
                    <td className="px-4 py-4 text-right hidden lg:table-cell">
                      <span className={`font-mono font-semibold text-sm ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {net < 0 ? '-' : '+'}{usd(Math.abs(net))}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/opportunities/${opp.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors shadow-[0_0_8px_rgba(124,58,237,0.4)] hover:shadow-[0_0_14px_rgba(124,58,237,0.6)] whitespace-nowrap">
                          Full Report
                        </Link>
                        <button onClick={() => handleRemove(opp.id)}
                          title="Remove from wishlist"
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/8 transition-colors">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
