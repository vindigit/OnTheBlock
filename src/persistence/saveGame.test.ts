import { createNewRun } from '../domain/engines/run/runEngine';
import { DRUG_BY_ID } from '../config/drugs';
import { InMemoryStorage } from './storage';
import {
  SAVE_GAME_KEY,
  createSaveGame,
  deserializeSaveGame,
  loadSavedRun,
  saveRun,
  serializeSaveGame,
} from './saveGame';

describe('save game persistence', () => {
  it('round trips a versioned save game', () => {
    const run = createNewRun({ seed: 'save' });
    const saveGame = createSaveGame(run, 'test');
    const parsed = deserializeSaveGame(serializeSaveGame(saveGame));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.saveGame.serializedRunState).toEqual(run);
    expect(parsed.saveGame.saveVersion).toBe(4);
  });

  it('loads through a storage adapter', () => {
    const storage = new InMemoryStorage();
    const run = createNewRun({ seed: 'adapter' });

    saveRun(storage, run);

    const result = loadSavedRun(storage);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.saveGame.serializedRunState.runId).toBe(run.runId);
  });

  it('handles corrupted and unsupported saves', () => {
    const storage = new InMemoryStorage();
    storage.setString(SAVE_GAME_KEY, '{bad json');
    expect(loadSavedRun(storage)).toEqual({ ok: false, reason: 'corrupt' });

    storage.setString(SAVE_GAME_KEY, JSON.stringify({ saveVersion: 999 }));
    expect(loadSavedRun(storage)).toEqual({
      ok: false,
      reason: 'unsupported-version',
    });
  });

  it('migrates v1 saves with legacy drug ids', () => {
    const run = createNewRun({ seed: 'legacy-save' });
    const legacySave = {
      saveSlotId: 'active-run',
      serializedRunState: {
        ...run,
        inventory: {
          coke: { quantity: 2, averagePurchasePrice: 2000 },
          acid: { quantity: 3, averagePurchasePrice: 600 },
          'perc-30s': { quantity: 4, averagePurchasePrice: 900 },
        },
        stashInventory: {
          '2cb': { quantity: 5, averagePurchasePrice: 1800 },
          ecstasy: { quantity: 6, averagePurchasePrice: 450 },
        },
        actionLog: [
          ...run.actionLog,
          {
            type: 'buy',
            day: 1,
            locationId: run.currentLocationId,
            drugId: 'coke',
            quantity: 2,
            unitPrice: 2000,
            total: 4000,
          },
          {
            type: 'sell',
            day: 1,
            locationId: run.currentLocationId,
            drugId: 'ecstasy',
            quantity: 1,
            unitPrice: 450,
            total: 450,
          },
        ],
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      appVersion: '1.0.0',
      saveVersion: 1,
    };

    const parsed = deserializeSaveGame(JSON.stringify(legacySave));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const migratedRun = parsed.saveGame.serializedRunState;
    expect(parsed.saveGame.saveVersion).toBe(4);
    expect(migratedRun.inventory.coke_brick).toEqual({
      quantity: 2,
      averagePurchasePrice: 2000,
    });
    expect(migratedRun.inventory.acid_sheet).toEqual({
      quantity: 3,
      averagePurchasePrice: 600,
    });
    expect(migratedRun.inventory.perc_30s).toEqual({
      quantity: 4,
      averagePurchasePrice: 900,
    });
    expect(migratedRun.stashInventory.two_cb_powder).toEqual({
      quantity: 5,
      averagePurchasePrice: 1800,
    });
    expect(migratedRun.stashInventory.molly).toEqual({
      quantity: 6,
      averagePurchasePrice: 450,
    });

    for (const state of Object.values(migratedRun.locationStates)) {
      expect(state.activeDrugIds).toHaveLength(8);
      expect(Object.keys(state.localPriceMap)).toHaveLength(8);

      for (const drugId of state.activeDrugIds) {
        expect(DRUG_BY_ID[drugId]).toBeDefined();
        expect(state.localPriceMap[drugId]).toBeGreaterThanOrEqual(
          DRUG_BY_ID[drugId].minPrice,
        );
        expect(state.localPriceMap[drugId]).toBeLessThanOrEqual(
          DRUG_BY_ID[drugId].maxPrice,
        );
      }
    }

    expect(
      migratedRun.actionLog.filter(
        (entry) =>
          (entry.type === 'buy' || entry.type === 'sell') &&
          !DRUG_BY_ID[entry.drugId],
      ),
    ).toEqual([]);
  });

  it('migrates v2 saves with old Bodega and weapon state', () => {
    const run = createNewRun({ seed: 'legacy-v2' });
    const legacySave = {
      saveSlotId: 'active-run',
      serializedRunState: {
        ...run,
        currentLocationId: 'ez-mart',
        equippedWeaponId: 'glock_19',
        locationStates: {
          ...run.locationStates,
          'ez-mart': run.locationStates['the-bodega'],
        },
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      appVersion: '1.0.0',
      saveVersion: 2,
    };

    const parsed = deserializeSaveGame(JSON.stringify(legacySave));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.saveGame.saveVersion).toBe(4);
    expect(parsed.saveGame.serializedRunState.currentLocationId).toBe('the-bodega');
    expect(
      parsed.saveGame.serializedRunState.equipment.equippedWeaponLoadout.weaponId,
    ).toBe('glock_19');
    expect(
      parsed.saveGame.serializedRunState.equipment.ownedWeapons.glock_19,
    ).toEqual({
      weaponId: 'glock_19',
      installedAttachmentIds: [],
    });
    expect(
      parsed.saveGame.serializedRunState.locationStates['the-bodega'],
    ).toBeDefined();
  });

  it('migrates v3 saves with mugging pending encounters', () => {
    const run = {
      ...createNewRun({ seed: 'mugging-save' }),
      pendingEncounter: {
        encounterId: 'mugging-save-test',
        type: 'mugging' as const,
        title: 'Cornered!',
        body: 'A couple of wolves step out from the stairwell.',
        createdDay: 4,
        fromLocationId: 'velvet-heights' as const,
        toLocationId: 'vista-creek-towers' as const,
        cashAtTrigger: 50_000,
      },
    };
    const legacySave = {
      ...createSaveGame(run),
      saveVersion: 3,
    };
    const parsed = deserializeSaveGame(JSON.stringify(legacySave));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.saveGame.serializedRunState.pendingEncounter).toMatchObject({
      encounterId: 'mugging-save-test',
      type: 'mugging',
      cashAtTrigger: 50_000,
    });
    expect(parsed.saveGame.saveVersion).toBe(4);
  });

  it('round trips police pending encounters and police history in v4 saves', () => {
    const run = {
      ...createNewRun({ seed: 'police-save' }),
      pendingEncounter: {
        encounterId: 'police-save-test',
        type: 'police-chase' as const,
        title: 'Red and Blue!',
        body: 'Officer Hardass rolls up hot.',
        createdDay: 4,
        fromLocationId: 'velvet-heights' as const,
        toLocationId: 'vista-creek-towers' as const,
        cashAtTrigger: 50_000,
        deputyCount: 2,
        officersRemaining: 3,
        officersDefeated: 1,
        round: 2,
        lastRoundSummary: 'Glock 19 dropped one officer. 3 still on you.',
      },
      encounterHistory: [
        {
          encounterId: 'police-history-test',
          type: 'police-chase' as const,
          day: 4,
          locationId: 'vista-creek-towers' as const,
          choice: 'fight' as const,
          outcome: 'fought-off' as const,
          cashRewarded: 100_000,
          deputiesCount: 2,
          officersDefeated: 3,
          fightSuccessChance: 0.9,
          weaponId: 'draco' as const,
        },
      ],
    };
    const parsed = deserializeSaveGame(serializeSaveGame(createSaveGame(run)));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.saveGame.serializedRunState.pendingEncounter).toMatchObject({
      encounterId: 'police-save-test',
      type: 'police-chase',
      deputyCount: 2,
      officersRemaining: 3,
      officersDefeated: 1,
      round: 2,
      lastRoundSummary: 'Glock 19 dropped one officer. 3 still on you.',
    });
    expect(parsed.saveGame.serializedRunState.encounterHistory.at(-1)).toMatchObject({
      cashRewarded: 100_000,
      deputiesCount: 2,
      officersDefeated: 3,
      type: 'police-chase',
      weaponId: 'draco',
    });
  });

  it('drops malformed police pending encounters without corrupting the save', () => {
    const run = {
      ...createNewRun({ seed: 'bad-police-save' }),
      pendingEncounter: {
        encounterId: 'bad-police-save-test',
        type: 'police-chase',
        title: 'Red and Blue!',
        body: 'Officer Hardass rolls up hot.',
        createdDay: 4,
        fromLocationId: 'velvet-heights',
        toLocationId: 'vista-creek-towers',
        deputyCount: 2,
        officersRemaining: 'three',
        officersDefeated: 1,
        round: 2,
      },
    };
    const parsed = deserializeSaveGame(
      JSON.stringify({
        saveSlotId: 'active-run',
        serializedRunState: run,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        saveVersion: 4,
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.saveGame.serializedRunState.pendingEncounter).toBeNull();
  });
});
