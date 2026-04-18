import { LOCATIONS } from '../../../config/locations';
import { DRUGS } from '../../../config/drugs';
import type { DrugId } from '../../models/types';
import {
  getAveragePurchasePrice,
  getCapacityUsed,
  getCurrentMarketQuotes,
  getFreeCapacity,
  getHeldQuantity,
} from '../../selectors/runSelectors';
import { createNewRun } from '../run/runEngine';
import { buyDrug, sellDrug } from './tradingEngine';

function getActiveDrug(run = createNewRun({ seed: 'trade' })) {
  run = { ...run, cash: 1_000_000 };
  const quote = getCurrentMarketQuotes(run)[0];
  return { run, quote };
}

function getInactiveDrugId(run: ReturnType<typeof createNewRun>): DrugId {
  const active = new Set(run.locationStates[run.currentLocationId].activeDrugIds);
  const allIds = DRUGS.map((drug) => drug.drugId);

  const inactive = allIds.find((drugId) => !active.has(drugId));

  if (!inactive) {
    throw new Error('Expected at least one inactive drug.');
  }

  return inactive;
}

describe('trading engine', () => {
  it('buys active drugs using the visible local price', () => {
    const { run, quote } = getActiveDrug();
    const result = buyDrug(run, quote.drugId, 1);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.run.cash).toBe(run.cash - quote.price);
    expect(getHeldQuantity(result.run, quote.drugId)).toBe(1);
    expect(getAveragePurchasePrice(result.run, quote.drugId)).toBe(quote.price);
    expect(getCapacityUsed(result.run)).toBe(1);
  });

  it('tracks weighted average purchase price across multiple buys', () => {
    const { run, quote } = getActiveDrug();
    const firstBuy = buyDrug(run, quote.drugId, 2);
    expect(firstBuy.ok).toBe(true);
    if (!firstBuy.ok) {
      return;
    }

    const repricedRun = {
      ...firstBuy.run,
      cash: 1_000_000,
      locationStates: {
        ...firstBuy.run.locationStates,
        [firstBuy.run.currentLocationId]: {
          ...firstBuy.run.locationStates[firstBuy.run.currentLocationId],
          localPriceMap: {
            ...firstBuy.run.locationStates[firstBuy.run.currentLocationId].localPriceMap,
            [quote.drugId]: quote.price + 100,
          },
        },
      },
    };
    const secondBuy = buyDrug(repricedRun, quote.drugId, 1);

    expect(secondBuy.ok).toBe(true);
    if (!secondBuy.ok) {
      return;
    }
    expect(getHeldQuantity(secondBuy.run, quote.drugId)).toBe(3);
    expect(getAveragePurchasePrice(secondBuy.run, quote.drugId)).toBe(
      Math.round((quote.price * 2 + (quote.price + 100)) / 3),
    );
  });

  it('sells held active drugs using the same visible local price', () => {
    const { run, quote } = getActiveDrug();
    const buyResult = buyDrug(run, quote.drugId, 1);

    expect(buyResult.ok).toBe(true);
    if (!buyResult.ok) {
      return;
    }

    const sellResult = sellDrug(buyResult.run, quote.drugId, 1);

    expect(sellResult.ok).toBe(true);
    if (!sellResult.ok) {
      return;
    }
    expect(sellResult.unitPrice).toBe(quote.price);
    expect(sellResult.run.cash).toBe(run.cash);
    expect(getHeldQuantity(sellResult.run, quote.drugId)).toBe(0);
    expect(getAveragePurchasePrice(sellResult.run, quote.drugId)).toBeNull();
  });

  it('keeps average purchase price after a partial sell', () => {
    const { run, quote } = getActiveDrug();
    const buyResult = buyDrug(run, quote.drugId, 3);

    expect(buyResult.ok).toBe(true);
    if (!buyResult.ok) {
      return;
    }

    const sellResult = sellDrug(buyResult.run, quote.drugId, 1);

    expect(sellResult.ok).toBe(true);
    if (!sellResult.ok) {
      return;
    }
    expect(getHeldQuantity(sellResult.run, quote.drugId)).toBe(2);
    expect(getAveragePurchasePrice(sellResult.run, quote.drugId)).toBe(quote.price);
  });

  it('rejects inactive local markets', () => {
    const run = createNewRun({ seed: 'inactive' });
    const inactiveDrugId = getInactiveDrugId(run);

    expect(buyDrug(run, inactiveDrugId, 1)).toEqual({
      ok: false,
      reason: 'inactive-local-market',
    });
    expect(
      sellDrug(
        {
          ...run,
          inventory: {
            [inactiveDrugId]: { quantity: 1, averagePurchasePrice: 10 },
          },
        },
        inactiveDrugId,
        1,
      ),
    ).toEqual({ ok: false, reason: 'inactive-local-market' });
  });

  it('enforces cash, capacity, and held quantity', () => {
    const { run, quote } = getActiveDrug();

    expect(buyDrug({ ...run, cash: 0 }, quote.drugId, 1)).toEqual({
      ok: false,
      reason: 'insufficient-cash',
    });

    expect(
      buyDrug({ ...run, capacityBase: getCapacityUsed(run), cash: 1_000_000 }, quote.drugId, 1),
    ).toEqual({ ok: false, reason: 'insufficient-capacity' });

    expect(sellDrug(run, quote.drugId, 1)).toEqual({
      ok: false,
      reason: 'insufficient-inventory',
    });
    expect(getFreeCapacity(run)).toBeGreaterThan(0);
    expect(LOCATIONS.length).toBe(4);
  });
});
