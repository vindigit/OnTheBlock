import type { DrugId, Inventory, PlayerRun, TradeResult } from '../../models/types';
import {
  getCapacityUsed,
  getCapacityMax,
  getCurrentPrice,
  getHeldQuantity,
} from '../../selectors/runSelectors';

function isWholePositiveQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0;
}

function withoutEmptyInventoryEntries(run: PlayerRun): PlayerRun {
  return {
    ...run,
    inventory: Object.fromEntries(
      Object.entries(run.inventory).filter(([, entry]) => (entry?.quantity ?? 0) > 0),
    ) as Inventory,
  };
}

function getWeightedAveragePurchasePrice(
  currentQuantity: number,
  currentAveragePrice: number,
  addedQuantity: number,
  addedPrice: number,
): number {
  return Math.round(
    (currentQuantity * currentAveragePrice + addedQuantity * addedPrice) /
      (currentQuantity + addedQuantity),
  );
}

export function buyDrug(
  run: PlayerRun,
  drugId: DrugId,
  quantity: number,
): TradeResult {
  if (run.isRunEnded) {
    return { ok: false, reason: 'run-ended' };
  }

  if (!isWholePositiveQuantity(quantity)) {
    return { ok: false, reason: 'invalid-quantity' };
  }

  const unitPrice = getCurrentPrice(run, drugId);

  if (unitPrice === null) {
    return { ok: false, reason: 'inactive-local-market' };
  }

  const total = unitPrice * quantity;
  const currentEntry = run.inventory[drugId];
  const currentQuantity = currentEntry?.quantity ?? 0;
  const averagePurchasePrice = getWeightedAveragePurchasePrice(
    currentQuantity,
    currentEntry?.averagePurchasePrice ?? 0,
    quantity,
    unitPrice,
  );

  if (total > run.cash) {
    return { ok: false, reason: 'insufficient-cash' };
  }

  if (getCapacityUsed(run) + quantity > getCapacityMax(run)) {
    return { ok: false, reason: 'insufficient-capacity' };
  }

  const updatedRun: PlayerRun = {
    ...run,
    cash: run.cash - total,
    inventory: {
      ...run.inventory,
      [drugId]: {
        quantity: currentQuantity + quantity,
        averagePurchasePrice,
      },
    },
    actionLog: [
      ...run.actionLog,
      {
        type: 'buy',
        day: run.currentDay,
        locationId: run.currentLocationId,
        drugId,
        quantity,
        unitPrice,
        total,
      },
    ],
  };

  return {
    ok: true,
    run: updatedRun,
    total,
    unitPrice,
    quantity,
  };
}

export function sellDrug(
  run: PlayerRun,
  drugId: DrugId,
  quantity: number,
): TradeResult {
  if (run.isRunEnded) {
    return { ok: false, reason: 'run-ended' };
  }

  if (!isWholePositiveQuantity(quantity)) {
    return { ok: false, reason: 'invalid-quantity' };
  }

  const unitPrice = getCurrentPrice(run, drugId);

  if (unitPrice === null) {
    return { ok: false, reason: 'inactive-local-market' };
  }

  if (getHeldQuantity(run, drugId) < quantity) {
    return { ok: false, reason: 'insufficient-inventory' };
  }

  const total = unitPrice * quantity;
  const currentEntry = run.inventory[drugId];
  const updatedRun = withoutEmptyInventoryEntries({
    ...run,
    cash: run.cash + total,
    inventory: {
      ...run.inventory,
      [drugId]: {
        quantity: getHeldQuantity(run, drugId) - quantity,
        averagePurchasePrice: currentEntry?.averagePurchasePrice ?? 0,
      },
    },
    actionLog: [
      ...run.actionLog,
      {
        type: 'sell',
        day: run.currentDay,
        locationId: run.currentLocationId,
        drugId,
        quantity,
        unitPrice,
        total,
      },
    ],
  });

  return {
    ok: true,
    run: updatedRun,
    total,
    unitPrice,
    quantity,
  };
}
