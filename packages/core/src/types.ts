export type Recommendation = 'launch' | 'hold' | 'reject';
export type TrendType = 'rising' | 'seasonal' | 'evergreen' | 'declining';
export type SourcingFeasibility = 'easy' | 'moderate' | 'hard';
export type MarketplaceCode =
  | 'amazon_us' | 'amazon_uk' | 'amazon_de' | 'amazon_ca' | 'amazon_au'
  | 'etsy' | 'ebay' | 'walmart' | 'shopify' | 'tiktok_shop'
  | 'temu' | 'noon' | 'lazada' | 'shopee';

export interface SubScores {
  demand: number;
  competition: number;
  margin: number;
  saturation: number;
  trend: number;
  shipping: number;
  marketplaceFit: number;
}

export interface OpportunityScore extends SubScores {
  opportunity: number;
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  [signal: string]: {
    raw: number;
    normalized: number;
    weight: number;
    contribution: number;
  };
}

export interface DemandInputs {
  searchVolume: number;
  salesRank: number;
  reviewVelocity: number;
  categoryGrowth: number;
  maxSearchVolume: number;
  maxReviewVelocity: number;
  maxCategoryGrowth: number;
}

export interface CompetitionInputs {
  activeSellerCount: number;
  avgReviewCountTop10: number;
  brandDominancePct: number;
  maxSellerCount: number;
  maxAvgReviewCount: number;
}

export interface MarginInputs {
  netMarginPct: number;
}

export interface SaturationInputs {
  newListingsPerMonth: number;
  priceCompressionPct: number;
  adDensityPct: number;
  maxNewListings: number;
}

export interface TrendInputs {
  trendType: TrendType;
  momentum: number;
  searchInterestSlope: number;
}

export interface ShippingInputs {
  weightG: number;
  dimWeightG: number;
  isFragile: boolean;
  leadTimeDays: number;
}

export interface MarketplaceFitInputs {
  categoryFitWeight: number;
  restrictionPenalty: number;
  audienceFitWeight: number;
  priceBandFitWeight: number;
}

export interface SourcingContext {
  feasibility: SourcingFeasibility;
  leadTimeDays: number;
}

export interface ProfitInputs {
  productCostMinor: number;
  packagingCostMinor: number;
  intlShippingMinor: number;
  dutyMinor: number;
  salePriceMinor: number;
  referralFeePct: number;
  fbaFeeMinor: number;
  storageFeeMajor: number;
  adAcosPct: number;
  taxRatePct: number;
  currency: string;
  estMonthlyVolume: number;
  fixedLaunchCost: number;
}

export interface ProfitModel {
  currency: string;
  salePriceMinor: number;
  productCostMinor: number;
  packagingCostMinor: number;
  intlShippingMinor: number;
  dutyMinor: number;
  fbaFeeMinor: number;
  referralFeeMinor: number;
  storageFeeMajor: number;
  adCostMinor: number;
  taxMinor: number;
  landedCostMinor: number;
  marketplaceFeesMinor: number;
  grossProfitMinor: number;
  netProfitMinor: number;
  roiPct: number;
  breakevenUnits: number;
  monthlyProfitMinor: number;
  annualProfitMinor: number;
  netMarginPct: number;
}

export const SCORE_VERSION = '2.0.0';

export const SCORE_WEIGHTS: Record<keyof SubScores, number> = {
  demand: 0.22,
  margin: 0.20,
  competition: 0.16,
  trend: 0.14,
  marketplaceFit: 0.12,
  shipping: 0.10,
  saturation: 0.06,
};
