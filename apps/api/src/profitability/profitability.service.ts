import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { computeProfit } from '@sellbodr/core';

@Injectable()
export class ProfitabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfit(opportunityId: string, userId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, search: { userId } },
      include: { profitModel: true, marketplace: true },
    });
    if (!opp || !opp.profitModel) throw new NotFoundException('Profit model not found');
    return opp.profitModel;
  }

  async recalculate(opportunityId: string, userId: string, assumptions: any) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, search: { userId } },
      include: { profitModel: true, marketplace: true },
    });
    if (!opp || !opp.profitModel) throw new NotFoundException('Opportunity not found');

    const feeSchedule = JSON.parse(opp.marketplace.feeSchedule);
    const pm = opp.profitModel;

    const newProfit = computeProfit({
      productCostMinor: pm.productCostMinor,
      packagingCostMinor: pm.packagingCostMinor,
      intlShippingMinor: pm.intlShippingMinor,
      dutyMinor: 0,
      salePriceMinor: assumptions.salePriceMinor || pm.salePriceMinor,
      referralFeePct: feeSchedule.referralPct || 15,
      fbaFeeMinor: pm.fbaFeeMinor,
      storageFeeMajor: pm.storageFeeMajor,
      adAcosPct: assumptions.adAcosPct || 15,
      taxRatePct: 0,
      currency: pm.currency,
      estMonthlyVolume: assumptions.monthlyVolume || 100,
      fixedLaunchCost: 50000,
    });

    return newProfit;
  }
}
