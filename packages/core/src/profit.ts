import { ProfitInputs, ProfitModel } from './types';

export function computeProfit(inputs: ProfitInputs): ProfitModel {
  const {
    productCostMinor, packagingCostMinor, intlShippingMinor, dutyMinor,
    salePriceMinor, referralFeePct, fbaFeeMinor, storageFeeMajor,
    adAcosPct, taxRatePct, currency, estMonthlyVolume, fixedLaunchCost,
  } = inputs;

  const referralFeeMinor = Math.round(salePriceMinor * (referralFeePct / 100));
  const storageFeeMajor2 = Math.round(storageFeeMajor);
  const adCostMinor = Math.round(salePriceMinor * (adAcosPct / 100));

  const landedCostMinor = productCostMinor + packagingCostMinor + intlShippingMinor + dutyMinor;
  const marketplaceFeesMinor = referralFeeMinor + fbaFeeMinor + storageFeeMajor2;
  const grossProfitMinor = salePriceMinor - landedCostMinor - marketplaceFeesMinor;
  const taxMinor = Math.round(Math.max(0, grossProfitMinor) * (taxRatePct / 100));
  const netProfitMinor = grossProfitMinor - adCostMinor - taxMinor;

  const totalInvestmentMinor = landedCostMinor + adCostMinor;
  const roiPct = totalInvestmentMinor > 0
    ? Math.round((netProfitMinor / totalInvestmentMinor) * 10000) / 100
    : 0;

  const breakevenUnits = netProfitMinor > 0
    ? Math.ceil(fixedLaunchCost / netProfitMinor)
    : 9999;

  const monthlyProfitMinor = netProfitMinor * estMonthlyVolume;
  const annualProfitMinor = monthlyProfitMinor * 12;
  const netMarginPct = salePriceMinor > 0
    ? Math.round((netProfitMinor / salePriceMinor) * 10000) / 100
    : 0;

  return {
    currency,
    salePriceMinor,
    productCostMinor,
    packagingCostMinor,
    intlShippingMinor,
    dutyMinor,
    fbaFeeMinor,
    referralFeeMinor,
    storageFeeMajor: storageFeeMajor2,
    adCostMinor,
    taxMinor,
    landedCostMinor,
    marketplaceFeesMinor,
    grossProfitMinor,
    netProfitMinor,
    roiPct,
    breakevenUnits,
    monthlyProfitMinor,
    annualProfitMinor,
    netMarginPct,
  };
}
