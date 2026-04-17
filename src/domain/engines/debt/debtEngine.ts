import { RUN_CONFIG } from '../../../config/economy';

export function applyDailyDebtGrowth(debt: number): number {
  // Debt is stored as whole dollars; daily 4% growth rounds up so debt pressure never silently disappears.
  return Math.ceil(debt * (1 + RUN_CONFIG.debtGrowthRate));
}
