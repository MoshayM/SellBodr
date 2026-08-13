'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { ScoreGauge, RecommendationBadge } from '@/components/ui/ScoreGauge';
import { getMarketplaceDef, getMarketplaceSearchUrl } from '@/lib/marketplace';

// ── Marketplace Logo Badge ────────────────────────────────────────────────────

function MarketplaceBadge({ code, href }: { code: string; href: string }) {
  const m = getMarketplaceDef(code);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all hover:opacity-80 hover:shadow-sm"
      style={{ backgroundColor: m.bgColor, color: m.textColor, borderColor: m.borderColor }}
      title={`View on ${m.displayName}`}
    >
      {/* Marketplace logo circle */}
      <span
        className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold leading-none"
        style={{ backgroundColor: m.logoColor, fontSize: '7px' }}
      >
        {m.logoChar}
      </span>
      {m.shortName}
      <svg className="w-2.5 h-2.5 opacity-60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

// ── AI Verified Badge ─────────────────────────────────────────────────────────

function AiVerifiedBadge({ confidence }: { confidence?: number | null }) {
  if (!confidence || confidence <= 0) return null;
  if (confidence >= 95) {
    return (
      <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        AI Verified
      </span>
    );
  }
  if (confidence >= 80) {
    return (
      <span className="absolute top-2 right-2 text-[9px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full shadow">
        ~{Math.round(confidence)}%
      </span>
    );
  }
  return null;
}

// ── Image Placeholder ─────────────────────────────────────────────────────────

function ImagePlaceholder({ title, reason }: { title?: string; reason?: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-4">
      <span className="text-3xl opacity-40">📦</span>
      {title && (
        <span className="text-[9px] text-gray-400 text-center line-clamp-2 leading-tight">{title}</span>
      )}
      {reason && (
        <span className="text-[8px] text-gray-300 text-center italic">{reason}</span>
      )}
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ opp }: { opp: any }) {
  const [imgError, setImgError] = useState(false);
  const product = opp.product ?? {};
  const marketplace = opp.marketplace ?? {};
  const s = opp.score ?? {};
  const score = Math.round(s.opportunity ?? 0);

  const listingHref =
    product.marketplaceUrl ||
    getMarketplaceSearchUrl(marketplace.code, product.title);

  const m = getMarketplaceDef(marketplace.code);

  const showImage =
    product.imageUrl &&
    !imgError &&
    !product.imageUrl.includes('picsum.photos');

  return (
    <div className="card overflow-hidden rounded-xl hover:shadow-md transition-shadow flex flex-col bg-white border border-gray-100">

      {/* ── Product Image ── */}
      <div className="relative w-full h-44 bg-gray-50 flex-shrink-0">
        {showImage ? (
          <Image
            src={product.imageUrl}
            alt={product.title ?? 'Product'}
            fill
            className="object-cover"
            onError={() => setImgError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <ImagePlaceholder
            title={product.title}
            reason={!product.imageUrl ? 'No verified image' : undefined}
          />
        )}
        <AiVerifiedBadge confidence={product.imageConfidence} />
      </div>

      {/* ── Card Body ── */}
      <div className="p-4 flex flex-col flex-1 gap-2.5">

        {/* Title */}
        <div className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {product.title}
        </div>

        {/* Marketplace badge + category */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <MarketplaceBadge code={marketplace.code} href={listingHref} />
          {product.category && (
            <span className="text-[10px] text-gray-400 capitalize">
              {product.category.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Seller */}
        {product.seller && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 truncate">{product.seller}</span>
            {product.sellerRating != null && (
              <span className="text-[10px] text-amber-500 font-medium flex-shrink-0">
                ★ {Number(product.sellerRating).toFixed(1)}
              </span>
            )}
          </div>
        )}

        {/* Scores */}
        <div className="flex items-center gap-2">
          <ScoreGauge score={score} size="sm" />
          <div className="grid grid-cols-2 gap-1 flex-1">
            {[
              { label: 'Demand',  value: s.demand },
              { label: 'Margin',  value: s.margin },
              { label: 'Trend',   value: s.trend },
              { label: 'Comp.',   value: s.competition },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded px-1.5 py-1">
                <div className="text-[9px] text-gray-400">{label}</div>
                <div className={`text-xs font-bold ${
                  (value ?? 0) >= 70 ? 'text-green-700' :
                  (value ?? 0) >= 40 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {Math.round(value ?? 0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
          <RecommendationBadge rec={opp.recommendation} confidence={Math.round(opp.confidence ?? 0)} />
          <div className="flex items-center gap-1.5">
            <a
              href={listingHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 text-[10px] font-medium border border-gray-200 rounded px-2 py-0.5 transition-colors hover:bg-gray-50"
              style={{ color: m.logoColor }}
              title={`View on ${m.displayName}`}
            >
              {/* tiny marketplace logo in button */}
              <span
                className="w-3 h-3 rounded-full flex items-center justify-center text-white leading-none flex-shrink-0"
                style={{ backgroundColor: m.logoColor, fontSize: '6px' }}
              >
                {m.logoChar}
              </span>
              View on {m.shortName}
            </a>
            <Link
              href={`/opportunities/${opp.id}?tab=Research`}
              className="text-[10px] text-green-600 font-medium hover:text-green-700 border border-green-200 bg-green-50 rounded px-2 py-0.5 transition-colors"
            >
              Research →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const { data: opps = [], isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => api.opportunities.list({}),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="card overflow-hidden rounded-xl animate-pulse bg-white border border-gray-100">
            <div className="h-44 bg-gray-100" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-8 bg-gray-100 rounded w-full" />
              <div className="h-6 bg-gray-100 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if ((opps as any[]).length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Product Research</h1>
          <p className="text-sm text-gray-400 mt-0.5">AI-validated product opportunities with marketplace intelligence</p>
        </div>
        <div className="card p-12 sm:p-16 text-center">
          <div className="text-4xl mb-3">🔬</div>
          <p className="font-medium text-gray-700 mb-1">No research data yet</p>
          <p className="text-sm text-gray-400">
            <Link href="/opportunities" className="text-green-600 hover:underline">Run a search</Link> to start generating research
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Research</h1>
          <p className="text-sm text-gray-400 mt-0.5">AI-validated product opportunities with marketplace intelligence</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> AI Verified
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Likely Match
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {(opps as any[]).map((opp: any) => (
          <ProductCard key={opp.id} opp={opp} />
        ))}
      </div>
    </div>
  );
}
