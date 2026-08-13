import { Injectable, Logger } from '@nestjs/common';

interface BudgetState {
  userId: string;
  spentTodayUsd: number;
  spentThisMonthUsd: number;
  dayKey: string;
  monthKey: string;
}

// Per-plan limits (USD/day, USD/month)
const PLAN_LIMITS: Record<string, { dailyUsd: number; monthlyUsd: number }> = {
  starter:      { dailyUsd: 0.50,  monthlyUsd: 5.00  },
  professional: { dailyUsd: 5.00,  monthlyUsd: 50.00 },
  enterprise:   { dailyUsd: 50.00, monthlyUsd: 500.00 },
  unlimited:    { dailyUsd: 999,   monthlyUsd: 9999   },
};

@Injectable()
export class BudgetManagerService {
  private readonly logger = new Logger('BudgetManagerService');
  private readonly state = new Map<string, BudgetState>();

  private today(): string { return new Date().toISOString().slice(0, 10); }
  private month(): string { return new Date().toISOString().slice(0, 7); }

  private getState(userId: string): BudgetState {
    const today = this.today();
    const month = this.month();
    let s = this.state.get(userId);
    if (!s || s.dayKey !== today || s.monthKey !== month) {
      s = {
        userId,
        spentTodayUsd: s?.monthKey === month ? (s?.spentTodayUsd ?? 0) : 0,
        spentThisMonthUsd: s?.monthKey === month ? (s?.spentThisMonthUsd ?? 0) : 0,
        dayKey: today,
        monthKey: month,
      };
      if (s.dayKey !== today) s.spentTodayUsd = 0;
      this.state.set(userId, s);
    }
    return s;
  }

  checkBudget(userId: string, estimatedCostUsd: number, plan = 'starter', taskBudgetUsd?: number): void {
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS['starter'];
    const s = this.getState(userId);

    if (taskBudgetUsd && estimatedCostUsd > taskBudgetUsd) {
      throw new Error(`Estimated cost $${estimatedCostUsd.toFixed(4)} exceeds per-task budget $${taskBudgetUsd.toFixed(4)}`);
    }

    if (s.spentTodayUsd + estimatedCostUsd > limits.dailyUsd) {
      throw new Error(`Daily budget ($${limits.dailyUsd}) would be exceeded. Spent today: $${s.spentTodayUsd.toFixed(4)}`);
    }

    if (s.spentThisMonthUsd + estimatedCostUsd > limits.monthlyUsd) {
      throw new Error(`Monthly budget ($${limits.monthlyUsd}) would be exceeded. Spent this month: $${s.spentThisMonthUsd.toFixed(4)}`);
    }
  }

  recordSpend(userId: string, costUsd: number): void {
    const s = this.getState(userId);
    s.spentTodayUsd += costUsd;
    s.spentThisMonthUsd += costUsd;
    this.logger.debug(`Budget: user=${userId} day=$${s.spentTodayUsd.toFixed(4)} month=$${s.spentThisMonthUsd.toFixed(4)}`);
  }

  getUsage(userId: string): { spentTodayUsd: number; spentThisMonthUsd: number } {
    const s = this.getState(userId);
    return { spentTodayUsd: s.spentTodayUsd, spentThisMonthUsd: s.spentThisMonthUsd };
  }
}
