import { RUN_CONFIG } from '../config/economy';
import type { LoadSaveResult, PlayerRun, SaveGame } from '../domain/models/types';
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
    value.saveVersion === RUN_CONFIG.saveVersion &&
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

    if (!isRecord(parsed) || parsed.saveVersion !== RUN_CONFIG.saveVersion) {
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
