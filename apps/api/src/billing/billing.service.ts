import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscription(orgId: string) {
    return this.prisma.subscription.findUnique({ where: { organizationId: orgId } });
  }

  async getPlans() {
    return [
      { id: 'starter', name: 'Starter', priceMonthly: 0, features: ['5 searches/mo', '1 marketplace', 'Basic analytics'] },
      { id: 'pro', name: 'Pro Seller', priceMonthly: 4900, features: ['Unlimited searches', 'All marketplaces', 'Advanced analytics', 'AI Brand Builder', 'PDF Reports'] },
      { id: 'agency', name: 'Agency', priceMonthly: 14900, features: ['Everything in Pro', 'Multi-user workspaces', 'Portfolio management', 'Priority support'] },
      { id: 'enterprise', name: 'Enterprise', priceMonthly: null, features: ['Everything in Agency', 'Public API access', 'White-label', 'Custom marketplaces', 'SLA'] },
    ];
  }
}
