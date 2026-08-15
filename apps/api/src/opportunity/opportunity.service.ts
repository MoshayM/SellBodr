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
function exportersindiaUrl(keyword: string) {
  return `https://www.exportersindia.com/search.htm?q=${encodeURIComponent(keyword)}`;
}
function tradekeyUrl(keyword: string) {
  return `https://www.tradekey.com/searchresults.html?search=${encodeURIComponent(keyword)}`;
}
function justdialUrl(keyword: string) {
  return `https://www.justdial.com/search?q=${encodeURIComponent(keyword)}+manufacturers`;
}
function epchUrl(keyword: string) {
  return `https://www.epch.com/search?q=${encodeURIComponent(keyword)}`;
}
function udaanUrl(keyword: string) {
  return `https://udaan.com/search?q=${encodeURIComponent(keyword)}`;
}
function meeshoUrl(keyword: string) {
  return `https://www.meesho.com/search?query=${encodeURIComponent(keyword)}`;
}
function fibre2fashionUrl(keyword: string) {
  return `https://www.fibre2fashion.com/business-directory/search.htm?q=${encodeURIComponent(keyword)}`;
}

// ── Category-aware certifications ─────────────────────────────────────────────
function categoryCerts(category: string): string[] {
  const cat = (category || '').toLowerCase().replace(/_/g, ' ');
  if (cat.includes('food') || cat.includes('spice') || cat.includes('snack')) return ['FSSAI License', 'APEDA Registered', 'HACCP Certified'];
  if (cat.includes('health') || cat.includes('wellness') || cat.includes('supplement') || cat.includes('herbal')) return ['AYUSH Certified', 'WHO-GMP Compliant', 'FSSAI License'];
  if (cat.includes('beauty') || cat.includes('cosmetic') || cat.includes('skincare')) return ['BIS Certified', 'CPCB Compliant', 'EU Cosmetics Ready'];
  if (cat.includes('textile') || cat.includes('fabric') || cat.includes('cloth') || cat.includes('fashion') || cat.includes('apparel')) return ['OEKO-TEX Standard 100', 'GOTS Certified', 'BCI Member'];
  if (cat.includes('handicraft') || cat.includes('handmade') || cat.includes('craft') || cat.includes('pottery') || cat.includes('art')) return ['Craftmark Certified', 'EPCH Registered', 'WCA Compliant'];
  if (cat.includes('organic') || cat.includes('natural')) return ['India Organic', 'NPOP Certified', 'USDA Organic Ready'];
  if (cat.includes('toy') || cat.includes('game')) return ['BIS IS 9873', 'ASTM F963 Ready', 'EN 71 Compliant'];
  if (cat.includes('electron') || cat.includes('gadget')) return ['BIS ISI Mark', 'WPC Approved', 'RoHS Ready'];
  return ['ISO 9001:2015', 'IEC Registered'];
}

// ── Per-platform quality profile ───────────────────────────────────────────────
interface QualityProfile {
  rating: number;
  reviewCount: number;
  verifiedBadge: boolean;
  companyType: string;
  yearEstablished: string;
  employeeCount: string;
  annualTurnover: string;
  certifications: string[];
  description: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  reliabilityScore: number;  // 0-100 platform trust score
  platformBadge: string;     // official platform badge/tier
  responseTime: string;      // typical response SLA
  samplePolicy: string;
  paymentTerms: string;
  exportMarketsServed: string[];
}

function qualityProfile(source: string, category: string): QualityProfile {
  const catCerts = categoryCerts(category);

  const profiles: Record<string, QualityProfile> = {
    indiamart: {
      rating: 4.5, reviewCount: 1847, verifiedBadge: true,
      companyType: 'Manufacturer & Exporter', yearEstablished: '2010',
      employeeCount: '51-100', annualTurnover: '₹2-5 Cr',
      certifications: ['ISO 9001:2015', 'IndiaMART TrustSeal', 'IEC Registered', 'MSME Udyam', ...catCerts],
      description: `Verified manufacturer listed on IndiaMART — India's largest B2B marketplace. TrustSeal certified with GST-verified company profile. Export experience to 20+ countries. Competitive pricing with strong quality control and responsive communication.`,
      city: 'Jaipur', state: 'Rajasthan', country: 'India',
      latitude: 26.9124, longitude: 75.7873,
      reliabilityScore: 88, platformBadge: 'IndiaMART TrustSeal',
      responseTime: '< 4 hours', samplePolicy: 'Samples available at cost + courier',
      paymentTerms: '30% advance, 70% before shipment',
      exportMarketsServed: ['USA', 'UK', 'Germany', 'Australia', 'Canada'],
    },
    exportersindia: {
      rating: 4.2, reviewCount: 612, verifiedBadge: true,
      companyType: 'Exporter & Manufacturer', yearEstablished: '2008',
      employeeCount: '26-50', annualTurnover: '₹1-2 Cr',
      certifications: ['ISO 9001:2015', 'ExportersIndia Verified', 'IEC Registered', 'FIEO Member', ...catCerts],
      description: `Verified exporter on ExportersIndia.com with FIEO (Federation of Indian Export Organisations) membership. Specialises in direct B2B export. Competitive FOB pricing with documentation support including shipping bill, COO, and export invoice.`,
      city: 'Surat', state: 'Gujarat', country: 'India',
      latitude: 21.1702, longitude: 72.8311,
      reliabilityScore: 82, platformBadge: 'FIEO Member',
      responseTime: '< 8 hours', samplePolicy: 'Free sample for orders > 500 units, courier at buyer cost',
      paymentTerms: 'LC at sight / TT 30% advance',
      exportMarketsServed: ['UAE', 'USA', 'UK', 'Singapore', 'South Africa'],
    },
    epch: {
      rating: 4.8, reviewCount: 389, verifiedBadge: true,
      companyType: 'Registered Artisan Manufacturer', yearEstablished: '2005',
      employeeCount: '11-25', annualTurnover: '₹50L-1 Cr',
      certifications: ['EPCH Membership', 'Craftmark Certified', 'MSME Udyam Registered', 'WCA Compliant', 'Fair Trade Principles', ...catCerts],
      description: `Member of EPCH — the Export Promotion Council for Handicrafts, a Government of India body. Craftmark certified guaranteeing authentic handmade production. Highest ethical standards, artisan welfare compliance, and export documentation expertise. Preferred by international buyers seeking verified Indian heritage products.`,
      city: 'New Delhi', state: 'Delhi', country: 'India',
      latitude: 28.6139, longitude: 77.2090,
      reliabilityScore: 95, platformBadge: 'EPCH Government Certified',
      responseTime: '< 24 hours', samplePolicy: 'Samples provided; full cost refunded on bulk order',
      paymentTerms: '50% advance via escrow, 50% on BL copy',
      exportMarketsServed: ['USA', 'UK', 'EU', 'Japan', 'Australia', 'UAE'],
    },
    udaan: {
      rating: 4.3, reviewCount: 2341, verifiedBadge: true,
      companyType: 'Wholesale Manufacturer / MSME', yearEstablished: '2017',
      employeeCount: '11-50', annualTurnover: '₹1-5 Cr',
      certifications: ['GST Verified', 'Udaan Business Verified', 'MSME Udyam Registered', 'UPI-linked Business', ...catCerts],
      description: `Tech-enabled B2B seller on Udaan — India's fastest-growing wholesale platform backed by Lightspeed and DST Global. Real-time inventory, digital invoicing, and same-day dispatch available. Ideal for Just-in-Time (JIT) sourcing with smaller lot flexibility. Strong track record across 900+ cities.`,
      city: 'Bangalore', state: 'Karnataka', country: 'India',
      latitude: 12.9716, longitude: 77.5946,
      reliabilityScore: 85, platformBadge: 'Udaan Verified Seller',
      responseTime: '< 2 hours', samplePolicy: 'Sample orders accepted via Udaan platform',
      paymentTerms: 'Net-14 or Net-30 via Udaan Pay Later',
      exportMarketsServed: ['India domestic + export through freight forwarder'],
    },
    tradeindia: {
      rating: 3.9, reviewCount: 754, verifiedBadge: false,
      companyType: 'Trader & Manufacturer', yearEstablished: '2012',
      employeeCount: '11-50', annualTurnover: '₹50L-2 Cr',
      certifications: ['TradeIndia Verified', 'ISO 9001:2015', 'IEC Registered', ...catCerts],
      description: `Listed on TradeIndia — India's second-largest B2B portal. Moderate verification tier; IEC-registered for export. Competitive pricing with standard quality controls. Recommended to request third-party inspection certificate before first bulk order.`,
      city: 'Delhi', state: 'Delhi', country: 'India',
      latitude: 28.7041, longitude: 77.1025,
      reliabilityScore: 72, platformBadge: 'TradeIndia Verified',
      responseTime: '< 12 hours', samplePolicy: 'Samples at cost; negotiable for large volumes',
      paymentTerms: 'TT advance; LC for orders > $5,000',
      exportMarketsServed: ['USA', 'UAE', 'UK', 'Southeast Asia'],
    },
    meesho: {
      rating: 3.7, reviewCount: 3120, verifiedBadge: false,
      companyType: 'MSME Artisan / Small Manufacturer', yearEstablished: '2015',
      employeeCount: '1-10', annualTurnover: '₹10L-50L',
      certifications: ['GST Verified', 'MSME Registered', 'Meesho Supplier Verified', ...catCerts],
      description: `Small-scale artisan or MSME supplier on Meesho — India's social commerce platform serving 6M+ sellers. Strong for authentic handmade, cottage-industry, and MSME products at competitive prices. Lower formal export experience; suitable for buyers who can manage freight forwarding independently. Best for unique and artisanal product discovery.`,
      city: 'Bengaluru', state: 'Karnataka', country: 'India',
      latitude: 12.9716, longitude: 77.5946,
      reliabilityScore: 65, platformBadge: 'Meesho Supplier',
      responseTime: '< 24 hours', samplePolicy: 'Small sample orders possible; standard MOQ applies',
      paymentTerms: 'Advance payment via Meesho or direct UPI',
      exportMarketsServed: ['India domestic; export via 3PL recommended'],
    },
    fibre2fashion: {
      rating: 4.4, reviewCount: 528, verifiedBadge: true,
      companyType: 'Textile Manufacturer & Exporter', yearEstablished: '2007',
      employeeCount: '51-200', annualTurnover: '₹5-10 Cr',
      certifications: ['ISO 9001:2015', 'OEKO-TEX Standard 100', 'Fibre2Fashion Verified', 'GOTS Certified', 'BCI Member', ...catCerts],
      description: `Verified manufacturer on Fibre2Fashion — the world's largest B2B textile marketplace. OEKO-TEX and GOTS certifications confirm chemical safety and organic chain-of-custody. Specialises in sustainable and export-ready fabrics, garments, and accessories with lab test reports available. Preferred by EU and US sustainable fashion buyers.`,
      city: 'Ahmedabad', state: 'Gujarat', country: 'India',
      latitude: 23.0225, longitude: 72.5714,
      reliabilityScore: 87, platformBadge: 'Fibre2Fashion Verified',
      responseTime: '< 6 hours', samplePolicy: 'Lab-tested samples with OEKO-TEX report included',
      paymentTerms: 'LC or TT; escrow available for new buyers',
      exportMarketsServed: ['EU', 'USA', 'UK', 'Japan', 'Scandinavia'],
    },
    alibaba: {
      rating: 3.8, reviewCount: 5621, verifiedBadge: false,
      companyType: 'Trading Company / Manufacturer', yearEstablished: '2014',
      employeeCount: '51-100', annualTurnover: '$1-5M USD',
      certifications: ['Alibaba Trade Assurance', 'ISO 9001:2015', 'Gold Supplier (Paid Tier)', ...catCerts],
      description: `Alibaba India-origin seller with Trade Assurance protection — payment held until buyer confirms delivery quality. Gold Supplier tier (paid verification) indicates active trading. Note: Alibaba verification is self-declared; conduct independent factory audit for first-time orders. Competitive on unit economics for high-volume runs.`,
      city: 'Surat', state: 'Gujarat', country: 'India',
      latitude: 21.1702, longitude: 72.8311,
      reliabilityScore: 70, platformBadge: 'Trade Assurance',
      responseTime: '< 4 hours', samplePolicy: 'Sample orders via Alibaba Trade Assurance recommended',
      paymentTerms: 'Trade Assurance / LC / TT — escrow via Alibaba Pay',
      exportMarketsServed: ['Global (150+ countries)'],
    },
    justdial: {
      rating: 3.5, reviewCount: 1892, verifiedBadge: false,
      companyType: 'Local Manufacturer / Trader', yearEstablished: '2013',
      employeeCount: '1-25', annualTurnover: '₹10L-1 Cr',
      certifications: ['JustDial Trusted (User-reviewed)', 'GST Registered', ...catCerts],
      description: `Local manufacturer discovered via JustDial — India's largest local business directory (60M+ listings). JustDial verification is based on user reviews; no factory audit. Best for identifying local manufacturers for site visits and direct negotiation. Recommended: visit before first order and request MSME certificate and GST registration.`,
      city: 'Jaipur', state: 'Rajasthan', country: 'India',
      latitude: 26.9124, longitude: 75.7873,
      reliabilityScore: 58, platformBadge: 'JustDial Trusted',
      responseTime: '< 48 hours', samplePolicy: 'Negotiate directly; samples usually available at cost',
      paymentTerms: 'Cash / UPI advance; negotiate terms directly',
      exportMarketsServed: ['Domestic; export capability unconfirmed — verify before committing'],
    },
    tradekey: {
      rating: 3.6, reviewCount: 314, verifiedBadge: false,
      companyType: 'Exporter / Trading Company', yearEstablished: '2016',
      employeeCount: '11-50', annualTurnover: '$200K-1M USD',
      certifications: ['TradeKey Gold Member (Paid)', 'ISO 9001:2015', ...catCerts],
      description: `India-origin seller on TradeKey — global B2B marketplace. Gold Member is a paid tier, not independently audited. Moderate reliability; suitable for initial price benchmarking. Conduct video call factory tour and request recent third-party inspection report before placing bulk orders.`,
      city: 'Mumbai', state: 'Maharashtra', country: 'India',
      latitude: 19.0760, longitude: 72.8777,
      reliabilityScore: 62, platformBadge: 'TradeKey Gold Member',
      responseTime: '< 24 hours', samplePolicy: 'Samples at buyer cost; DHL / FedEx preferred',
      paymentTerms: 'TT advance or LC; escrow not available',
      exportMarketsServed: ['Middle East', 'Africa', 'Southeast Asia', 'USA'],
    },
  };

  return profiles[source] ?? profiles['indiamart'];
}

interface SupplierDef {
  name: string; source: string; location: string; sourceUrl: string;
  verified: boolean; exportExperience: string; qualityIndicators: string;
}

function suppliersFor(category: string): SupplierDef[] {
  const kw = category.replace(/_/g, ' ');

  const build = (name: string, source: string, url: string): SupplierDef => {
    const q = qualityProfile(source, category);
    return {
      name, source,
      location: `${q.city}, ${q.state}, ${q.country}`,
      sourceUrl: url,
      verified: q.verifiedBadge,
      exportExperience: q.reliabilityScore >= 85 ? 'experienced' : q.reliabilityScore >= 70 ? 'moderate' : 'beginner',
      qualityIndicators: JSON.stringify(q),
    };
  };

  return [
    build(`IndiaMART — ${kw}`,        'indiamart',      indiamartUrl(kw)),
    build(`ExportersIndia — ${kw}`,   'exportersindia', exportersindiaUrl(kw)),
    build(`EPCH Member — ${kw}`,      'epch',           epchUrl(kw)),
    build(`Udaan Wholesale — ${kw}`,  'udaan',          udaanUrl(kw)),
    build(`TradeIndia — ${kw}`,       'tradeindia',     tradeindiamUrl(kw)),
    build(`Meesho Supplier — ${kw}`,  'meesho',         meeshoUrl(kw)),
    build(`Fibre2Fashion — ${kw}`,    'fibre2fashion',  fibre2fashionUrl(kw)),
    build(`Alibaba India — ${kw}`,    'alibaba',        alibabaUrl(kw)),
    build(`JustDial B2B — ${kw}`,    'justdial',       justdialUrl(kw)),
    build(`TradeKey India — ${kw}`,   'tradekey',       tradekeyUrl(kw)),
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
        const moqList     = [25, 50,   30,   50,   75,  100,  50,  100, 200, 150];
        const leadList    = [10, 14,    7,   14,   17,   21,  21,   28,  30,  25];
        const feasList    = ['easy','easy','easy','easy','moderate','moderate','easy','moderate','moderate','hard'];
        const costFactors = [1.00, 0.92, 0.85, 0.88, 1.05, 0.95, 0.98, 1.15, 1.10, 1.20];

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
