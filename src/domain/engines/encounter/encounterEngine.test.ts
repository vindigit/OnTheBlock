import type { PendingEncounter, PlayerRun } from '../../models/types';
import { createNewRun } from '../run/runEngine';
import {
  getBigSalInterceptionChance,
  resolvePendingEncounter,
} from './encounterEngine';

function pendingEncounter(): PendingEncounter {
  return {
    encounterId: 'big-sal-test',
    type: 'big-sal-interception',
    title: 'Blocked!',
    body: "Big Sal's crew cuts you off in the alley. They don't want to talk about prices; they want what you owe.",
    createdDay: 2,
    fromLocationId: 'velvet-heights',
    toLocationId: 'vista-creek-towers',
    debtAtTrigger: 25_000,
  };
}

function runWithPending(overrides: Partial<PlayerRun> = {}) {
  return {
    ...createNewRun({ seed: 'big-sal' }),
    currentLocationId: 'vista-creek-towers' as const,
    cash: 10_000,
    debt: 25_000,
    pendingEncounter: pendingEncounter(),
    ...overrides,
  };
}

function findFailedRunAttempt(overrides: Partial<PlayerRun> = {}) {
  for (let index = 0; index < 200; index += 1) {
    const run = runWithPending({
      ...overrides,
      seed: `caught-${index}`,
    });
    const result = resolvePendingEncounter(run, 'run');

    if (result.ok && result.outcome !== 'escaped') {
      return result;
    }
  }

  throw new Error('Expected to find a failed Big Sal run attempt.');
}

describe('Big Sal encounter engine', () => {
  it('uses configured debt pressure thresholds', () => {
    expect(getBigSalInterceptionChance(20_000)).toBe(0);
    expect(getBigSalInterceptionChance(20_001)).toBe(0.15);
    expect(getBigSalInterceptionChance(50_000)).toBe(0.15);
    expect(getBigSalInterceptionChance(50_001)).toBe(0.3);
  });

  it('hand it over reduces cash and debt by the amount actually paid', () => {
    const result = resolvePendingEncounter(runWithPending({ cash: 4_000, debt: 9_000 }), 'hand-it-over');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.run.cash).toBe(0);
    expect(result.run.debt).toBe(5_000);
    expect(result.run.pendingEncounter).toBeNull();
    expect(result.run.encounterHistory.at(-1)).toMatchObject({
      cashLost: 4_000,
      debtReduced: 4_000,
      outcome: 'paid',
    });
  });

  it('hand it over resolves even with no cash', () => {
    const result = resolvePendingEncounter(runWithPending({ cash: 0, debt: 9_000 }), 'hand-it-over');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.run.cash).toBe(0);
    expect(result.run.debt).toBe(9_000);
  });

  it('failed run removes 50 health and 10 percent of inventory deterministically', () => {
    const result = findFailedRunAttempt({
      health: 100,
      inventory: {
        weed: { quantity: 5, averagePurchasePrice: 100 },
        molly: { quantity: 5, averagePurchasePrice: 20 },
      },
    });

    expect(result.run.health).toBe(50);
    expect(
      Object.values(result.run.inventory).reduce(
        (sum, entry) => sum + (entry?.quantity ?? 0),
        0,
      ),
    ).toBe(9);
    expect(result.run.encounterHistory.at(-1)).toMatchObject({
      healthLost: 50,
      inventoryUnitsLost: 1,
    });
  });

  it('failed run can consume Narcan instead of ending at zero health', () => {
    const result = findFailedRunAttempt({
      health: 25,
      equipment: {
        ...createNewRun({ seed: 'narcan-equipment' }).equipment,
        ownedSurvivalItems: { narcan: 1 },
      },
    });

    expect(result.outcome).toBe('caught-revived');
    expect(result.run.health).toBe(25);
    expect(result.run.equipment.ownedSurvivalItems.narcan).toBe(0);
    expect(result.run.isRunEnded).toBe(false);
  });

  it('failed run ends the run at zero health without Narcan', () => {
    const result = findFailedRunAttempt({ health: 25 });

    expect(result.outcome).toBe('caught-run-ended');
    expect(result.run.health).toBe(0);
    expect(result.run.isRunEnded).toBe(true);
    expect(result.run.endReason).toBe('health-zero');
  });
});
