import { Injectable } from '@nestjs/common';
import {
  demandScore, competitionScore, marginScore, saturationScore,
  trendScore, shippingScore, marketplaceFitScore, opportunityScore,
  recommend, confidence, SCORE_VERSION,
} from '@borderscout/core';
import { computeProfit } from '@borderscout/core';

@Injectable()
export class ScoringService {
  scoreMockOpportunity(product: any, marketplace: any) {
    const demand = demandScore({
      searchVolume: Math.random() * 50000 + 10000,
      salesRank: Math.floor(Math.random() * 5000 + 100),
      reviewVelocity: Math.random() * 200 + 20,
      categoryGrowth: Math.random() * 30 + 5,
      maxSearchVolume: 60000,
      maxReviewVelocity: 250,
      maxCategoryGrowth: 40,
    });

    const competition = competitionScore({
      activeSellerCount: Math.floor(Math.random() * 300 + 20),
      avgReviewCountTop10: Math.floor(Math.random() * 500 + 50),
      brandDominancePct: Math.random() * 60,
      maxSellerCount: 400,
      maxAvgReviewCount: 600,
    });

    const feeSchedule = JSON.parse(marketplace.feeSchedule);
    const salePriceMinor = Math.floor(Math.random() * 3000 + 1500);
    const productCostMinor = Math.floor(salePriceMinor * (0.15 + Math.random() * 0.2));

    const profit = computeProfit({
      productCostMinor,
      packagingCostMinor: 150,
      intlShippingMinor: 300,
      dutyMinor: Math.floor(productCostMinor * 0.05),
      salePriceMinor,
      referralFeePct: feeSchedule.referralPct || 15,
      fbaFeeMinor: feeSchedule.fbaFeeMinor || 350,
      storageFeeMajor: feeSchedule.storageFee || 50,
      adAcosPct: 15,
      taxRatePct: 0,
      currency: marketplace.currency,
      estMonthlyVolume: Math.floor(Math.random() * 200 + 50),
      fixedLaunchCost: 50000,
    });

    const margin = marginScore({ netMarginPct: profit.netMarginPct });
    const saturation = saturationScore({
      newListingsPerMonth: Math.random() * 100 + 10,
      priceCompressionPct: Math.random() * 20,
      adDensityPct: Math.random() * 40 + 10,
      maxNewListings: 120,
    });
    const trend = trendScore({
      trendType: ['rising', 'evergreen', 'seasonal'][Math.floor(Math.random() * 3)] as any,
      momentum: Math.random() * 80 + 20,
      searchInterestSlope: Math.random() * 80,
    });
    const shipping = shippingScore({
      weightG: product.weightG || 400,
      dimWeightG: (product.weightG || 400) * 1.2,
      isFragile: false,
      leadTimeDays: 21,
    });
    const marketplaceFit = marketplaceFitScore({
      categoryFitWeight: Math.random() * 40 + 60,
      restrictionPenalty: Math.random() * 20,
      audienceFitWeight: Math.random() * 30 + 60,
      priceBandFitWeight: Math.random() * 30 + 50,
    });

    const sub = { demand, competition, margin, saturation, trend, shipping, marketplaceFit };
    const score = opportunityScore(sub, { feasibility: 'moderate', leadTimeDays: 21 });
    const recommendation = recommend(score.opportunity, margin, false);
    const conf = confidence(score.opportunity, 0.85, 0.9);

    return { score, recommendation, confidence: conf, profit, scoreVersion: SCORE_VERSION };
  }
}
