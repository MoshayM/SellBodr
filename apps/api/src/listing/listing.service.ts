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

  async generateAds(opportunityId: string, userId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, search: { userId } },
      include: { product: true, marketplace: true, profitModel: true },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');

    const product = opp.product;
    const mpCode = opp.marketplace?.code || 'amazon_us';

    try {
      const prompt = `Generate cross-platform ad campaign copy for this Indian artisan product:

Product: ${product.title}
Category: ${product.category?.replace(/_/g, ' ')}
Marketplace: ${mpCode}
Price: ~$${((opp.profitModel?.salePriceMinor || 2999) / 100).toFixed(0)}

Return JSON with keys: facebook, instagram, youtube, google, tips.
facebook: { headline (40 chars), primaryText (2-3 sentences), cta, audience, dailyBudget }
instagram: { caption (150 chars with emojis), reelHook, hashtags (8 tags) }
youtube: { title, hook (0-5s), body, cta }
google: { headline1 (30 chars), headline2, headline3, keywords (5 terms) }
tips: [3 actionable strings]`;

      const result = await this.orchestrator.run({
        type: 'marketing_content',
        prompt,
        userId,
        requireJson: true,
        maxTokens: 800,
        budgetUsd: 0.05,
        context: { product: { title: product.title, category: product.category } },
      });

      let parsed: any;
      try {
        const cleaned = result.content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        parsed = JSON.parse(cleaned);
      } catch { parsed = null; }

      if (parsed) return parsed;
    } catch { /* fall through to defaults */ }

    return this.defaultAds(product, opp.profitModel);
  }

  async generateGrowth(opportunityId: string, userId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, search: { userId } },
      include: { product: true, marketplace: true, profitModel: true, score: true },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');

    const product = opp.product;
    const mpCode = opp.marketplace?.code || 'amazon_us';
    const score = (opp as any).score;

    try {
      const prompt = `Create a growth playbook for this eCommerce opportunity:

Product: ${product.title}
Category: ${product.category?.replace(/_/g, ' ')}
Marketplace: ${mpCode}
Score: ${score?.opportunity ?? 70}/100

Return JSON:
{
  "quickWins": [3 strings],
  "listingOptimization": { "title": string, "bullets": [2 strings], "images": [3 strings], "video": string },
  "pricingStrategy": { "launch": string, "growth": string, "long_term": string },
  "launchSequence": [{ "week": string, "action": string } × 4],
  "ppcStrategy": { "budget": string, "acos": string, "campaigns": [3 strings] },
  "reviewStrategy": [3 strings],
  "monthlyMilestones": [{ "month": number, "goal": string } for months 1, 3, 6]
}`;

      const result = await this.orchestrator.run({
        type: 'growth_strategy',
        prompt,
        userId,
        requireJson: true,
        maxTokens: 900,
        budgetUsd: 0.06,
        context: { product: { title: product.title }, marketplace: { code: mpCode } },
      });

      let parsed: any;
      try {
        const cleaned = result.content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        parsed = JSON.parse(cleaned);
      } catch { parsed = null; }

      if (parsed) return parsed;
    } catch { /* fall through */ }

    return this.defaultGrowth(product, mpCode);
  }

  private defaultAds(product: any, profitModel: any): any {
    const title = product?.title ?? 'Premium Indian Artisan Product';
    const price = `$${((profitModel?.salePriceMinor || 2999) / 100).toFixed(0)}`;
    return {
      facebook: {
        headline: `Discover Authentic ${title.split(' ').slice(0, 4).join(' ')}`,
        primaryText: `✨ Handcrafted by master Indian artisans. Each piece is unique, eco-friendly, and export-quality certified. Perfect for gifting or personal use.\n\n🚀 Limited stock — order now and receive in 7-10 days.`,
        cta: 'Shop Now',
        audience: 'Age 25-55 · Interests: handmade goods, home décor, ethical shopping, India',
        dailyBudget: '$10–$25/day recommended for 5-day test period',
      },
      instagram: {
        caption: `✨ From India's finest artisans to your doorstep 🌍\n\n${title} — handcrafted with love, starting at ${price} 🛍️\n\nTap link in bio →`,
        reelHook: `"You won't believe this was made entirely by hand in India…"`,
        hashtags: [`#IndianArtisan`, `#Handmade`, `#EthicalShopping`, `#IndiaExports`, `#ArtisanMade`, `#GlobalSelling`, `#HandcraftedLove`, `#SellBodr`],
      },
      youtube: {
        title: `This ${title} From India Changed My Business | Full Review`,
        hook: `"If you're selling on Amazon and NOT sourcing from India, you're leaving money on the table…"`,
        body: `Today I break down how I found this premium ${title}, sourced directly from Indian artisans at a fraction of market price.`,
        cta: `Check the link below to find your own winning products from India — free with SellBodr.`,
      },
      google: {
        headline1: title.slice(0, 25),
        headline2: `Handcrafted · Export Quality`,
        headline3: `From ${price} · Fast Shipping`,
        keywords: [title.toLowerCase(), `handmade ${title.toLowerCase()}`, `Indian artisan products`, `buy ${title.toLowerCase()} online`, `wholesale ${title.toLowerCase()} India`],
      },
      tips: [
        `Start Facebook ads at $15/day for 5 days to gather data before scaling.`,
        `Use Instagram Reels with a strong hook in the first 3 seconds for maximum reach.`,
        `Target lookalike audiences based on your first 20 buyers for best ROAS.`,
      ],
    };
  }

  private defaultGrowth(product: any, mpCode: string): any {
    const title = product?.title ?? 'product';
    const platform = mpCode.split('_')[0].charAt(0).toUpperCase() + mpCode.split('_')[0].slice(1);
    return {
      quickWins: [
        `Optimise your main image — white background with the ${title} filling 85% of frame`,
        `Add all 7 image slots: include size reference, packaging shot, and craftsmanship close-up`,
        `Price 5-8% below top competitor for the first 30 days to accelerate review velocity`,
      ],
      listingOptimization: {
        title: `[Brand] + [Primary Keyword] + [Key Benefit] + [Material/Style] — keep under 200 chars`,
        bullets: [
          `Lead each bullet with the benefit then the feature, e.g. "Stay organised with our handcrafted ${title}"`,
          `Include high-volume search terms naturally in bullets 3 and 4 without keyword stuffing`,
        ],
        images: [
          `Image 1: White-bg hero — product fills 85% of frame, no props`,
          `Image 2: Lifestyle shot — product in use by target customer demographic`,
          `Image 3: Infographic with key features and dimensions clearly labelled`,
        ],
        video: `30-60 second Reel-style video showing an Indian artisan crafting the ${title} — authenticity drives conversion`,
      },
      pricingStrategy: {
        launch: `Start at cost + 30% margin to rank quickly and collect reviews in the first month`,
        growth: `Raise price 10-15% after 20 reviews once organic rank improves`,
        long_term: `Maintain 2-3 price tiers (colour / size variants) to capture broader customer segments`,
      },
      launchSequence: [
        { week: 'Week 1',    action: `Set up listing, seed 5-10 reviews via Vine or friends, launch auto PPC at $15/day` },
        { week: 'Week 2',    action: `Review search term report, add negatives, launch manual exact-match PPC on top 10 keywords` },
        { week: 'Week 3-4',  action: `Optimise A+ content, push for 25 reviews, reduce ACoS target to 25%` },
        { week: 'Month 2+',  action: `Scale winning keywords, test 10% price increase, add variation if velocity is strong` },
      ],
      ppcStrategy: {
        budget: `$15-$25/day on ${platform} Sponsored Products during launch phase`,
        acos: `Target ACoS ≤ 30% in launch; aim for ≤ 20% in steady-state (check category benchmark)`,
        campaigns: [
          `Auto campaign — broad discovery for the first 14 days`,
          `Manual exact — top 10 high-intent keywords harvested from auto report`,
          `Competitor targeting — target ASINs of top 3 competitors in the category`,
        ],
      },
      reviewStrategy: [
        `Enrol in ${platform} Vine programme (if brand-registered) for initial review velocity`,
        `Include a compliant thank-you card in packaging with a QR code to the review page`,
        `Use ${platform}'s "Request a Review" button within 5-30 days of each confirmed delivery`,
      ],
      monthlyMilestones: [
        { month: 1, goal: `15+ reviews, rank in top 50 for primary keyword, ACoS under 35%` },
        { month: 3, goal: `50+ reviews, top 20 ranking, ACoS under 25%, profitable on PPC` },
        { month: 6, goal: `100+ reviews, top 10 ranking — expand to a second marketplace or add a variation` },
      ],
    };
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
