import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AiOrchestratorService } from '../ai-system/orchestrator/ai.orchestrator.service';

@Injectable()
export class ListingService {
  private readonly logger = new Logger('ListingService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AiOrchestratorService,
  ) {}

  async getListing(opportunityId: string, userId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, search: { userId } },
      include: { launchAsset: true, product: true, marketplace: true, profitModel: true },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');

    if (opp.launchAsset) return opp.launchAsset;
    return this.generateListing(opp, userId);
  }

  async generateLaunchAssets(opportunityId: string, userId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, search: { userId } },
      include: { product: true, marketplace: true, profitModel: true },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');

    // Delete stale asset so we regenerate fresh
    await this.prisma.launchAsset.deleteMany({ where: { opportunityId } });
    return this.generateListing(opp, userId);
  }

  private async generateListing(opp: any, userId: string) {
    const product = opp.product;
    const marketplace = opp.marketplace;

    const existing = await this.prisma.launchAsset.findUnique({ where: { opportunityId: opp.id } });
    if (existing) return existing;

    // ── Route through AI Orchestrator ─────────────────────────────────────────
    let seoTitle: string;
    let bulletsArr: string[];
    let description: string;
    let keywords: Record<string, string[]>;
    let positioning: string;
    let usps: string[];

    try {
      const prompt = `Generate an Amazon/eCommerce listing for this Indian handmade product:

Product: ${product.title}
Category: ${product.category?.replace(/_/g, ' ')}
Marketplace: ${marketplace?.code ?? 'amazon_us'}
Seller: ${product.seller ?? 'Indian Artisan'}
Target Market: International buyers on ${marketplace?.code?.replace(/_/g, ' ') ?? 'Amazon US'}

Return JSON:
{
  "seoTitle": "string (60-80 chars, keyword-rich)",
  "bullets": ["bullet1", "bullet2", "bullet3", "bullet4", "bullet5"],
  "description": "string (150-200 words)",
  "keywords": { "primary": ["kw1","kw2"], "secondary": ["kw3","kw4"], "longTail": ["phrase1","phrase2"] },
  "positioning": "string (1 sentence)",
  "usps": ["usp1", "usp2", "usp3", "usp4"]
}`;

      const result = await this.orchestrator.run({
        type: 'listing_optimization',
        prompt,
        userId,
        requireJson: true,
        maxTokens: 800,
        budgetUsd: 0.05,
        context: { product: { title: product.title, category: product.category }, marketplace: { code: marketplace?.code } },
      });

      let parsed: any;
      try {
        const cleaned = result.content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = null;
      }

      if (parsed) {
        seoTitle    = parsed.seoTitle    ?? `Premium ${product.title} – Handcrafted Indian Artisan Quality`;
        bulletsArr  = parsed.bullets     ?? this.defaultBullets(product);
        description = parsed.description ?? this.defaultDescription(product);
        keywords    = parsed.keywords    ?? this.defaultKeywords(product);
        positioning = parsed.positioning ?? 'Premium artisan quality at accessible price points';
        usps        = parsed.usps        ?? ['Handcrafted', 'Eco-friendly', 'Indian artisan heritage', 'Export quality'];
        this.logger.log(`AI listing generated for ${product.title} via ${result.provider} (${result.cached ? 'cached' : 'live'})`);
      } else {
        throw new Error('AI response not parseable');
      }
    } catch (err: any) {
      this.logger.warn(`Falling back to template listing: ${err.message}`);
      seoTitle    = `Premium ${product.title} – Handcrafted Indian Artisan Quality`;
      bulletsArr  = this.defaultBullets(product);
      description = this.defaultDescription(product);
      keywords    = this.defaultKeywords(product);
      positioning = 'Premium artisan quality at accessible price points';
      usps        = ['Handcrafted', 'Eco-friendly', 'Indian artisan heritage', 'Export quality'];
    }

    return this.prisma.launchAsset.create({
      data: {
        opportunityId: opp.id,
        seoTitle,
        bullets:      JSON.stringify(bulletsArr),
        description,
        keywords:     JSON.stringify(keywords),
        positioning,
        usps:         JSON.stringify(usps),
        recommendedPriceMinor: opp.profitModel?.salePriceMinor || 3499,
        bundleSuggestions: JSON.stringify(['Matching pen holder', 'Desktop calendar stand']),
        brandConcepts:     JSON.stringify([{ name: 'ArtisanCraft', tagline: 'Where Indian heritage meets global markets' }]),
      },
    });
  }

  async getKeywords(opportunityId: string) {
    const asset = await this.prisma.launchAsset.findUnique({ where: { opportunityId } });
    if (asset?.keywords) {
      try { return JSON.parse(asset.keywords); } catch { /* fall through */ }
    }
    return this.defaultKeywords(null);
  }

  async getCompetitors(opportunityId: string, userId: string) {
    const opp = await this.prisma.opportunity.findFirst({ where: { id: opportunityId, search: { userId } } });
    if (!opp) throw new NotFoundException();
    return this.prisma.competitor.findMany({ where: { opportunityId }, include: { reviewInsights: true } });
  }

  async getReviewInsights(opportunityId: string, userId: string) {
    const opp = await this.prisma.opportunity.findFirst({ where: { id: opportunityId, search: { userId } } });
    if (!opp) throw new NotFoundException();
    return this.prisma.reviewInsight.findMany({
      where: { competitor: { opportunityId } },
      orderBy: { frequency: 'desc' },
    });
  }

  // ── Fallbacks ──────────────────────────────────────────────────────────────

  private defaultBullets(product: any): string[] {
    return [
      `✓ Authentic handcrafted quality from master Indian artisans with 20+ years experience`,
      `✓ Eco-friendly sustainable materials – ${product?.category?.replace(/_/g, ' ') ?? 'premium'} certified`,
      `✓ Perfect gift choice – arrives in elegant, gift-ready packaging`,
      `✓ Export quality standards – rigorously inspected before shipping`,
      `✓ 100% satisfaction guarantee – full refund if not delighted`,
    ];
  }

  private defaultDescription(product: any): string {
    return `Discover the perfect blend of functionality and artisan craftsmanship with our ${product?.title ?? 'product'}. Sourced directly from skilled craftspeople across India, this product brings authentic quality to your everyday life. Each piece is individually crafted with attention to detail, ensuring no two are exactly alike. Backed by a 100% satisfaction guarantee.`;
  }

  private defaultKeywords(product: any): Record<string, string[]> {
    const base = product?.title?.toLowerCase().split(' ') ?? ['handmade', 'artisan'];
    return {
      primary:   [product?.title ?? 'handmade product', 'Indian artisan', 'handcrafted'],
      secondary: [...base.slice(0, 3), 'eco-friendly', 'sustainable'],
      longTail:  [`handmade ${product?.title ?? 'product'} from India`, 'Indian artisan gift'],
      backend:   ['artisan', 'handmade', 'India', 'ethnic', 'traditional'],
    };
  }
}
