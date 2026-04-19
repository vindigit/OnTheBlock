import { create } from 'zustand';
import type {
  AttachmentId,
  BodegaItemId,
  DrugId,
  DebtPaymentResult,
  EncounterChoice,
  EncounterResolutionResult,
  EquipmentResult,
  LocationId,
  PlayerRun,
  TradeResult,
  TravelResult,
  WeaponId,
} from '../../domain/models/types';
import { payDebt as payDebtForRun } from '../../domain/engines/debt/debtPaymentEngine';
import { resolvePendingEncounter as resolvePendingEncounterForRun } from '../../domain/engines/encounter/encounterEngine';
import {
  buyBodegaItem,
  equipWeapon as equipWeaponForRun,
  installAttachmentOnWeapon,
} from '../../domain/engines/equipment/equipmentEngine';
import { buyDrug, sellDrug } from '../../domain/engines/trading/tradingEngine';
import { createNewRun, moveToLocation } from '../../domain/engines/run/runEngine';
import { clearSavedRun, loadSavedRun, saveRun } from '../../persistence/saveGame';
import {
  createDefaultStorage,
  InMemoryStorage,
  type KeyValueStorage,
} from '../../persistence/storage';

type BootStatus = 'booting' | 'ready';

type RunStoreState = {
  bootStatus: BootStatus;
  currentRun: PlayerRun | null;
  lastError: string | null;
  hydrate: () => void;
  startNewRun: (seed?: string) => PlayerRun;
  buy: (drugId: DrugId, quantity: number) => TradeResult;
  sell: (drugId: DrugId, quantity: number) => TradeResult;
  travel: (locationId: LocationId) => TravelResult;
  payDebt: (amount: number) => DebtPaymentResult;
  buyBodegaItem: (itemId: BodegaItemId) => EquipmentResult;
  equipWeapon: (weaponId: WeaponId) => EquipmentResult;
  installAttachment: (
    attachmentId: AttachmentId,
    weaponId?: WeaponId,
  ) => EquipmentResult;
  resolvePendingEncounter: (choice: EncounterChoice) => EncounterResolutionResult;
  abandonRun: () => void;
};

function createStorage(): KeyValueStorage {
  try {
    return createDefaultStorage();
  } catch {
    return new InMemoryStorage();
  }
}

const storage = createStorage();

function persistAndReturn(run: PlayerRun): PlayerRun {
  saveRun(storage, run);
  return run;
}

export const useRunStore = create<RunStoreState>((set, get) => ({
  bootStatus: 'booting',
  currentRun: null,
  lastError: null,
  hydrate: () => {
    const loadResult = loadSavedRun(storage);

    if (loadResult.ok) {
      set({
        bootStatus: 'ready',
        currentRun: loadResult.saveGame.serializedRunState,
        lastError: null,
      });
      return;
    }

    if (loadResult.reason === 'corrupt' || loadResult.reason === 'unsupported-version') {
      clearSavedRun(storage);
    }

    set({
      bootStatus: 'ready',
      currentRun: null,
      lastError: loadResult.reason === 'missing' ? null : loadResult.reason,
    });
  },
  startNewRun: (seed) => {
    const run = persistAndReturn(createNewRun({ seed }));
    set({ currentRun: run, lastError: null, bootStatus: 'ready' });
    return run;
  },
  buy: (drugId, quantity) => {
    const run = get().currentRun;

    if (!run) {
      return { ok: false, reason: 'run-ended' };
    }

    const result = buyDrug(run, drugId, quantity);

    if (result.ok) {
      set({ currentRun: persistAndReturn(result.run), lastError: null });
    }

    return result;
  },
  sell: (drugId, quantity) => {
    const run = get().currentRun;

    if (!run) {
      return { ok: false, reason: 'run-ended' };
    }

    const result = sellDrug(run, drugId, quantity);

    if (result.ok) {
      set({ currentRun: persistAndReturn(result.run), lastError: null });
    }

    return result;
  },
  travel: (locationId) => {
    const run = get().currentRun;

    if (!run) {
      return { ok: false, reason: 'run-ended' };
    }

    const result = moveToLocation(run, locationId);

    if (result.ok) {
      set({ currentRun: persistAndReturn(result.run), lastError: null });
    }

    return result;
  },
  payDebt: (amount) => {
    const run = get().currentRun;

    if (!run) {
      return { ok: false, reason: 'run-ended' };
    }

    const result = payDebtForRun(run, amount);

    if (result.ok) {
      set({ currentRun: persistAndReturn(result.run), lastError: null });
    }

    return result;
  },
  buyBodegaItem: (itemId) => {
    const run = get().currentRun;

    if (!run) {
      return { ok: false, reason: 'run-ended' };
    }

    const result = buyBodegaItem(run, itemId);

    if (result.ok) {
      set({ currentRun: persistAndReturn(result.run), lastError: null });
    }

    return result;
  },
  equipWeapon: (weaponId) => {
    const run = get().currentRun;

    if (!run) {
      return { ok: false, reason: 'run-ended' };
    }

    const result = equipWeaponForRun(run, weaponId);

    if (result.ok) {
      set({ currentRun: persistAndReturn(result.run), lastError: null });
    }

    return result;
  },
  installAttachment: (attachmentId, weaponId) => {
    const run = get().currentRun;

    if (!run) {
      return { ok: false, reason: 'run-ended' };
    }

    const result = installAttachmentOnWeapon(run, attachmentId, weaponId);

    if (result.ok) {
      set({ currentRun: persistAndReturn(result.run), lastError: null });
    }

    return result;
  },
  resolvePendingEncounter: (choice) => {
    const run = get().currentRun;

    if (!run) {
      return { ok: false, reason: 'run-ended' };
    }

    const result = resolvePendingEncounterForRun(run, choice);

    if (result.ok) {
      set({ currentRun: persistAndReturn(result.run), lastError: null });
    }

    return result;
  },
  abandonRun: () => {
    clearSavedRun(storage);
    set({ currentRun: null, lastError: null, bootStatus: 'ready' });
  },
}));
