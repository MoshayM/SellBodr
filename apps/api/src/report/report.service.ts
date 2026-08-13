import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(opportunityId: string, userId: string, format: string = 'json') {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, search: { userId } },
      include: {
        product: true, marketplace: true, score: true,
        profitModel: true, sourcingCandidates: { include: { supplier: true } },
        launchAsset: true,
      },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');

    const content = JSON.stringify({
      opportunityId: opp.id,
      product: opp.product,
      marketplace: opp.marketplace?.code,
      recommendation: opp.recommendation,
      confidence: opp.confidence,
      scores: opp.score,
      profit: opp.profitModel,
      sourcing: opp.sourcingCandidates,
      listing: opp.launchAsset,
      generatedAt: new Date().toISOString(),
    }, null, 2);

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const report = await this.prisma.report.create({
      data: {
        opportunityId: opp.id,
        format,
        generatedById: userId,
        content,
      },
    });

    return { reportId: report.id, format, content: JSON.parse(content) };
  }

  async getReport(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    return { ...report, content: report.content ? JSON.parse(report.content) : null };
  }
}
