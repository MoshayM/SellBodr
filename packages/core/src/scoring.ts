import {
  CompetitionInputs, DemandInputs, MarginInputs, MarketplaceFitInputs,
  OpportunityScore, Recommendation, SaturationInputs, SCORE_VERSION,
  SCORE_WEIGHTS, ShippingInputs, SourcingContext, SubScores, TrendInputs, TrendType,
} from './types';

function clamp(val: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, val));
}

function norm(val: number, max: number): number {
  if (max <= 0) return 0;
  return clamp((val / max) * 100);
}

export function demandScore(inputs: DemandInputs): number {
  const { searchVolume, salesRank, reviewVelocity, categoryGrowth,
    maxSearchVolume, maxReviewVelocity, maxCategoryGrowth } = inputs;
  const salesRankInverse = salesRank > 0 ? 1 / salesRank : 0;
  const maxRankInverse = 1 / 1;
  return clamp(
    0.35 * norm(searchVolume, maxSearchVolume) +
    0.25 * norm(salesRankInverse, maxRankInverse) * 100 +
    0.20 * norm(reviewVelocity, maxReviewVelocity) +
    0.20 * norm(categoryGrowth, maxCategoryGrowth),
  );
}

export function competitionScore(inputs: CompetitionInputs): number {
  const { activeSellerCount, avgReviewCountTop10, brandDominancePct,
    maxSellerCount, maxAvgReviewCount } = inputs;
  return clamp(
    100 - (
      0.40 * norm(activeSellerCount, maxSellerCount) +
      0.30 * norm(avgReviewCountTop10, maxAvgReviewCount) +
      0.30 * clamp(brandDominancePct)
    ),
  );
}

export function marginScore(inputs: MarginInputs): number {
  const { netMarginPct } = inputs;
  if (netMarginPct <= 0) return 0;
  if (netMarginPct >= 45) return 100;
  if (netMarginPct >= 30) return 70 + ((netMarginPct - 30) / 15) * 30;
  if (netMarginPct >= 15) return 40 + ((netMarginPct - 15) / 15) * 30;
  return (netMarginPct / 15) * 40;
}

export function saturationScore(inputs: SaturationInputs): number {
  const { newListingsPerMonth, priceCompressionPct, adDensityPct, maxNewListings } = inputs;
  return clamp(
    100 - (
      0.50 * norm(newListingsPerMonth, maxNewListings) +
      0.30 * clamp(priceCompressionPct) +
      0.20 * clamp(adDensityPct)
    ),
  );
}

const TREND_TYPE_WEIGHTS: Record<TrendType, number> = {
  rising: 100,
  evergreen: 80,
  seasonal: 70,
  declining: 0,
};

export function trendScore(inputs: TrendInputs): number {
  const { trendType, momentum, searchInterestSlope } = inputs;
  return clamp(
    0.50 * clamp(momentum) +
    0.30 * TREND_TYPE_WEIGHTS[trendType] +
    0.20 * norm(Math.max(0, searchInterestSlope), 100),
  );
}

export function shippingScore(inputs: ShippingInputs): number {
  const { weightG, dimWeightG, isFragile, leadTimeDays } = inputs;
  const weightScore = weightG < 250 ? 100 : weightG > 2000 ? 20 : 100 - ((weightG - 250) / 1750) * 80;
  const dimScore = dimWeightG < 300 ? 100 : dimWeightG > 2500 ? 20 : 100 - ((dimWeightG - 300) / 2200) * 80;
  const fragilityScore = isFragile ? 30 : 100;
  const leadScore = leadTimeDays <= 14 ? 100 : leadTimeDays >= 60 ? 20 : 100 - ((leadTimeDays - 14) / 46) * 80;
  return clamp(
    0.50 * weightScore +
    0.25 * dimScore +
    0.15 * fragilityScore +
    0.10 * leadScore,
  );
}

export function marketplaceFitScore(inputs: MarketplaceFitInputs): number {
  const { categoryFitWeight, restrictionPenalty, audienceFitWeight, priceBandFitWeight } = inputs;
  return clamp(
    0.40 * clamp(categoryFitWeight) +
    0.25 * clamp(100 - restrictionPenalty) +
    0.20 * clamp(audienceFitWeight) +
    0.15 * clamp(priceBandFitWeight),
  );
}

export function opportunityScore(sub: SubScores, sourcing: SourcingContext): OpportunityScore {
  let raw =
    SCORE_WEIGHTS.demand * sub.demand +
    SCORE_WEIGHTS.margin * sub.margin +
    SCORE_WEIGHTS.competition * sub.competition +
    SCORE_WEIGHTS.trend * sub.trend +
    SCORE_WEIGHTS.marketplaceFit * sub.marketplaceFit +
    SCORE_WEIGHTS.shipping * sub.shipping +
    SCORE_WEIGHTS.saturation * sub.saturation;

  raw = Math.round(raw);

  // Hard gates
  if (sub.margin < 30) raw = Math.min(raw, 49);
  if (sub.shipping < 25) raw = Math.min(raw, 55);
  if (sub.marketplaceFit < 30) raw = Math.min(raw, 45);
  if (sourcing.feasibility === 'hard') raw = Math.max(0, raw - 10);

  const opportunity = clamp(raw);

  const breakdown: OpportunityScore['breakdown'] = {};
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    const subKey = key as keyof SubScores;
    breakdown[key] = {
      raw: sub[subKey],
      normalized: sub[subKey],
      weight,
      contribution: Math.round(weight * sub[subKey] * 100) / 100,
    };
  }

  return { ...sub, opportunity, breakdown };
}

export function recommend(score: number, marginScore: number, hasBlockingRestriction: boolean): Recommendation {
  if (score >= 80 && marginScore >= 35 && !hasBlockingRestriction) return 'launch';
  if (score >= 60) return 'hold';
  return 'reject';
}

export function confidence(
  opportunityScore: number,
  dataCompletenessFactor: number,
  groundingFactor: number,
): number {
  const base = opportunityScore;
  return clamp(Math.round(base * dataCompletenessFactor * groundingFactor));
}

export { SCORE_VERSION };
