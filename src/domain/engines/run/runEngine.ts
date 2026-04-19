import { HIDDEN_MARKET_CONDITIONS, RUN_CONFIG } from '../../../config/economy';
import { LOCATIONS } from '../../../config/locations';
import type {
  DrugId,
  HiddenMarketConditionId,
  LocationId,
  LocationState,
  PlayerRun,
  PlayerRunEquipment,
  TravelResult,
} from '../../models/types';
import { createRng, createRunSeed, deriveSeed } from '../../../utils/rng';
import { generateMarketsForDay } from '../market/marketEngine';
import { travelToLocation as travelToLocationForRun } from '../travel/travelEngine';

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

export function createEmptyEquipment(): PlayerRunEquipment {
  return {
    ownedSurvivalItems: {},
    ownedApparelItemIds: [],
    ownedWeapons: {},
    ownedAttachmentCounts: {},
    equippedWeaponLoadout: {
      weaponId: null,
    },
  };
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
    equipment: createEmptyEquipment(),
    bankBalance: 0,
    stashInventory: {},
    eventCooldowns: {},
    encounterHistory: [],
    pendingEncounter: null,
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

export function travelToLocation(
  run: PlayerRun,
  destinationLocationId: LocationId,
): TravelResult {
  return travelToLocationForRun(run, destinationLocationId);
}

export const moveToLocation = travelToLocation;
