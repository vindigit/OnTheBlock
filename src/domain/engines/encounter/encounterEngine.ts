import { DRUGS } from '../../../config/drugs';
import { ENCOUNTER_CONFIG, RUN_CONFIG } from '../../../config/economy';
import type {
  DrugId,
  EncounterChoice,
  EncounterOutcome,
  EncounterResolutionResult,
  Inventory,
  LocationId,
  PendingEncounter,
  PlayerRun,
  WeaponId,
} from '../../models/types';
import { createRng, deriveSeed, shuffleWithRng } from '../../../utils/rng';
import { getCapacityUsed, getEquippedWeaponStats } from '../../selectors/runSelectors';
import { collectDebtForInterception } from '../debt/debtPaymentEngine';

export function getBigSalInterceptionChance(debt: number): number {
  if (debt > ENCOUNTER_CONFIG.bigSal.highDebtThreshold) {
    return ENCOUNTER_CONFIG.bigSal.highDebtChance;
  }

  if (debt > ENCOUNTER_CONFIG.bigSal.lowDebtThreshold) {
    return ENCOUNTER_CONFIG.bigSal.lowDebtChance;
  }

  return 0;
}

export function createBigSalInterception(
  run: PlayerRun,
  fromLocationId: LocationId,
  toLocationId: LocationId,
): PendingEncounter | null {
  const chance = getBigSalInterceptionChance(run.debt);

  if (chance <= 0) {
    return null;
  }

  const seed = deriveSeed(run.seed, [
    run.currentDay,
    fromLocationId,
    toLocationId,
    'big-sal-interception',
  ]);
  const rng = createRng(seed);

  if (rng.next() >= chance) {
    return null;
  }

  return {
    encounterId: `big-sal-${run.currentDay}-${fromLocationId}-${toLocationId}`,
    type: 'big-sal-interception',
    title: 'Blocked!',
    body:
      "Big Sal's crew cuts you off in the alley. They don't want to talk about prices; they want what you owe.",
    createdDay: run.currentDay,
    fromLocationId,
    toLocationId,
    debtAtTrigger: run.debt,
  };
}

export function createMuggingEncounter(
  run: PlayerRun,
  fromLocationId: LocationId,
  toLocationId: LocationId,
): PendingEncounter | null {
  if (run.cash <= ENCOUNTER_CONFIG.mugging.cashThreshold) {
    return null;
  }

  const seed = deriveSeed(run.seed, [
    run.currentDay,
    fromLocationId,
    toLocationId,
    'mugging',
  ]);
  const rng = createRng(seed);

  if (rng.next() >= ENCOUNTER_CONFIG.mugging.triggerChance) {
    return null;
  }

  return {
    encounterId: `mugging-${run.currentDay}-${fromLocationId}-${toLocationId}`,
    type: 'mugging',
    title: 'Cornered!',
    body:
      'A couple of wolves step out from the stairwell. They clock the roll in your pocket before you clock the exit.',
    createdDay: run.currentDay,
    fromLocationId,
    toLocationId,
    cashAtTrigger: run.cash,
  };
}

export function createPoliceEncounter(
  run: PlayerRun,
  fromLocationId: LocationId,
  toLocationId: LocationId,
): PendingEncounter | null {
  if (getCapacityUsed(run) <= 0) {
    return null;
  }

  const seed = deriveSeed(run.seed, [
    run.currentDay,
    fromLocationId,
    toLocationId,
    'police-chase',
  ]);
  const rng = createRng(seed);

  if (rng.next() >= ENCOUNTER_CONFIG.police.triggerChance) {
    return null;
  }

  const deputyCount = rng.int(0, ENCOUNTER_CONFIG.police.maxDeputies);
  const officersRemaining = 1 + deputyCount;

  return {
    encounterId: `police-${run.currentDay}-${fromLocationId}-${toLocationId}`,
    type: 'police-chase',
    title: 'Red and Blue!',
    body:
      'Officer Hardass rolls up hot. The badge is out, the cuffs are ready, and your pockets are the whole case.',
    createdDay: run.currentDay,
    fromLocationId,
    toLocationId,
    cashAtTrigger: run.cash,
    deputyCount,
    officersRemaining,
    officersDefeated: 0,
    round: 1,
  };
}

function removeInventoryUnits(
  inventory: Inventory,
  seed: string,
): { inventory: Inventory; unitsLost: number } {
  const units: DrugId[] = [];

  for (const drug of DRUGS) {
    const quantity = inventory[drug.drugId]?.quantity ?? 0;

    for (let count = 0; count < quantity; count += 1) {
      units.push(drug.drugId);
    }
  }

  if (units.length === 0) {
    return { inventory, unitsLost: 0 };
  }

  const unitsLost = Math.max(
    1,
    Math.ceil(units.length * ENCOUNTER_CONFIG.bigSal.failedRunInventoryLossRate),
  );
  const shuffled = shuffleWithRng(units, createRng(seed));
  const lossCounts: Partial<Record<DrugId, number>> = {};

  for (const drugId of shuffled.slice(0, unitsLost)) {
    lossCounts[drugId] = (lossCounts[drugId] ?? 0) + 1;
  }

  const nextInventory: Inventory = {};

  for (const drug of DRUGS) {
    const entry = inventory[drug.drugId];

    if (!entry) {
      continue;
    }

    const quantity = entry.quantity - (lossCounts[drug.drugId] ?? 0);

    if (quantity > 0) {
      nextInventory[drug.drugId] = {
        ...entry,
        quantity,
      };
    }
  }

  return { inventory: nextInventory, unitsLost };
}

function removeAllInventoryUnits(
  inventory: Inventory,
): { inventory: Inventory; unitsLost: number } {
  return {
    inventory: {},
    unitsLost: Object.values(inventory).reduce(
      (sum, entry) => sum + (entry?.quantity ?? 0),
      0,
    ),
  };
}

function endRunForHealth(run: PlayerRun): PlayerRun {
  if (run.isRunEnded) {
    return run;
  }

  return {
    ...run,
    isRunEnded: true,
    endReason: 'health-zero',
    actionLog: [
      ...run.actionLog,
      {
        type: 'run-ended',
        day: run.currentDay,
        reason: 'health-zero',
      },
    ],
  };
}

function applyEncounterHealthDamage(
  run: PlayerRun,
  healthLoss: number,
): {
  run: PlayerRun;
  healthLost: number;
  wasRevived: boolean;
  wasEnded: boolean;
} {
  const healthAfterDamage = Math.max(0, run.health - healthLoss);
  const hasNarcan =
    healthAfterDamage === 0 && (run.equipment.ownedSurvivalItems.narcan ?? 0) > 0;
  const healthAfterRevive = hasNarcan
    ? RUN_CONFIG.narcanReviveHealth
    : healthAfterDamage;
  const damagedRun: PlayerRun = {
    ...run,
    health: healthAfterRevive,
    equipment: {
      ...run.equipment,
      ownedSurvivalItems: {
        ...run.equipment.ownedSurvivalItems,
        narcan: Math.max(
          0,
          (run.equipment.ownedSurvivalItems.narcan ?? 0) - (hasNarcan ? 1 : 0),
        ),
      },
    },
  };

  return {
    run: healthAfterRevive === 0 ? endRunForHealth(damagedRun) : damagedRun,
    healthLost: run.health - healthAfterDamage,
    wasRevived: hasNarcan,
    wasEnded: healthAfterRevive === 0,
  };
}

function appendEncounterResolution(
  run: PlayerRun,
  choice: EncounterChoice,
  outcome: EncounterOutcome,
  details: {
    cashLost?: number;
    debtReduced?: number;
    healthLost?: number;
    inventoryUnitsLost?: number;
    fightSuccessChance?: number;
    weaponId?: WeaponId;
    cashRewarded?: number;
    deputiesCount?: number;
    officersDefeated?: number;
  },
): PlayerRun {
  const pendingEncounter = run.pendingEncounter;

  if (!pendingEncounter) {
    return run;
  }

  return {
    ...run,
    pendingEncounter: null,
    encounterHistory: [
      ...run.encounterHistory,
      {
        encounterId: pendingEncounter.encounterId,
        type: pendingEncounter.type,
        day: run.currentDay,
        locationId: run.currentLocationId,
        choice,
        outcome,
        ...details,
      },
    ],
    actionLog: [
      ...run.actionLog,
      {
        type: 'encounter-resolved',
        day: run.currentDay,
        locationId: run.currentLocationId,
        encounterId: pendingEncounter.encounterId,
        encounterType: pendingEncounter.type,
        choice,
        outcome,
      },
    ],
  };
}

function resolveBigSalEncounter(
  run: PlayerRun,
  pendingEncounter: PendingEncounter,
  choice: EncounterChoice,
): EncounterResolutionResult {
  if (choice === 'hand-it-over') {
    const collected = collectDebtForInterception(run);
    const resolvedRun = appendEncounterResolution(collected.run, choice, 'paid', {
      cashLost: collected.amount,
      debtReduced: collected.amount,
    });

    return {
      ok: true,
      run: resolvedRun,
      outcome: 'paid',
    };
  }

  if (choice !== 'run') {
    return { ok: false, reason: 'invalid-choice' };
  }

  const outcomeRng = createRng(
    deriveSeed(run.seed, [pendingEncounter.encounterId, 'run-option']),
  );
  const escaped = outcomeRng.next() < 0.5;

  if (escaped) {
    const resolvedRun = appendEncounterResolution(run, choice, 'escaped', {});

    return {
      ok: true,
      run: resolvedRun,
      outcome: 'escaped',
    };
  }

  const inventoryLoss = removeInventoryUnits(
    run.inventory,
    deriveSeed(run.seed, [pendingEncounter.encounterId, 'inventory-loss']),
  );
  const damaged = applyEncounterHealthDamage(
    {
      ...run,
      inventory: inventoryLoss.inventory,
    },
    ENCOUNTER_CONFIG.bigSal.failedRunHealthLoss,
  );
  const outcome: EncounterOutcome = damaged.wasRevived
    ? 'caught-revived'
    : damaged.wasEnded
      ? 'caught-run-ended'
      : 'caught';
  const resolvedRun = appendEncounterResolution(damaged.run, choice, outcome, {
    healthLost: damaged.healthLost,
    inventoryUnitsLost: inventoryLoss.unitsLost,
  });

  return {
    ok: true,
    run: resolvedRun,
    outcome,
  };
}

function resolveMuggingFailure(
  run: PlayerRun,
  choice: 'run' | 'fight',
  details: {
    fightSuccessChance?: number;
    weaponId?: WeaponId;
  } = {},
): EncounterResolutionResult {
  const damaged = applyEncounterHealthDamage(
    {
      ...run,
      cash: 0,
    },
    ENCOUNTER_CONFIG.mugging.failedRunHealthLoss,
  );
  const outcome: EncounterOutcome = damaged.wasRevived
    ? 'caught-revived'
    : damaged.wasEnded
      ? 'caught-run-ended'
      : 'mugged';
  const resolvedRun = appendEncounterResolution(damaged.run, choice, outcome, {
    cashLost: run.cash,
    healthLost: damaged.healthLost,
    ...details,
  });

  return {
    ok: true,
    run: resolvedRun,
    outcome,
  };
}

function resolveMuggingEncounter(
  run: PlayerRun,
  pendingEncounter: PendingEncounter,
  choice: EncounterChoice,
): EncounterResolutionResult {
  if (choice === 'surrender') {
    const rng = createRng(
      deriveSeed(run.seed, [pendingEncounter.encounterId, 'surrender']),
    );
    const lossRate =
      rng.int(
        Math.round(ENCOUNTER_CONFIG.mugging.surrenderLossMinRate * 100),
        Math.round(ENCOUNTER_CONFIG.mugging.surrenderLossMaxRate * 100),
      ) / 100;
    const cashLost = Math.floor(run.cash * lossRate);
    const resolvedRun = appendEncounterResolution(
      {
        ...run,
        cash: run.cash - cashLost,
      },
      choice,
      'surrendered',
      { cashLost },
    );

    return {
      ok: true,
      run: resolvedRun,
      outcome: 'surrendered',
    };
  }

  if (choice === 'run') {
    const rng = createRng(
      deriveSeed(run.seed, [pendingEncounter.encounterId, 'run-option']),
    );
    const escaped = rng.next() < ENCOUNTER_CONFIG.mugging.runEscapeChance;

    if (escaped) {
      const resolvedRun = appendEncounterResolution(run, choice, 'escaped', {});

      return {
        ok: true,
        run: resolvedRun,
        outcome: 'escaped',
      };
    }

    return resolveMuggingFailure(run, choice);
  }

  if (choice === 'fight') {
    const equippedWeapon = getEquippedWeaponStats(run);

    if (!equippedWeapon) {
      return { ok: false, reason: 'no-equipped-weapon' };
    }

    const fightSuccessChance = Math.min(
      ENCOUNTER_CONFIG.mugging.fightMaxChance,
      (equippedWeapon.accuracy + equippedWeapon.damage) / 100,
    );
    const rng = createRng(
      deriveSeed(run.seed, [pendingEncounter.encounterId, 'fight-option']),
    );
    const foughtOff = rng.next() < fightSuccessChance;

    if (foughtOff) {
      const resolvedRun = appendEncounterResolution(run, choice, 'fought-off', {
        fightSuccessChance,
        weaponId: equippedWeapon.weaponId,
      });

      return {
        ok: true,
        run: resolvedRun,
        outcome: 'fought-off',
      };
    }

    return resolveMuggingFailure(run, choice, {
      fightSuccessChance,
      weaponId: equippedWeapon.weaponId,
    });
  }

  return { ok: false, reason: 'invalid-choice' };
}

function getPoliceCount(pendingEncounter: PendingEncounter): {
  deputyCount: number;
  officersRemaining: number;
  officersDefeated: number;
  round: number;
} {
  return {
    deputyCount: pendingEncounter.deputyCount ?? 0,
    officersRemaining: pendingEncounter.officersRemaining ?? 1,
    officersDefeated: pendingEncounter.officersDefeated ?? 0,
    round: pendingEncounter.round ?? 1,
  };
}

function getPoliceFightSuccessChance(
  weapon: NonNullable<ReturnType<typeof getEquippedWeaponStats>>,
): number {
  return Math.min(
    ENCOUNTER_CONFIG.police.fightMaxChance,
    (weapon.accuracy + weapon.damage * 5) / 120,
  );
}

function updatePoliceEncounter(
  run: PlayerRun,
  pendingEncounter: PendingEncounter,
  updates: {
    officersRemaining: number;
    officersDefeated: number;
    round: number;
    lastRoundSummary: string;
  },
): PlayerRun {
  return {
    ...run,
    pendingEncounter: {
      ...pendingEncounter,
      ...updates,
    },
  };
}

function resolvePoliceRun(
  run: PlayerRun,
  pendingEncounter: PendingEncounter,
): EncounterResolutionResult {
  const rng = createRng(
    deriveSeed(run.seed, [pendingEncounter.encounterId, 'run-option']),
  );
  const lostContraband = rng.next() < ENCOUNTER_CONFIG.police.runLossChance;

  if (!lostContraband) {
    const resolvedRun = appendEncounterResolution(run, 'run', 'escaped', {
      deputiesCount: pendingEncounter.deputyCount,
      officersDefeated: pendingEncounter.officersDefeated,
    });

    return {
      ok: true,
      run: resolvedRun,
      outcome: 'escaped',
    };
  }

  const inventoryLoss = removeAllInventoryUnits(run.inventory);
  const cashLost = Math.floor(run.cash * ENCOUNTER_CONFIG.police.runCashLossRate);
  const resolvedRun = appendEncounterResolution(
    {
      ...run,
      cash: run.cash - cashLost,
      inventory: inventoryLoss.inventory,
    },
    'run',
    'contraband-seized',
    {
      cashLost,
      inventoryUnitsLost: inventoryLoss.unitsLost,
      deputiesCount: pendingEncounter.deputyCount,
      officersDefeated: pendingEncounter.officersDefeated,
    },
  );

  return {
    ok: true,
    run: resolvedRun,
    outcome: 'contraband-seized',
  };
}

function resolvePoliceFight(
  run: PlayerRun,
  pendingEncounter: PendingEncounter,
): EncounterResolutionResult {
  const equippedWeapon = getEquippedWeaponStats(run);

  if (!equippedWeapon) {
    return { ok: false, reason: 'no-equipped-weapon' };
  }

  const policeCount = getPoliceCount(pendingEncounter);
  const fightSuccessChance = getPoliceFightSuccessChance(equippedWeapon);
  const fightRng = createRng(
    deriveSeed(run.seed, [
      pendingEncounter.encounterId,
      'fight-option',
      policeCount.round,
    ]),
  );
  const officerKilled = fightRng.next() < fightSuccessChance;
  const officersDefeated = policeCount.officersDefeated + (officerKilled ? 1 : 0);
  const officersRemaining = Math.max(
    0,
    policeCount.officersRemaining - (officerKilled ? 1 : 0),
  );

  if (officersRemaining === 0) {
    const finalPendingEncounter: PendingEncounter = {
      ...pendingEncounter,
      officersRemaining,
      officersDefeated,
      round: policeCount.round,
      lastRoundSummary: `${equippedWeapon.displayName} dropped the last badge standing.`,
    };
    const resolvedRun = appendEncounterResolution(
      {
        ...run,
        cash: run.cash + ENCOUNTER_CONFIG.police.reward,
        pendingEncounter: finalPendingEncounter,
      },
      'fight',
      'fought-off',
      {
        cashRewarded: ENCOUNTER_CONFIG.police.reward,
        deputiesCount: policeCount.deputyCount,
        fightSuccessChance,
        officersDefeated,
        weaponId: equippedWeapon.weaponId,
      },
    );

    return {
      ok: true,
      run: resolvedRun,
      outcome: 'fought-off',
    };
  }

  const retaliationRng = createRng(
    deriveSeed(run.seed, [
      pendingEncounter.encounterId,
      'retaliation',
      policeCount.round,
    ]),
  );
  const retaliationRoll = retaliationRng.next();
  const baseSummary = officerKilled
    ? `${equippedWeapon.displayName} dropped one officer. ${officersRemaining} still on you.`
    : `${equippedWeapon.displayName} barked, but nobody dropped. ${officersRemaining} still on you.`;

  if (retaliationRoll < ENCOUNTER_CONFIG.police.killChance) {
    const damaged = applyEncounterHealthDamage(run, run.health);
    const outcome: EncounterOutcome = damaged.wasRevived
      ? 'caught-revived'
      : 'caught-run-ended';
    const resolvedRun = appendEncounterResolution(
      {
        ...damaged.run,
        pendingEncounter: {
          ...pendingEncounter,
          officersRemaining,
          officersDefeated,
          round: policeCount.round,
          lastRoundSummary: `${baseSummary} Hardass lands a kill shot.`,
        },
      },
      'fight',
      outcome,
      {
        deputiesCount: policeCount.deputyCount,
        fightSuccessChance,
        healthLost: damaged.healthLost,
        officersDefeated,
        weaponId: equippedWeapon.weaponId,
      },
    );

    return {
      ok: true,
      run: resolvedRun,
      outcome,
    };
  }

  if (
    retaliationRoll <
    ENCOUNTER_CONFIG.police.killChance + ENCOUNTER_CONFIG.police.woundChance
  ) {
    const damaged = applyEncounterHealthDamage(
      run,
      ENCOUNTER_CONFIG.police.woundHealthLoss,
    );

    if (damaged.wasRevived || damaged.wasEnded) {
      const outcome: EncounterOutcome = damaged.wasRevived
        ? 'caught-revived'
        : 'caught-run-ended';
      const resolvedRun = appendEncounterResolution(
        {
          ...damaged.run,
          pendingEncounter: {
            ...pendingEncounter,
            officersRemaining,
            officersDefeated,
            round: policeCount.round,
            lastRoundSummary: `${baseSummary} Return fire nearly put you down.`,
          },
        },
        'fight',
        outcome,
        {
          deputiesCount: policeCount.deputyCount,
          fightSuccessChance,
          healthLost: damaged.healthLost,
          officersDefeated,
          weaponId: equippedWeapon.weaponId,
        },
      );

      return {
        ok: true,
        run: resolvedRun,
        outcome,
      };
    }

    return {
      ok: true,
      run: updatePoliceEncounter(damaged.run, pendingEncounter, {
        officersRemaining,
        officersDefeated,
        round: policeCount.round + 1,
        lastRoundSummary: `${baseSummary} Return fire clipped you for ${damaged.healthLost} health.`,
      }),
      outcome: 'wounded',
    };
  }

  return {
    ok: true,
    run: updatePoliceEncounter(run, pendingEncounter, {
      officersRemaining,
      officersDefeated,
      round: policeCount.round + 1,
      lastRoundSummary: `${baseSummary} You ducked the return fire.`,
    }),
    outcome: officerKilled ? 'officer-killed' : 'fight-continued',
  };
}

function resolvePoliceEncounter(
  run: PlayerRun,
  pendingEncounter: PendingEncounter,
  choice: EncounterChoice,
): EncounterResolutionResult {
  if (choice === 'run') {
    return resolvePoliceRun(run, pendingEncounter);
  }

  if (choice === 'fight') {
    return resolvePoliceFight(run, pendingEncounter);
  }

  return { ok: false, reason: 'invalid-choice' };
}

export function resolvePendingEncounter(
  run: PlayerRun,
  choice: EncounterChoice,
): EncounterResolutionResult {
  if (run.isRunEnded) {
    return { ok: false, reason: 'run-ended' };
  }

  const pendingEncounter = run.pendingEncounter;

  if (!pendingEncounter) {
    return { ok: false, reason: 'no-pending-encounter' };
  }

  if (pendingEncounter.type === 'big-sal-interception') {
    return resolveBigSalEncounter(run, pendingEncounter, choice);
  }

  if (pendingEncounter.type === 'mugging') {
    return resolveMuggingEncounter(run, pendingEncounter, choice);
  }

  if (pendingEncounter.type === 'police-chase') {
    return resolvePoliceEncounter(run, pendingEncounter, choice);
  }

  return { ok: false, reason: 'invalid-choice' };
}
