import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface CreateMarketplaceDto {
  code: string;
  country: string;
  currency: string;
  referralPct: number;
  fbaFeeMinor: number;
  storageFee: number;
}

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(activeOnly = false) {
    return this.prisma.marketplace.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { code: 'asc' },
    });
  }

  async create(dto: CreateMarketplaceDto) {
    const code = dto.code.toLowerCase().replace(/\s+/g, '_');
    const existing = await this.prisma.marketplace.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`Marketplace "${code}" already exists`);

    const feeSchedule = JSON.stringify({
      referralPct: dto.referralPct,
      fbaFeeMinor: dto.fbaFeeMinor,
      storageFee:  dto.storageFee,
    });

    return this.prisma.marketplace.create({
      data: { code, country: dto.country, currency: dto.currency.toUpperCase(), feeSchedule, active: true },
    });
  }

  async update(id: string, data: { active?: boolean; referralPct?: number; fbaFeeMinor?: number; storageFee?: number }) {
    const mp = await this.prisma.marketplace.findUnique({ where: { id } });
    if (!mp) throw new NotFoundException('Marketplace not found');

    const existing = JSON.parse(mp.feeSchedule || '{}');
    const feeSchedule = JSON.stringify({
      referralPct: data.referralPct ?? existing.referralPct,
      fbaFeeMinor: data.fbaFeeMinor ?? existing.fbaFeeMinor,
      storageFee:  data.storageFee  ?? existing.storageFee,
    });

    return this.prisma.marketplace.update({
      where: { id },
      data: {
        feeSchedule,
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  async remove(id: string) {
    const mp = await this.prisma.marketplace.findUnique({ where: { id } });
    if (!mp) throw new NotFoundException('Marketplace not found');
    // prevent deleting marketplaces that have opportunities linked
    const count = await this.prisma.opportunity.count({ where: { marketplaceId: id } });
    if (count > 0) throw new ConflictException(`Cannot delete — ${count} opportunities reference this marketplace`);
    await this.prisma.marketplace.delete({ where: { id } });
    return { success: true };
  }
}
