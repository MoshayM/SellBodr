import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SourcingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuppliers(opportunityId: string, userId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, search: { userId } },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');

    return this.prisma.sourcingCandidate.findMany({
      where: { opportunityId },
      include: { supplier: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSupplier(id: string) {
    const s = await this.prisma.supplier.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }
}
