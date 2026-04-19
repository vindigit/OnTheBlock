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
} from '../../models/types';
import { createRng, deriveSeed, shuffleWithRng } from '../../../utils/rng';
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

function appendEncounterResolution(
  run: PlayerRun,
  choice: EncounterChoice,
  outcome: EncounterOutcome,
  details: {
    cashLost?: number;
    debtReduced?: number;
    healthLost?: number;
    inventoryUnitsLost?: number;
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

  if (pendingEncounter.type !== 'big-sal-interception') {
    return { ok: false, reason: 'invalid-choice' };
  }

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
  const healthAfterDamage = Math.max(
    0,
    run.health - ENCOUNTER_CONFIG.bigSal.failedRunHealthLoss,
  );
  const hasNarcan =
    healthAfterDamage === 0 && (run.equipment.ownedSurvivalItems.narcan ?? 0) > 0;
  const healthAfterRevive = hasNarcan
    ? RUN_CONFIG.narcanReviveHealth
    : healthAfterDamage;
  const baseRun: PlayerRun = {
    ...run,
    health: healthAfterRevive,
    inventory: inventoryLoss.inventory,
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
  const outcome: EncounterOutcome = hasNarcan
    ? 'caught-revived'
    : healthAfterRevive === 0
      ? 'caught-run-ended'
      : 'caught';
  const resolvedRun = appendEncounterResolution(baseRun, choice, outcome, {
    healthLost: run.health - healthAfterDamage,
    inventoryUnitsLost: inventoryLoss.unitsLost,
  });

  return {
    ok: true,
    run: outcome === 'caught-run-ended' ? endRunForHealth(resolvedRun) : resolvedRun,
    outcome,
  };
}
