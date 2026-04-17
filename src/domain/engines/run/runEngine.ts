import { HIDDEN_MARKET_CONDITIONS, RUN_CONFIG } from '../../../config/economy';
import { LOCATIONS } from '../../../config/locations';
import type {
  DrugId,
  HiddenMarketConditionId,
  LocationId,
  LocationState,
  PlayerRun,
  TravelResult,
} from '../../models/types';
import { createRng, createRunSeed, deriveSeed } from '../../../utils/rng';
import { generateMarketsForDay } from '../market/marketEngine';
import { applyDailyDebtGrowth } from '../debt/debtEngine';

type CreateNewRunOptions = {
  seed?: string;
  runId?: string;
};

function createEmptyLocationStates(
  seed: string,
): Record<LocationId, LocationState> {
  const conditionRng = createRng(deriveSeed(seed, ['market-conditions']));
  const locationStates = {} as Record<LocationId, LocationState>;

  for (const location of LOCATIONS) {
    locationStates[location.locationId] = {
      locationId: location.locationId,
      hiddenMarketConditionId: conditionRng.pick(
        HIDDEN_MARKET_CONDITIONS,
      ) as HiddenMarketConditionId,
      activeDrugIds: [] as DrugId[],
      localPriceMap: {},
      accessState: 'open',
      timers: {},
    };
  }

  return locationStates;
}

export function createNewRun(options: CreateNewRunOptions = {}): PlayerRun {
  const seed = options.seed ?? createRunSeed();
  const runId = options.runId ?? `run-${seed}`;
  const locationRng = createRng(deriveSeed(seed, ['starting-location']));
  const currentLocationId = locationRng.pick(LOCATIONS).locationId;
  const locationStates = generateMarketsForDay(
    seed,
    1,
    createEmptyLocationStates(seed),
  );

  return {
    runId,
    seed,
    currentDay: 1,
    currentLocationId,
    cash: RUN_CONFIG.startingCash,
    debt: RUN_CONFIG.startingDebt,
    health: RUN_CONFIG.startingHealth,
    capacityBase: RUN_CONFIG.baseCapacity,
    capacityBonus: 0,
    inventory: {},
    equippedWeaponId: null,
    bankBalance: 0,
    stashInventory: {},
    eventCooldowns: {},
    encounterHistory: [],
    locationStates,
    actionLog: [
      {
        type: 'run-started',
        day: 1,
        locationId: currentLocationId,
      },
    ],
    isRunEnded: false,
  };
}

function endRunAtDayLimit(run: PlayerRun): PlayerRun {
  if (run.isRunEnded) {
    return run;
  }

  return {
    ...run,
    isRunEnded: true,
    endReason: 'day-limit',
    actionLog: [
      ...run.actionLog,
      {
        type: 'run-ended',
        day: run.currentDay,
        reason: 'day-limit',
      },
    ],
  };
}

export function travelToLocation(
  run: PlayerRun,
  destinationLocationId: LocationId,
): TravelResult {
  if (run.isRunEnded) {
    return { ok: false, reason: 'run-ended' };
  }

  if (!LOCATIONS.some((location) => location.locationId === destinationLocationId)) {
    return { ok: false, reason: 'unknown-location' };
  }

  if (destinationLocationId === run.currentLocationId) {
    return { ok: false, reason: 'same-location' };
  }

  const involvesEzMart =
    run.currentLocationId === 'ez-mart' || destinationLocationId === 'ez-mart';

  if (involvesEzMart) {
    return {
      ok: true,
      run: {
        ...run,
        currentLocationId: destinationLocationId,
        actionLog: [
          ...run.actionLog,
          {
            type: 'travel',
            fromLocationId: run.currentLocationId,
            toLocationId: destinationLocationId,
            day: run.currentDay,
            dayAdvanced: false,
            debtBefore: run.debt,
            debtAfter: run.debt,
          },
        ],
      },
      dayAdvanced: false,
      endedRun: false,
    };
  }

  const nextDay = run.currentDay + 1;
  const debtAfter = applyDailyDebtGrowth(run.debt);
  const traveledRun: PlayerRun = {
    ...run,
    currentDay: Math.min(nextDay, RUN_CONFIG.runLengthDays),
    currentLocationId: destinationLocationId,
    debt: debtAfter,
    locationStates: generateMarketsForDay(
      run.seed,
      Math.min(nextDay, RUN_CONFIG.runLengthDays),
      run.locationStates,
    ),
    actionLog: [
      ...run.actionLog,
      {
        type: 'travel',
        fromLocationId: run.currentLocationId,
        toLocationId: destinationLocationId,
        day: Math.min(nextDay, RUN_CONFIG.runLengthDays),
        dayAdvanced: true,
        debtBefore: run.debt,
        debtAfter,
      },
    ],
  };

  if (nextDay >= RUN_CONFIG.runLengthDays) {
    return {
      ok: true,
      run: endRunAtDayLimit(traveledRun),
      dayAdvanced: true,
      endedRun: true,
    };
  }

  return {
    ok: true,
    run: traveledRun,
    dayAdvanced: true,
    endedRun: false,
  };
}

export const moveToLocation = travelToLocation;
