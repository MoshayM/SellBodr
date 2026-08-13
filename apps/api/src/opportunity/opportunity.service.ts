import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ScoringService } from './scoring.service';
import { ProductNormalizerService } from './product-normalizer.service';
import { ImageValidationService } from './image-validation.service';

function indiamartUrl(keyword: string) {
  return `https://www.indiamart.com/search.mp?ss=${encodeURIComponent(keyword)}`;
}
function alibabaUrl(keyword: string) {
  return `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(keyword)}`;
}
function tradeindiamUrl(keyword: string) {
  return `https://www.tradeindia.com/search/?keyword=${encodeURIComponent(keyword)}`;
}

interface SupplierDef { name: string; source: string; location: string; sourceUrl: string; verified: boolean; exportExperience: string; }
function suppliersFor(category: string): SupplierDef[] {
  const kw = category.replace(/_/g, ' ');
  return [
    { name: `IndiaMART — ${kw}`,  source: 'indiamart',  location: 'Rajasthan, India', sourceUrl: indiamartUrl(kw),   verified: true,  exportExperience: 'experienced' },
    { name: `Alibaba — ${kw}`,    source: 'alibaba',    location: 'Gujarat, India',   sourceUrl: alibabaUrl(kw),     verified: false, exportExperience: 'moderate'    },
    { name: `TradeIndia — ${kw}`, source: 'tradeindia', location: 'Delhi, India',     sourceUrl: tradeindiamUrl(kw), verified: false, exportExperience: 'beginner'    },
  ];
}

@Injectable()
export class OpportunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly normalizer: ProductNormalizerService,
    private readonly imageValidator: ImageValidationService,
  ) {}

  async createSearch(userId: string, orgId: string, filters: any) {
    const search = await this.prisma.search.create({
      data: {
        userId,
        filters: JSON.stringify(filters),
        status: 'running',
        startedAt: new Date(),
      },
    });

    setImmediate(() => this.runPipeline(search.id, userId, orgId, filters));
    return { searchId: search.id, status: 'running' };
  }

  async getSearch(id: string, userId: string) {
    const search = await this.prisma.search.findFirst({
      where: { id, userId },
      include: { opportunities: { include: { score: true, product: true, marketplace: true } } },
    });
    if (!search) throw new NotFoundException('Search not found');
    return search;
  }

  async listOpportunities(userId: string, query: any) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.prisma.opportunity.findMany({
      where: {
        search: { userId: user.id },
        ...(query.recommendation && { recommendation: query.recommendation }),
        ...(query.marketplace && { marketplace: { code: query.marketplace } }),
      },
      include: { score: true, product: true, marketplace: true },
      orderBy: { score: { opportunity: 'desc' } },
      take: parseInt(query.limit || '20'),
      skip: parseInt(query.page || '0') * parseInt(query.limit || '20'),
    });
  }

  async getOpportunity(id: string, userId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, search: { userId } },
      include: {
        score: true, product: true, marketplace: true,
        profitModel: true, sourcingCandidates: { include: { supplier: true } },
        competitors: { include: { reviewInsights: true } },
        launchAsset: true,
      },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
  }

  async listSearches(userId: string) {
    return this.prisma.search.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { opportunities: true } } },
    });
  }

  private async runPipeline(searchId: string, userId: string, orgId: string, filters: any) {
    try {
      const marketplaceCode = filters.marketplace || 'amazon_us';
      const marketplace = await this.prisma.marketplace.findUnique({ where: { code: marketplaceCode } });
      if (!marketplace || !marketplace.active) {
        await this.prisma.search.update({ where: { id: searchId }, data: { status: 'failed' } });
        return;
      }

      const catalog = this.normalizer.getCatalog().slice(0, 6);

      for (const productDef of catalog) {
        // Validate image via Claude Vision — rejects landscape photos, unrelated imagery
        const validation = await this.imageValidator.validateAsync(productDef);

        // Build the marketplace-specific URL for this opportunity
        const listingUrl = productDef.marketplaceUrl ||
          this.normalizer.getMarketplaceSearchUrl(marketplaceCode, productDef.title);

        const productData = {
          title: productDef.title,
          category: productDef.category,
          weightG: productDef.weightG,
          isLightweight: productDef.isLightweight,
          imageUrl: validation.confidence >= 80 ? productDef.imageUrl : null,
          imageSource: productDef.imageSource,
          imageConfidence: validation.confidence,
          marketplaceUrl: listingUrl,
          seller: productDef.seller,
          sellerRating: productDef.sellerRating,
        };

        let product = await (this.prisma.product as any).findFirst({ where: { title: productDef.title } });
        if (!product) {
          product = await (this.prisma.product as any).create({ data: productData });
        } else {
          // Always overwrite image/seller fields so stale picsum URLs get replaced immediately
          product = await (this.prisma.product as any).update({
            where: { id: product.id },
            data: {
              imageUrl: productData.imageUrl,
              imageSource: productData.imageSource,
              imageConfidence: productData.imageConfidence,
              marketplaceUrl: productData.marketplaceUrl,
              seller: productData.seller,
              sellerRating: productData.sellerRating,
              isLightweight: productData.isLightweight,
            },
          });
        }

        if (!product) continue;

        const existing = await this.prisma.opportunity.findFirst({
          where: { searchId, productId: product.id, marketplaceId: marketplace.id },
        });
        if (existing) continue;

        const { score, recommendation, confidence: conf, profit, scoreVersion } =
          this.scoring.scoreMockOpportunity(product, marketplace);

        const opp = await this.prisma.opportunity.create({
          data: {
            searchId, productId: product.id, marketplaceId: marketplace.id,
            status: 'scored', recommendation, confidence: conf, scoreVersion,
          },
        });

        await this.prisma.score.create({
          data: {
            opportunityId: opp.id,
            demand: score.demand, competition: score.competition, margin: score.margin,
            saturation: score.saturation, trend: score.trend, shipping: score.shipping,
            marketplaceFit: score.marketplaceFit, opportunity: score.opportunity,
            breakdown: JSON.stringify(score.breakdown),
          },
        });

        await this.prisma.profitModel.create({
          data: {
            opportunityId: opp.id,
            currency: profit.currency,
            salePriceMinor: profit.salePriceMinor,
            productCostMinor: profit.productCostMinor,
            packagingCostMinor: profit.packagingCostMinor,
            intlShippingMinor: profit.intlShippingMinor,
            fbaFeeMinor: profit.fbaFeeMinor,
            referralFeeMinor: profit.referralFeeMinor,
            storageFeeMajor: profit.storageFeeMajor,
            adCostMinor: profit.adCostMinor,
            taxMinor: profit.taxMinor,
            landedCostMinor: profit.landedCostMinor,
            marketplaceFeesMinor: profit.marketplaceFeesMinor,
            grossProfitMinor: profit.grossProfitMinor,
            netProfitMinor: profit.netProfitMinor,
            roiPct: profit.roiPct,
            breakevenUnits: profit.breakevenUnits,
            monthlyProfitMinor: profit.monthlyProfitMinor,
            annualProfitMinor: profit.annualProfitMinor,
            netMarginPct: profit.netMarginPct,
          },
        });

        const supplierDefs = suppliersFor(product.category);
        const moqList     = [50, 100, 200];
        const leadList    = [14, 21, 30];
        const feasList    = ['easy', 'moderate', 'hard'];
        const costFactors = [1.0, 1.15, 0.9];

        for (let si = 0; si < supplierDefs.length; si++) {
          const sd = supplierDefs[si];
          const supplier = await (this.prisma.supplier.create as any)({ data: sd });
          await this.prisma.sourcingCandidate.create({
            data: {
              opportunityId: opp.id, supplierId: supplier.id,
              productCostMinor: Math.round(profit.productCostMinor * costFactors[si]),
              currency: 'INR',
              moq: moqList[si], leadTimeDays: leadList[si],
              productionCapacityMonth: 500, feasibility: feasList[si],
            },
          });
        }
      }

      await this.prisma.search.update({
        where: { id: searchId },
        data: { status: 'complete', completedAt: new Date() },
      });

      await this.prisma.auditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: userId,
          action: 'search.complete',
          resourceType: 'search',
          resourceId: searchId,
        },
      });
    } catch (e) {
      await this.prisma.search.update({ where: { id: searchId }, data: { status: 'failed' } });
    }
  }
}
