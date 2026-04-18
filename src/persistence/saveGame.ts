import { RUN_CONFIG } from '../config/economy';
import { DRUG_BY_ID } from '../config/drugs';
import { LOCATIONS } from '../config/locations';
import { generateMarketsForDay } from '../domain/engines/market/marketEngine';
import type {
  DrugId,
  HiddenMarketConditionId,
  Inventory,
  InventoryEntry,
  LoadSaveResult,
  LocationId,
  LocationState,
  PlayerRun,
  RunActionLogEntry,
  SaveGame,
} from '../domain/models/types';
import type { KeyValueStorage } from './storage';

export const SAVE_GAME_KEY = 'on-the-block:active-run';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPlayerRun(value: unknown): value is PlayerRun {
  return (
    isRecord(value) &&
    typeof value.runId === 'string' &&
    typeof value.seed === 'string' &&
    typeof value.currentDay === 'number' &&
    typeof value.cash === 'number' &&
    typeof value.debt === 'number' &&
    typeof value.health === 'number' &&
    typeof value.currentLocationId === 'string' &&
    typeof value.isRunEnded === 'boolean' &&
    isRecord(value.locationStates) &&
    isInventory(value.inventory) &&
    isInventory(value.stashInventory)
  );
}

const LEGACY_SAVE_VERSION = 1;
const CURRENT_SAVE_VERSION = RUN_CONFIG.saveVersion;
const LEGACY_DRUG_ID_MAP: Record<string, DrugId> = {
  weed: 'weed',
  coke: 'coke_brick',
  heroin: 'heroin',
  acid: 'acid_sheet',
  speed: 'speed',
  'perc-30s': 'perc_30s',
  shrooms: 'shrooms',
  hashish: 'hashish',
  crack: 'crack',
  '2cb': 'two_cb_powder',
  ecstasy: 'molly',
  lean: 'lean',
};

const HIDDEN_MARKET_CONDITION_IDS: HiddenMarketConditionId[] = [
  'steady',
  'discounted',
  'inflated',
  'choppy',
];

function isDrugId(value: string): value is DrugId {
  return value in DRUG_BY_ID;
}

function mapLegacyDrugId(value: unknown): DrugId | null {
  if (typeof value !== 'string') {
    return null;
  }

  return LEGACY_DRUG_ID_MAP[value] ?? (isDrugId(value) ? value : null);
}

function combineInventoryEntries(
  current: InventoryEntry | undefined,
  added: InventoryEntry,
): InventoryEntry {
  if (!current) {
    return added;
  }

  const quantity = current.quantity + added.quantity;

  return {
    quantity,
    averagePurchasePrice: Math.round(
      (current.quantity * current.averagePurchasePrice +
        added.quantity * added.averagePurchasePrice) /
        quantity,
    ),
  };
}

function migrateInventory(value: Inventory): Inventory {
  const migrated: Inventory = {};

  for (const [legacyDrugId, entry] of Object.entries(value)) {
    if (!entry) {
      continue;
    }

    const drugId = mapLegacyDrugId(legacyDrugId);

    if (!drugId) {
      continue;
    }

    migrated[drugId] = combineInventoryEntries(migrated[drugId], entry);
  }

  return migrated;
}

function isHiddenMarketConditionId(value: unknown): value is HiddenMarketConditionId {
  return (
    typeof value === 'string' &&
    HIDDEN_MARKET_CONDITION_IDS.includes(value as HiddenMarketConditionId)
  );
}

function migrateLocationState(
  locationId: LocationId,
  value: LocationState | undefined,
): LocationState {
  return {
    locationId,
    hiddenMarketConditionId: isHiddenMarketConditionId(
      value?.hiddenMarketConditionId,
    )
      ? value.hiddenMarketConditionId
      : 'steady',
    activeDrugIds: [],
    localPriceMap: {},
    accessState: 'open',
    timers: value?.timers ?? {},
  };
}

function migrateActionLog(actionLog: RunActionLogEntry[]): RunActionLogEntry[] {
  return actionLog.flatMap((entry) => {
    if ((entry.type !== 'buy' && entry.type !== 'sell') || !isRecord(entry)) {
      return [entry];
    }

    const drugId = mapLegacyDrugId(entry.drugId);

    if (!drugId) {
      return [];
    }

    return [{ ...entry, drugId } as RunActionLogEntry];
  });
}

function migratePlayerRunFromV1(run: PlayerRun): PlayerRun {
  const emptyLocationStates = Object.fromEntries(
    LOCATIONS.map((location) => [
      location.locationId,
      migrateLocationState(
        location.locationId,
        run.locationStates[location.locationId],
      ),
    ]),
  ) as Record<LocationId, LocationState>;

  return {
    ...run,
    inventory: migrateInventory(run.inventory),
    stashInventory: migrateInventory(run.stashInventory),
    locationStates: generateMarketsForDay(
      run.seed,
      run.currentDay,
      emptyLocationStates,
    ),
    actionLog: migrateActionLog(run.actionLog),
  };
}

function migrateSaveGameFromV1(value: SaveGame): SaveGame {
  const timestamp = new Date().toISOString();

  return {
    ...value,
    saveVersion: CURRENT_SAVE_VERSION,
    updatedAt: timestamp,
    serializedRunState: migratePlayerRunFromV1(value.serializedRunState),
  };
}

function isInventory(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((entry) => {
    if (entry === undefined) {
      return true;
    }

    return (
      isRecord(entry) &&
      typeof entry.quantity === 'number' &&
      typeof entry.averagePurchasePrice === 'number'
    );
  });
}

function isSaveGame(value: unknown): value is SaveGame {
  return (
    isRecord(value) &&
    value.saveVersion === CURRENT_SAVE_VERSION &&
    typeof value.saveSlotId === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.appVersion === 'string' &&
    isPlayerRun(value.serializedRunState)
  );
}

export function createSaveGame(run: PlayerRun, appVersion = '1.0.0'): SaveGame {
  const timestamp = new Date().toISOString();

  return {
    saveSlotId: 'active-run',
    serializedRunState: run,
    createdAt: timestamp,
    updatedAt: timestamp,
    appVersion,
    saveVersion: RUN_CONFIG.saveVersion,
  };
}

export function serializeSaveGame(saveGame: SaveGame): string {
  return JSON.stringify(saveGame);
}

export function deserializeSaveGame(rawValue: string): LoadSaveResult {
  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!isRecord(parsed)) {
      return { ok: false, reason: 'unsupported-version' };
    }

    if (parsed.saveVersion === LEGACY_SAVE_VERSION) {
      if (!isRecord(parsed) || !isPlayerRun(parsed.serializedRunState)) {
        return { ok: false, reason: 'corrupt' };
      }

      return { ok: true, saveGame: migrateSaveGameFromV1(parsed as SaveGame) };
    }

    if (parsed.saveVersion !== CURRENT_SAVE_VERSION) {
      return { ok: false, reason: 'unsupported-version' };
    }

    if (!isSaveGame(parsed)) {
      return { ok: false, reason: 'corrupt' };
    }

    return { ok: true, saveGame: parsed };
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
}

export function saveRun(storage: KeyValueStorage, run: PlayerRun): SaveGame {
  const saveGame = createSaveGame(run);
  storage.setString(SAVE_GAME_KEY, serializeSaveGame(saveGame));
  return saveGame;
}

export function loadSavedRun(storage: KeyValueStorage): LoadSaveResult {
  const rawValue = storage.getString(SAVE_GAME_KEY);

  if (!rawValue) {
    return { ok: false, reason: 'missing' };
  }

  return deserializeSaveGame(rawValue);
}

export function clearSavedRun(storage: KeyValueStorage): void {
  storage.delete(SAVE_GAME_KEY);
}
