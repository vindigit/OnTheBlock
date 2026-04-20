import type { HiddenMarketConditionId } from '../domain/models/types';

export const RUN_CONFIG = {
  runLengthDays: 31,
  startingCash: 2000,
  startingDebt: 5500,
  startingHealth: 100,
  baseCapacity: 100,
  debtGrowthRate: 0.04,
  saveVersion: 4,
  narcanReviveHealth: 25,
} as const;

export const MARKET_CONFIG = {
  activeDrugCount: 8,
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

export const ENCOUNTER_CONFIG = {
  bigSal: {
    lowDebtThreshold: 20_000,
    highDebtThreshold: 50_000,
    lowDebtChance: 0.15,
    highDebtChance: 0.3,
    failedRunHealthLoss: 50,
    failedRunInventoryLossRate: 0.1,
  },
  mugging: {
    cashThreshold: 500,
    triggerChance: 0.1,
    surrenderLossMinRate: 0.2,
    surrenderLossMaxRate: 0.4,
    runEscapeChance: 0.6,
    failedRunHealthLoss: 20,
    fightMaxChance: 0.95,
  },
  police: {
    triggerChance: 1 / 7,
    maxDeputies: 3,
    runLossChance: 1 / 8,
    runCashLossRate: 0.5,
    woundChance: 1 / 4,
    killChance: 1 / 15,
    woundHealthLoss: 25,
    reward: 100_000,
    fightMaxChance: 0.95,
  },
} as const;
