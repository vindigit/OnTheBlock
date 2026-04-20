import { RUN_CONFIG } from '../config/economy';
import { DRUG_BY_ID } from '../config/drugs';
import { ATTACHMENT_BY_ID } from '../config/attachments';
import { LOCATIONS } from '../config/locations';
import { WEAPON_BY_ID } from '../config/weapons';
import { generateMarketsForDay } from '../domain/engines/market/marketEngine';
import { createEmptyEquipment } from '../domain/engines/run/runEngine';
import type {
  ApparelItemId,
  AttachmentId,
  DrugId,
  EncounterChoice,
  EncounterHistoryEntry,
  EncounterOutcome,
  EncounterType,
  HiddenMarketConditionId,
  Inventory,
  InventoryEntry,
  LoadSaveResult,
  LocationId,
  LocationState,
  PendingEncounter,
  PlayerRun,
  PlayerRunEquipment,
  RunActionLogEntry,
  SaveGame,
  SurvivalItemId,
  WeaponId,
} from '../domain/models/types';
import type { KeyValueStorage } from './storage';

export const SAVE_GAME_KEY = 'on-the-block:active-run';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const LEGACY_SAVE_VERSIONS = [1, 2, 3];
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
const LOCATION_IDS = LOCATIONS.map((location) => location.locationId);
const APPAREL_IDS: ApparelItemId[] = ['amiri_jeans', 'crossbody_bag', 'trench_coat'];
const SURVIVAL_IDS: SurvivalItemId[] = ['snickers', 'bandages', 'narcan'];
const ENCOUNTER_TYPES: EncounterType[] = [
  'big-sal-interception',
  'mugging',
  'police-chase',
  'legacy',
];
const ENCOUNTER_CHOICES: EncounterChoice[] = [
  'hand-it-over',
  'surrender',
  'run',
  'fight',
];
const ENCOUNTER_OUTCOMES: EncounterOutcome[] = [
  'paid',
  'surrendered',
  'escaped',
  'caught',
  'caught-revived',
  'caught-run-ended',
  'fought-off',
  'mugged',
  'officer-killed',
  'fight-continued',
  'wounded',
  'contraband-seized',
];

function isDrugId(value: string): value is DrugId {
  return value in DRUG_BY_ID;
}

function isLocationId(value: unknown): value is LocationId {
  return typeof value === 'string' && LOCATION_IDS.includes(value as LocationId);
}

function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === 'string' && value in WEAPON_BY_ID;
}

function isAttachmentId(value: unknown): value is AttachmentId {
  return typeof value === 'string' && value in ATTACHMENT_BY_ID;
}

function isApparelItemId(value: unknown): value is ApparelItemId {
  return typeof value === 'string' && APPAREL_IDS.includes(value as ApparelItemId);
}

function isSurvivalItemId(value: unknown): value is SurvivalItemId {
  return typeof value === 'string' && SURVIVAL_IDS.includes(value as SurvivalItemId);
}

function isEncounterType(value: unknown): value is EncounterType {
  return typeof value === 'string' && ENCOUNTER_TYPES.includes(value as EncounterType);
}

function isEncounterChoice(value: unknown): value is EncounterChoice {
  return typeof value === 'string' && ENCOUNTER_CHOICES.includes(value as EncounterChoice);
}

function isEncounterOutcome(value: unknown): value is EncounterOutcome {
  return typeof value === 'string' && ENCOUNTER_OUTCOMES.includes(value as EncounterOutcome);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function normalizeLocationId(value: unknown): LocationId {
  if (value === 'ez-mart' || value === 'ez_mart') {
    return 'the-bodega';
  }

  return isLocationId(value) ? value : 'the-bodega';
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

function isInventory(value: unknown): value is Inventory {
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

function migrateInventory(value: unknown): Inventory {
  if (!isInventory(value)) {
    return {};
  }

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
  value: unknown,
): LocationState {
  const state = isRecord(value) ? value : {};

  return {
    locationId,
    hiddenMarketConditionId: isHiddenMarketConditionId(
      state.hiddenMarketConditionId,
    )
      ? state.hiddenMarketConditionId
      : 'steady',
    activeDrugIds: [],
    localPriceMap: {},
    accessState: 'open',
    timers: isRecord(state.timers) ? (state.timers as Record<string, number>) : {},
  };
}

function migrateActionLog(value: unknown): RunActionLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry): RunActionLogEntry[] => {
    if (!isRecord(entry) || typeof entry.type !== 'string') {
      return [];
    }

    const migrated = { ...entry };

    if ('locationId' in migrated) {
      migrated.locationId = normalizeLocationId(migrated.locationId);
    }

    if ('fromLocationId' in migrated) {
      migrated.fromLocationId = normalizeLocationId(migrated.fromLocationId);
    }

    if ('toLocationId' in migrated) {
      migrated.toLocationId = normalizeLocationId(migrated.toLocationId);
    }

    if ((migrated.type === 'buy' || migrated.type === 'sell') && 'drugId' in migrated) {
      const drugId = mapLegacyDrugId(migrated.drugId);

      if (!drugId) {
        return [];
      }

      migrated.drugId = drugId;
    }

    if (migrated.type === 'run-ended' && migrated.reason !== 'health-zero') {
      migrated.reason = 'day-limit';
    }

    return [migrated as RunActionLogEntry];
  });
}

function migrateEncounterHistory(value: unknown): EncounterHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry, index): EncounterHistoryEntry[] => {
    if (typeof entry === 'string') {
      return [
        {
          encounterId: entry || `legacy-${index}`,
          type: 'legacy',
          day: 1,
          locationId: 'the-bodega',
          choice: 'legacy',
          outcome: 'legacy',
        },
      ];
    }

    if (!isRecord(entry)) {
      return [];
    }

    return [
      {
        encounterId:
          typeof entry.encounterId === 'string'
            ? entry.encounterId
            : `legacy-${index}`,
        type: isEncounterType(entry.type) ? entry.type : 'legacy',
        day: typeof entry.day === 'number' ? entry.day : 1,
        locationId: normalizeLocationId(entry.locationId),
        choice: isEncounterChoice(entry.choice) ? entry.choice : 'legacy',
        outcome: isEncounterOutcome(entry.outcome) ? entry.outcome : 'legacy',
        cashLost: typeof entry.cashLost === 'number' ? entry.cashLost : undefined,
        debtReduced:
          typeof entry.debtReduced === 'number' ? entry.debtReduced : undefined,
        healthLost:
          typeof entry.healthLost === 'number' ? entry.healthLost : undefined,
        inventoryUnitsLost:
          typeof entry.inventoryUnitsLost === 'number'
            ? entry.inventoryUnitsLost
            : undefined,
        fightSuccessChance:
          typeof entry.fightSuccessChance === 'number'
            ? entry.fightSuccessChance
            : undefined,
        weaponId: isWeaponId(entry.weaponId) ? entry.weaponId : undefined,
        cashRewarded:
          typeof entry.cashRewarded === 'number' ? entry.cashRewarded : undefined,
        deputiesCount:
          typeof entry.deputiesCount === 'number' ? entry.deputiesCount : undefined,
        officersDefeated:
          typeof entry.officersDefeated === 'number'
            ? entry.officersDefeated
            : undefined,
      },
    ];
  });
}

function migratePendingEncounter(value: unknown): PendingEncounter | null {
  if (
    !isRecord(value) ||
    (value.type !== 'big-sal-interception' &&
      value.type !== 'mugging' &&
      value.type !== 'police-chase')
  ) {
    return null;
  }

  const isMugging = value.type === 'mugging';
  const isPolice = value.type === 'police-chase';

  if (isPolice) {
    if (
      !isNonNegativeInteger(value.deputyCount) ||
      !isNonNegativeInteger(value.officersRemaining) ||
      !isNonNegativeInteger(value.officersDefeated) ||
      !isNonNegativeInteger(value.round)
    ) {
      return null;
    }

    return {
      encounterId:
        typeof value.encounterId === 'string' ? value.encounterId : 'police-legacy',
      type: 'police-chase',
      title: typeof value.title === 'string' ? value.title : 'Red and Blue!',
      body:
        typeof value.body === 'string'
          ? value.body
          : 'Officer Hardass rolls up hot. The badge is out, the cuffs are ready, and your pockets are the whole case.',
      createdDay: typeof value.createdDay === 'number' ? value.createdDay : 1,
      fromLocationId: normalizeLocationId(value.fromLocationId),
      toLocationId: normalizeLocationId(value.toLocationId),
      cashAtTrigger:
        typeof value.cashAtTrigger === 'number' ? value.cashAtTrigger : undefined,
      deputyCount: value.deputyCount,
      officersRemaining: value.officersRemaining,
      officersDefeated: value.officersDefeated,
      round: value.round,
      lastRoundSummary:
        typeof value.lastRoundSummary === 'string'
          ? value.lastRoundSummary
          : undefined,
    };
  }

  return {
    encounterId:
      typeof value.encounterId === 'string'
        ? value.encounterId
        : isMugging
          ? 'mugging-legacy'
          : 'big-sal-legacy',
    type: value.type,
    title:
      typeof value.title === 'string' ? value.title : isMugging ? 'Cornered!' : 'Blocked!',
    body:
      typeof value.body === 'string'
        ? value.body
        : isMugging
          ? 'A couple of wolves step out from the stairwell. They clock the roll in your pocket before you clock the exit.'
          : "Big Sal's crew cuts you off in the alley. They don't want to talk about prices; they want what you owe.",
    createdDay: typeof value.createdDay === 'number' ? value.createdDay : 1,
    fromLocationId: normalizeLocationId(value.fromLocationId),
    toLocationId: normalizeLocationId(value.toLocationId),
    debtAtTrigger:
      typeof value.debtAtTrigger === 'number' ? value.debtAtTrigger : undefined,
    cashAtTrigger:
      typeof value.cashAtTrigger === 'number' ? value.cashAtTrigger : undefined,
  };
}

function migrateEquipment(value: unknown, legacyWeaponId: unknown): PlayerRunEquipment {
  const equipment = createEmptyEquipment();
  const source = isRecord(value) ? value : {};
  const ownedSurvivalItems = isRecord(source.ownedSurvivalItems)
    ? source.ownedSurvivalItems
    : {};
  const ownedAttachmentCounts = isRecord(source.ownedAttachmentCounts)
    ? source.ownedAttachmentCounts
    : {};
  const ownedWeapons = isRecord(source.ownedWeapons) ? source.ownedWeapons : {};

  for (const [itemId, count] of Object.entries(ownedSurvivalItems)) {
    if (isSurvivalItemId(itemId) && typeof count === 'number' && count > 0) {
      equipment.ownedSurvivalItems[itemId] = Math.floor(count);
    }
  }

  if (Array.isArray(source.ownedApparelItemIds)) {
    equipment.ownedApparelItemIds = source.ownedApparelItemIds.filter(
      isApparelItemId,
    );
  }

  for (const [attachmentId, count] of Object.entries(ownedAttachmentCounts)) {
    if (isAttachmentId(attachmentId) && typeof count === 'number' && count > 0) {
      equipment.ownedAttachmentCounts[attachmentId] = Math.floor(count);
    }
  }

  for (const [weaponId, ownedWeapon] of Object.entries(ownedWeapons)) {
    if (!isWeaponId(weaponId)) {
      continue;
    }

    const installedAttachmentIds =
      isRecord(ownedWeapon) && Array.isArray(ownedWeapon.installedAttachmentIds)
        ? ownedWeapon.installedAttachmentIds.filter(isAttachmentId)
        : [];

    equipment.ownedWeapons[weaponId] = {
      weaponId,
      installedAttachmentIds: [...new Set(installedAttachmentIds)],
    };
  }

  const equippedWeaponId =
    isRecord(source.equippedWeaponLoadout) &&
    isWeaponId(source.equippedWeaponLoadout.weaponId)
      ? source.equippedWeaponLoadout.weaponId
      : isWeaponId(legacyWeaponId)
        ? legacyWeaponId
        : null;

  if (equippedWeaponId) {
    if (!equipment.ownedWeapons[equippedWeaponId]) {
      equipment.ownedWeapons[equippedWeaponId] = {
        weaponId: equippedWeaponId,
        installedAttachmentIds: [],
      };
    }

    equipment.equippedWeaponLoadout = { weaponId: equippedWeaponId };
  }

  return equipment;
}

function migratePlayerRun(value: unknown): PlayerRun | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.runId !== 'string' ||
    typeof value.seed !== 'string' ||
    typeof value.currentDay !== 'number' ||
    typeof value.cash !== 'number' ||
    typeof value.debt !== 'number' ||
    typeof value.health !== 'number' ||
    typeof value.isRunEnded !== 'boolean'
  ) {
    return null;
  }

  const currentLocationId = normalizeLocationId(value.currentLocationId);
  const previousLocationStates = isRecord(value.locationStates)
    ? value.locationStates
    : {};
  const emptyLocationStates = Object.fromEntries(
    LOCATIONS.map((location) => [
      location.locationId,
      migrateLocationState(
        location.locationId,
        previousLocationStates[location.locationId] ??
          previousLocationStates[location.locationId === 'the-bodega' ? 'ez-mart' : ''],
      ),
    ]),
  ) as Record<LocationId, LocationState>;
  const actionLog = migrateActionLog(value.actionLog);
  const migratedRun: PlayerRun = {
    runId: value.runId,
    seed: value.seed,
    currentDay: value.currentDay,
    currentLocationId,
    cash: value.cash,
    debt: value.debt,
    health: Math.min(100, Math.max(0, value.health)),
    capacityBase:
      typeof value.capacityBase === 'number' ? value.capacityBase : RUN_CONFIG.baseCapacity,
    capacityBonus:
      typeof value.capacityBonus === 'number' ? value.capacityBonus : 0,
    inventory: migrateInventory(value.inventory),
    equipment: migrateEquipment(value.equipment, value.equippedWeaponId),
    bankBalance:
      typeof value.bankBalance === 'number' ? value.bankBalance : 0,
    stashInventory: migrateInventory(value.stashInventory),
    eventCooldowns: isRecord(value.eventCooldowns)
      ? (value.eventCooldowns as Record<string, number>)
      : {},
    encounterHistory: migrateEncounterHistory(value.encounterHistory),
    pendingEncounter: migratePendingEncounter(value.pendingEncounter),
    locationStates: generateMarketsForDay(
      value.seed,
      value.currentDay,
      emptyLocationStates,
    ),
    actionLog,
    isRunEnded: value.isRunEnded,
    endReason:
      value.endReason === 'health-zero' || value.endReason === 'day-limit'
        ? value.endReason
        : undefined,
  };

  if (migratedRun.actionLog.length === 0) {
    migratedRun.actionLog = [
      {
        type: 'run-started',
        day: 1,
        locationId: currentLocationId,
      },
    ];
  }

  return migratedRun;
}

function isSaveGame(value: unknown): value is SaveGame {
  if (!isRecord(value) || value.saveVersion !== CURRENT_SAVE_VERSION) {
    return false;
  }

  const run = migratePlayerRun(value.serializedRunState);

  return (
    run !== null &&
    typeof value.saveSlotId === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.appVersion === 'string'
  );
}

function migrateSaveGame(value: Record<string, unknown>): SaveGame | null {
  const migratedRun = migratePlayerRun(value.serializedRunState);

  if (!migratedRun) {
    return null;
  }

  const timestamp = new Date().toISOString();

  return {
    saveSlotId:
      typeof value.saveSlotId === 'string' ? value.saveSlotId : 'active-run',
    serializedRunState: migratedRun,
    createdAt:
      typeof value.createdAt === 'string' ? value.createdAt : timestamp,
    updatedAt: timestamp,
    appVersion:
      typeof value.appVersion === 'string' ? value.appVersion : '1.0.0',
    saveVersion: CURRENT_SAVE_VERSION,
  };
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

    if (LEGACY_SAVE_VERSIONS.includes(parsed.saveVersion as number)) {
      const migrated = migrateSaveGame(parsed);

      return migrated
        ? { ok: true, saveGame: migrated }
        : { ok: false, reason: 'corrupt' };
    }

    if (parsed.saveVersion !== CURRENT_SAVE_VERSION) {
      return { ok: false, reason: 'unsupported-version' };
    }

    if (!isSaveGame(parsed)) {
      return { ok: false, reason: 'corrupt' };
    }

    const normalized = migrateSaveGame(parsed);

    return normalized
      ? { ok: true, saveGame: normalized }
      : { ok: false, reason: 'corrupt' };
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
