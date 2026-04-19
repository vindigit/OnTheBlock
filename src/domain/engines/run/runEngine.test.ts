import { RUN_CONFIG } from '../../../config/economy';
import { LOCATIONS } from '../../../config/locations';
import { applyDailyDebtGrowth } from '../debt/debtEngine';
import { createNewRun, travelToLocation } from './runEngine';

describe('run engine', () => {
  it('creates the locked starting state with a reproducible starting location', () => {
    const first = createNewRun({ seed: 'locked-seed', runId: 'run-a' });
    const second = createNewRun({ seed: 'locked-seed', runId: 'run-b' });

    expect(first.currentDay).toBe(1);
    expect(first.cash).toBe(RUN_CONFIG.startingCash);
    expect(first.debt).toBe(RUN_CONFIG.startingDebt);
    expect(first.health).toBe(RUN_CONFIG.startingHealth);
    expect(first.capacityBase).toBe(RUN_CONFIG.baseCapacity);
    expect(first.capacityBonus).toBe(0);
    expect(first.inventory).toEqual({});
    expect(first.currentLocationId).toBe(second.currentLocationId);
  });

  it('assigns hidden per-run market conditions and visible market states', () => {
    const run = createNewRun({ seed: 'conditions' });

    for (const location of LOCATIONS) {
      const state = run.locationStates[location.locationId];
      expect(state.hiddenMarketConditionId).toBeTruthy();
      expect(state.activeDrugIds).toHaveLength(8);
      expect(Object.keys(state.localPriceMap)).toHaveLength(8);
    }
  });

  it('travels, advances the day, and applies debt growth once', () => {
    const run = { ...createNewRun({ seed: 'travel' }), currentLocationId: 'ashview-gardens' as const };
    const destination = LOCATIONS.find(
      (location) =>
        location.locationId !== run.currentLocationId &&
        location.locationId !== 'the-bodega',
    );

    expect(destination).toBeDefined();

    const result = travelToLocation(run, destination!.locationId);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.run.currentDay).toBe(2);
    expect(result.run.currentLocationId).toBe(destination!.locationId);
    expect(result.run.debt).toBe(applyDailyDebtGrowth(RUN_CONFIG.startingDebt));
    expect(result.dayAdvanced).toBe(true);
    expect(result.run.actionLog.at(-1)?.type).toBe('travel');
  });

  it('travels into The Bodega and advances day, debt, and markets', () => {
    const run = {
      ...createNewRun({ seed: 'ez-in' }),
      currentLocationId: 'ashview-gardens' as const,
    };
    const result = travelToLocation(run, 'the-bodega');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.dayAdvanced).toBe(true);
    expect(result.run.currentDay).toBe(run.currentDay + 1);
    expect(result.run.debt).toBe(applyDailyDebtGrowth(run.debt));
    expect(result.run.locationStates).not.toEqual(run.locationStates);
    expect(result.run.currentLocationId).toBe('the-bodega');
  });

  it('leaves The Bodega and advances day and debt', () => {
    const run = {
      ...createNewRun({ seed: 'ez-out' }),
      currentLocationId: 'the-bodega' as const,
    };
    const result = travelToLocation(run, 'vista-creek-towers');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.dayAdvanced).toBe(true);
    expect(result.run.currentDay).toBe(run.currentDay + 1);
    expect(result.run.debt).toBe(applyDailyDebtGrowth(run.debt));
    expect(result.run.currentLocationId).toBe('vista-creek-towers');
  });

  it('ends at the day limit without creating day 32', () => {
    const run = {
      ...createNewRun({ seed: 'day-limit' }),
      currentLocationId: 'ashview-gardens' as const,
      currentDay: RUN_CONFIG.runLengthDays - 1,
    };
    const destination = LOCATIONS.find(
      (location) =>
        location.locationId !== run.currentLocationId &&
        location.locationId !== 'the-bodega',
    );
    const result = travelToLocation(run, destination!.locationId);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.run.currentDay).toBe(RUN_CONFIG.runLengthDays);
    expect(result.run.isRunEnded).toBe(true);
    expect(result.endedRun).toBe(true);
  });
});
