import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SourcingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuppliers(opportunityId: string, userId: string) {
    const db = this.prisma as any;
    const opp = await db.opportunity.findFirst({
      where: { id: opportunityId, search: { userId } },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');

    const candidates = await db.sourcingCandidate.findMany({
      where: { opportunityId },
      include: { supplier: true },
      orderBy: { createdAt: 'asc' },
    });

    return candidates.map((c: any) => ({
      ...c,
      supplier: this.enrichSupplier(c.supplier),
    }));
  }

  async getSupplier(id: string) {
    const db = this.prisma as any;

    // id may be a SourcingCandidate.id (how the UI opens the drawer) or a Supplier.id
    const sc = await db.sourcingCandidate.findUnique({
      where: { id },
      include: { supplier: true },
    });
    if (sc) {
      return {
        ...this.enrichSupplier(sc.supplier),
        moq:               sc.moq,
        leadTimeDays:      sc.leadTimeDays,
        productCostMinor:  sc.productCostMinor,
        currency:          sc.currency,
        feasibility:       sc.feasibility,
        productionCapacityMonth: sc.productionCapacityMonth,
      };
    }

    // Fallback: try treating id as a raw Supplier.id
    const s = await db.supplier.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Supplier not found');
    return this.enrichSupplier(s);
  }

  private enrichSupplier(s: any) {
    let q: Record<string, any> = {};
    try {
      if (s.qualityIndicators) q = JSON.parse(s.qualityIndicators);
    } catch { q = {}; }

    // Parse location string "City, State, Country" as fallback
    const locParts = (s.location ?? '').split(',').map((p: string) => p.trim());

    return {
      // Prisma base fields
      id:                  s.id,
      name:                s.name,
      source:              s.source,
      location:            s.location,
      exportExperience:    s.exportExperience,
      verified:            s.verified,
      sourceUrl:           s.sourceUrl,
      createdAt:           s.createdAt,
      updatedAt:           s.updatedAt,

      // Fields expected by SupplierProfileDrawer — sourced from qualityIndicators
      supplierName:        s.name,
      certifications:      q.certifications     ?? [],
      rating:              q.rating             ?? 4.0,
      reviewCount:         q.reviewCount        ?? 0,
      verifiedBadge:       q.verifiedBadge      ?? s.verified,
      companyType:         q.companyType        ?? 'Manufacturer',
      yearEstablished:     q.yearEstablished    ?? '2010',
      employeeCount:       q.employeeCount      ?? '11-50',
      annualTurnover:      q.annualTurnover     ?? 'N/A',
      city:                q.city               ?? locParts[0] ?? '',
      state:               q.state              ?? locParts[1] ?? '',
      country:             q.country            ?? locParts[2] ?? 'India',
      latitude:            q.latitude           ?? 20.5937,
      longitude:           q.longitude          ?? 78.9629,
      description:         q.description        ?? '',
      reliabilityScore:    q.reliabilityScore   ?? 70,
      platformBadge:       q.platformBadge      ?? '',
      responseTime:        q.responseTime       ?? 'N/A',
      samplePolicy:        q.samplePolicy       ?? 'Contact supplier for samples',
      paymentTerms:        q.paymentTerms       ?? 'TT advance',
      exportMarketsServed: q.exportMarketsServed ?? [],

      // Contact fields (not in qualityIndicators; kept as null until CRM integration)
      contactEmail:        q.contactEmail       ?? null,
      contactWhatsapp:     q.contactWhatsapp    ?? null,
      contactPhone:        q.contactPhone       ?? null,
    };
  }
}
