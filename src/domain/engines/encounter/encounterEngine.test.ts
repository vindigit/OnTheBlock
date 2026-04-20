import type { PendingEncounter, PlayerRun } from '../../models/types';
import { createNewRun } from '../run/runEngine';
import {
  createMuggingEncounter,
  createPoliceEncounter,
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

function muggingEncounter(): PendingEncounter {
  return {
    encounterId: 'mugging-test',
    type: 'mugging',
    title: 'Cornered!',
    body: 'A couple of wolves step out from the stairwell. They clock the roll in your pocket before you clock the exit.',
    createdDay: 2,
    fromLocationId: 'velvet-heights',
    toLocationId: 'vista-creek-towers',
    cashAtTrigger: 10_000,
  };
}

function policeEncounter(
  overrides: Partial<PendingEncounter> = {},
): PendingEncounter {
  return {
    encounterId: 'police-test',
    type: 'police-chase',
    title: 'Red and Blue!',
    body:
      'Officer Hardass rolls up hot. The badge is out, the cuffs are ready, and your pockets are the whole case.',
    createdDay: 2,
    fromLocationId: 'velvet-heights',
    toLocationId: 'vista-creek-towers',
    cashAtTrigger: 10_000,
    deputyCount: 2,
    officersRemaining: 3,
    officersDefeated: 0,
    round: 1,
    ...overrides,
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

function runWithMugging(overrides: Partial<PlayerRun> = {}) {
  return {
    ...createNewRun({ seed: 'mugging' }),
    currentLocationId: 'vista-creek-towers' as const,
    cash: 10_000,
    debt: 5_000,
    pendingEncounter: muggingEncounter(),
    ...overrides,
  };
}

function runWithPolice(overrides: Partial<PlayerRun> = {}) {
  return {
    ...createNewRun({ seed: 'police' }),
    currentLocationId: 'vista-creek-towers' as const,
    cash: 10_000,
    debt: 5_000,
    inventory: {
      weed: { quantity: 4, averagePurchasePrice: 100 },
      molly: { quantity: 2, averagePurchasePrice: 20 },
    },
    pendingEncounter: policeEncounter(),
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

function findMuggingRunOutcome(
  desiredOutcome: 'escaped' | 'mugged' | 'caught-revived' | 'caught-run-ended',
  overrides: Partial<PlayerRun> = {},
) {
  for (let index = 0; index < 300; index += 1) {
    const run = runWithMugging({
      ...overrides,
      seed: `mugging-run-${index}`,
    });
    const result = resolvePendingEncounter(run, 'run');

    if (result.ok && result.outcome === desiredOutcome) {
      return result;
    }
  }

  throw new Error(`Expected to find mugging run outcome ${desiredOutcome}.`);
}

function findMuggingFightOutcome(
  desiredOutcome: 'fought-off' | 'mugged',
  overrides: Partial<PlayerRun> = {},
) {
  for (let index = 0; index < 300; index += 1) {
    const run = runWithMugging({
      ...overrides,
      seed: `mugging-fight-${index}`,
    });
    const result = resolvePendingEncounter(run, 'fight');

    if (result.ok && result.outcome === desiredOutcome) {
      return result;
    }
  }

  throw new Error(`Expected to find mugging fight outcome ${desiredOutcome}.`);
}

function armedMuggingRun(overrides: Partial<PlayerRun> = {}) {
  const run = runWithMugging(overrides);
  const ownedGlock = run.equipment.ownedWeapons.glock_19 ?? {
    weaponId: 'glock_19' as const,
    installedAttachmentIds: [],
  };

  return {
    ...run,
    equipment: {
      ...run.equipment,
      ownedWeapons: {
        ...run.equipment.ownedWeapons,
        glock_19: ownedGlock,
      },
      equippedWeaponLoadout: {
        weaponId: 'glock_19' as const,
      },
    },
  };
}

function armedPoliceRun(
  weaponId: 'beretta' | 'glock_19' | 'draco' = 'glock_19',
  installedAttachmentIds: Array<'switch' | 'laser_beam'> = [],
  overrides: Partial<PlayerRun> = {},
) {
  const run = runWithPolice(overrides);

  return {
    ...run,
    equipment: {
      ...run.equipment,
      ownedWeapons: {
        ...run.equipment.ownedWeapons,
        [weaponId]: {
          weaponId,
          installedAttachmentIds,
        },
      },
      equippedWeaponLoadout: {
        weaponId,
      },
    },
  };
}

function findPoliceRunOutcome(
  desiredOutcome: 'escaped' | 'contraband-seized',
  overrides: Partial<PlayerRun> = {},
) {
  for (let index = 0; index < 500; index += 1) {
    const run = runWithPolice({
      ...overrides,
      seed: `police-run-${index}`,
    });
    const result = resolvePendingEncounter(run, 'run');

    if (result.ok && result.outcome === desiredOutcome) {
      return result;
    }
  }

  throw new Error(`Expected to find police run outcome ${desiredOutcome}.`);
}

function findPoliceFightOutcome(
  desiredOutcome:
    | 'fought-off'
    | 'officer-killed'
    | 'fight-continued'
    | 'wounded'
    | 'caught-revived'
    | 'caught-run-ended',
  runFactory: (seed: string) => PlayerRun,
) {
  for (let index = 0; index < 1_000; index += 1) {
    const result = resolvePendingEncounter(
      runFactory(`police-fight-${desiredOutcome}-${index}`),
      'fight',
    );

    if (result.ok && result.outcome === desiredOutcome) {
      return result;
    }
  }

  throw new Error(`Expected to find police fight outcome ${desiredOutcome}.`);
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

describe('Mugging encounter engine', () => {
  it('only creates mugging encounters above the cash threshold', () => {
    const lowCashRun = { ...createNewRun({ seed: 'low-cash' }), cash: 500 };

    expect(createMuggingEncounter(lowCashRun, 'velvet-heights', 'the-bodega')).toBeNull();
  });

  it('uses a deterministic 10 percent cash-on-hand trigger', () => {
    for (let index = 0; index < 300; index += 1) {
      const run = {
        ...createNewRun({ seed: `mugging-trigger-${index}` }),
        currentDay: 3,
        cash: 10_000,
      };
      const encounter = createMuggingEncounter(
        run,
        'velvet-heights',
        'vista-creek-towers',
      );

      if (encounter) {
        expect(encounter).toMatchObject({
          type: 'mugging',
          title: 'Cornered!',
          cashAtTrigger: 10_000,
        });
        expect(
          createMuggingEncounter(run, 'velvet-heights', 'vista-creek-towers'),
        ).toEqual(encounter);
        return;
      }
    }

    throw new Error('Expected a deterministic seed to trigger mugging.');
  });

  it('surrender removes 20 to 40 percent of cash and no health', () => {
    const run = runWithMugging({ cash: 10_000, health: 80 });
    const result = resolvePendingEncounter(run, 'surrender');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const cashLost = run.cash - result.run.cash;

    expect(cashLost).toBeGreaterThanOrEqual(2_000);
    expect(cashLost).toBeLessThanOrEqual(4_000);
    expect(result.run.health).toBe(80);
    expect(result.run.encounterHistory.at(-1)).toMatchObject({
      outcome: 'surrendered',
      cashLost,
    });
  });

  it('run success loses nothing', () => {
    const result = findMuggingRunOutcome('escaped', { cash: 10_000, health: 80 });

    expect(result.run.cash).toBe(10_000);
    expect(result.run.health).toBe(80);
  });

  it('run failure loses 20 health and all cash', () => {
    const result = findMuggingRunOutcome('mugged', { cash: 10_000, health: 80 });

    expect(result.run.cash).toBe(0);
    expect(result.run.health).toBe(60);
    expect(result.run.encounterHistory.at(-1)).toMatchObject({
      outcome: 'mugged',
      cashLost: 10_000,
      healthLost: 20,
    });
  });

  it('rejects fight without an equipped weapon', () => {
    expect(resolvePendingEncounter(runWithMugging(), 'fight')).toEqual({
      ok: false,
      reason: 'no-equipped-weapon',
    });
  });

  it('fight success uses derived accuracy plus damage', () => {
    const result = findMuggingFightOutcome('fought-off', armedMuggingRun());

    expect(result.run.cash).toBe(10_000);
    expect(result.run.encounterHistory.at(-1)).toMatchObject({
      outcome: 'fought-off',
      fightSuccessChance: 0.67,
      weaponId: 'glock_19',
    });
  });

  it('fight success chance caps at 95 percent', () => {
    const run = armedMuggingRun({
      equipment: {
        ...createNewRun({ seed: 'cap-equipment' }).equipment,
        ownedWeapons: {
          glock_19: {
            weaponId: 'glock_19',
            installedAttachmentIds: Array(20)
              .fill('laser_beam')
              .concat(Array(20).fill('switch')),
          },
        },
        equippedWeaponLoadout: {
          weaponId: 'glock_19',
        },
      },
    });
    const result = resolvePendingEncounter(run, 'fight');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.run.encounterHistory.at(-1)?.fightSuccessChance).toBe(0.95);
  });

  it('fight failure loses 20 health and all cash', () => {
    const result = findMuggingFightOutcome('mugged', armedMuggingRun({ health: 80 }));

    expect(result.run.cash).toBe(0);
    expect(result.run.health).toBe(60);
    expect(result.run.encounterHistory.at(-1)).toMatchObject({
      cashLost: 10_000,
      healthLost: 20,
      weaponId: 'glock_19',
    });
  });

  it('failed mugging run can consume Narcan instead of ending at zero health', () => {
    const result = findMuggingRunOutcome('caught-revived', {
      health: 10,
      equipment: {
        ...createNewRun({ seed: 'mugging-narcan' }).equipment,
        ownedSurvivalItems: { narcan: 1 },
      },
    });

    expect(result.run.health).toBe(25);
    expect(result.run.cash).toBe(0);
    expect(result.run.equipment.ownedSurvivalItems.narcan).toBe(0);
    expect(result.run.isRunEnded).toBe(false);
  });

  it('failed mugging run ends the run at zero health without Narcan', () => {
    const result = findMuggingRunOutcome('caught-run-ended', { health: 10 });

    expect(result.run.health).toBe(0);
    expect(result.run.cash).toBe(0);
    expect(result.run.isRunEnded).toBe(true);
    expect(result.run.endReason).toBe('health-zero');
  });
});

describe('Police encounter engine', () => {
  it('does not create police encounters without carried drugs', () => {
    const run = {
      ...createNewRun({ seed: 'police-empty' }),
      inventory: {},
    };

    expect(
      createPoliceEncounter(run, 'velvet-heights', 'vista-creek-towers'),
    ).toBeNull();
  });

  it('uses a deterministic 1 in 7 carried-dope trigger with 0 to 3 deputies', () => {
    for (let index = 0; index < 500; index += 1) {
      const run = {
        ...createNewRun({ seed: `police-trigger-${index}` }),
        currentDay: 3,
        inventory: {
          weed: { quantity: 1, averagePurchasePrice: 100 },
        },
      };
      const encounter = createPoliceEncounter(
        run,
        'velvet-heights',
        'vista-creek-towers',
      );

      if (encounter) {
        expect(encounter).toMatchObject({
          type: 'police-chase',
          title: 'Red and Blue!',
          officersDefeated: 0,
          round: 1,
        });
        expect(encounter.deputyCount).toBeGreaterThanOrEqual(0);
        expect(encounter.deputyCount).toBeLessThanOrEqual(3);
        expect(encounter.officersRemaining).toBe(
          1 + (encounter.deputyCount ?? 0),
        );
        expect(
          createPoliceEncounter(run, 'velvet-heights', 'vista-creek-towers'),
        ).toEqual(encounter);
        return;
      }
    }

    throw new Error('Expected a deterministic seed to trigger police.');
  });

  it('run success clears the encounter without losses', () => {
    const result = findPoliceRunOutcome('escaped', { cash: 10_000 });

    expect(result.run.cash).toBe(10_000);
    expect(result.run.inventory).toEqual({
      weed: { quantity: 4, averagePurchasePrice: 100 },
      molly: { quantity: 2, averagePurchasePrice: 20 },
    });
    expect(result.run.pendingEncounter).toBeNull();
    expect(result.run.encounterHistory.at(-1)).toMatchObject({
      type: 'police-chase',
      outcome: 'escaped',
    });
  });

  it('bad run loses all carried dope and half cash without touching stash', () => {
    const stashInventory = {
      weed: { quantity: 3, averagePurchasePrice: 90 },
    };
    const result = findPoliceRunOutcome('contraband-seized', {
      cash: 10_001,
      stashInventory,
    });

    expect(result.run.cash).toBe(5_001);
    expect(result.run.inventory).toEqual({});
    expect(result.run.stashInventory).toEqual(stashInventory);
    expect(result.run.pendingEncounter).toBeNull();
    expect(result.run.encounterHistory.at(-1)).toMatchObject({
      cashLost: 5_000,
      inventoryUnitsLost: 6,
      outcome: 'contraband-seized',
    });
  });

  it('rejects fight without an equipped weapon', () => {
    expect(resolvePendingEncounter(runWithPolice(), 'fight')).toEqual({
      ok: false,
      reason: 'no-equipped-weapon',
    });
  });

  it('fight chance uses weapon stats and switch attachments', () => {
    const glockResult = findPoliceFightOutcome('fought-off', (seed) =>
      armedPoliceRun('glock_19', [], {
        seed,
        pendingEncounter: policeEncounter({ officersRemaining: 1 }),
      }),
    );
    const dracoResult = findPoliceFightOutcome('fought-off', (seed) =>
      armedPoliceRun('draco', [], {
        seed,
        pendingEncounter: policeEncounter({ officersRemaining: 1 }),
      }),
    );
    const switchedDracoResult = findPoliceFightOutcome('fought-off', (seed) =>
      armedPoliceRun('draco', ['switch'], {
        seed,
        pendingEncounter: policeEncounter({ officersRemaining: 1 }),
      }),
    );

    const glockChance =
      glockResult.run.encounterHistory.at(-1)?.fightSuccessChance ?? 0;
    const dracoChance =
      dracoResult.run.encounterHistory.at(-1)?.fightSuccessChance ?? 0;
    const switchedDracoChance =
      switchedDracoResult.run.encounterHistory.at(-1)?.fightSuccessChance ?? 0;

    expect(glockChance).toBeCloseTo(0.791_666, 5);
    expect(dracoChance).toBeCloseTo(0.833_333, 5);
    expect(switchedDracoChance).toBeCloseTo(0.916_666, 5);
    expect(switchedDracoChance).toBeGreaterThan(dracoChance);
    expect(dracoChance).toBeGreaterThan(glockChance);
  });

  it('intermediate fight rounds keep the police encounter pending', () => {
    const result = findPoliceFightOutcome('officer-killed', (seed) =>
      armedPoliceRun('glock_19', [], {
        seed,
        pendingEncounter: policeEncounter({ officersRemaining: 3 }),
      }),
    );

    expect(result.run.pendingEncounter).toMatchObject({
      type: 'police-chase',
      officersRemaining: 2,
      officersDefeated: 1,
      round: 2,
    });
    expect(result.run.pendingEncounter?.lastRoundSummary).toContain(
      'dropped one officer',
    );
  });

  it('killing all police pays the reward and records the fight', () => {
    const result = findPoliceFightOutcome('fought-off', (seed) =>
      armedPoliceRun('draco', ['switch'], {
        seed,
        cash: 12_000,
        pendingEncounter: policeEncounter({
          deputyCount: 0,
          officersRemaining: 1,
        }),
      }),
    );

    expect(result.run.cash).toBe(112_000);
    expect(result.run.pendingEncounter).toBeNull();
    expect(result.run.encounterHistory.at(-1)).toMatchObject({
      cashRewarded: 100_000,
      officersDefeated: 1,
      outcome: 'fought-off',
      type: 'police-chase',
      weaponId: 'draco',
    });
  });

  it('police wounds remove 25 health and keep the encounter pending', () => {
    const result = findPoliceFightOutcome('wounded', (seed) =>
      armedPoliceRun('glock_19', [], {
        seed,
        health: 80,
        pendingEncounter: policeEncounter({ officersRemaining: 3 }),
      }),
    );

    expect(result.run.health).toBe(55);
    expect(result.run.pendingEncounter?.type).toBe('police-chase');
    expect(result.run.pendingEncounter?.lastRoundSummary).toContain(
      'clipped you for 25 health',
    );
  });

  it('police lethal shots can end the run without Narcan', () => {
    const result = findPoliceFightOutcome('caught-run-ended', (seed) =>
      armedPoliceRun('glock_19', [], {
        seed,
        health: 80,
        pendingEncounter: policeEncounter({ officersRemaining: 3 }),
      }),
    );

    expect(result.run.health).toBe(0);
    expect(result.run.isRunEnded).toBe(true);
    expect(result.run.endReason).toBe('health-zero');
    expect(result.run.pendingEncounter).toBeNull();
  });

  it('police lethal shots consume Narcan before ending the run', () => {
    const result = findPoliceFightOutcome('caught-revived', (seed) =>
      armedPoliceRun('glock_19', [], {
        seed,
        health: 80,
        equipment: {
          ...createNewRun({ seed: 'police-narcan-equipment' }).equipment,
          ownedSurvivalItems: { narcan: 1 },
        },
        pendingEncounter: policeEncounter({ officersRemaining: 3 }),
      }),
    );

    expect(result.run.health).toBe(25);
    expect(result.run.isRunEnded).toBe(false);
    expect(result.run.equipment.ownedSurvivalItems.narcan).toBe(0);
    expect(result.run.pendingEncounter).toBeNull();
  });
});
