import type { HiddenMarketConditionId, VolatilityClass } from '../domain/models/types';

export const RUN_CONFIG = {
  runLengthDays: 31,
  startingCash: 2000,
  startingDebt: 5500,
  startingHealth: 100,
  baseCapacity: 100,
  debtGrowthRate: 0.04,
  saveVersion: 1,
} as const;

export const MARKET_CONFIG = {
  activeDrugCount: 8,
  volatilityRanges: {
    low: [0.92, 1.08],
    medium: [0.78, 1.26],
    high: [0.58, 1.62],
    'very-high': [0.38, 1.95],
  } satisfies Record<VolatilityClass, readonly [number, number]>,
  conditionPriceBias: {
    steady: 1,
    discounted: 0.84,
    inflated: 1.18,
    choppy: 1.04,
  } satisfies Record<HiddenMarketConditionId, number>,
  conditionVolatilityScale: {
    steady: 0.8,
    discounted: 0.95,
    inflated: 1.05,
    choppy: 1.35,
  } satisfies Record<HiddenMarketConditionId, number>,
} as const;

export const HIDDEN_MARKET_CONDITIONS: HiddenMarketConditionId[] = [
  'steady',
  'discounted',
  'inflated',
  'choppy',
];
