import { applyDailyDebtGrowth } from '../debt/debtEngine';
import {
  createMuggingEncounter,
  createPoliceEncounter,
} from '../encounter/encounterEngine';
import { createNewRun } from '../run/runEngine';
import { travelToLocation } from './travelEngine';

describe('travel engine', () => {
  it('advances the day and debt for The Bodega travel', () => {
    const run = {
      ...createNewRun({ seed: 'bodega-travel' }),
      currentLocationId: 'velvet-heights' as const,
    };
    const result = travelToLocation(run, 'the-bodega');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.run.currentLocationId).toBe('the-bodega');
    expect(result.run.currentDay).toBe(run.currentDay + 1);
    expect(result.run.debt).toBe(applyDailyDebtGrowth(run.debt));
    expect(result.dayAdvanced).toBe(true);
  });

  it('can trigger Big Sal after arrival and post-interest debt growth', () => {
    for (let index = 0; index < 300; index += 1) {
      const run = {
        ...createNewRun({ seed: `big-sal-travel-${index}` }),
        currentLocationId: 'velvet-heights' as const,
        cash: 0,
        debt: 60_000,
      };
      const result = travelToLocation(run, 'vista-creek-towers');

      if (result.ok && result.triggeredEncounter) {
        expect(result.run.currentLocationId).toBe('vista-creek-towers');
        expect(result.run.debt).toBe(applyDailyDebtGrowth(60_000));
        expect(result.run.pendingEncounter).toMatchObject({
          type: 'big-sal-interception',
          title: 'Blocked!',
          debtAtTrigger: applyDailyDebtGrowth(60_000),
        });
        return;
      }
    }

    throw new Error('Expected a deterministic seed to trigger Big Sal.');
  });

  it('can trigger mugging when Big Sal does not trigger', () => {
    for (let index = 0; index < 300; index += 1) {
      const run = {
        ...createNewRun({ seed: `mugging-travel-${index}` }),
        currentLocationId: 'velvet-heights' as const,
        cash: 50_000,
        debt: 0,
      };
      const result = travelToLocation(run, 'vista-creek-towers');

      if (result.ok && result.triggeredEncounter) {
        expect(result.run.pendingEncounter).toMatchObject({
          type: 'mugging',
          title: 'Cornered!',
          cashAtTrigger: 50_000,
        });
        return;
      }
    }

    throw new Error('Expected a deterministic seed to trigger mugging.');
  });

  it('can trigger police when carrying drugs and Big Sal does not trigger', () => {
    for (let index = 0; index < 500; index += 1) {
      const run = {
        ...createNewRun({ seed: `police-travel-${index}` }),
        currentLocationId: 'velvet-heights' as const,
        cash: 50_000,
        debt: 0,
        inventory: {
          weed: { quantity: 1, averagePurchasePrice: 100 },
        },
      };
      const result = travelToLocation(run, 'vista-creek-towers');

      if (result.ok && result.run.pendingEncounter?.type === 'police-chase') {
        expect(result.run.pendingEncounter).toMatchObject({
          type: 'police-chase',
          title: 'Red and Blue!',
          officersDefeated: 0,
          round: 1,
        });
        return;
      }
    }

    throw new Error('Expected a deterministic seed to trigger police.');
  });

  it('prioritizes Big Sal when both encounter types could trigger', () => {
    for (let index = 0; index < 500; index += 1) {
      const run = {
        ...createNewRun({ seed: `priority-travel-${index}` }),
        currentLocationId: 'velvet-heights' as const,
        cash: 50_000,
        debt: 60_000,
      };
      const result = travelToLocation(run, 'vista-creek-towers');

      if (
        result.ok &&
        result.run.pendingEncounter?.type === 'big-sal-interception' &&
        createMuggingEncounter(
          result.run,
          'velvet-heights',
          'vista-creek-towers',
        ) !== null
      ) {
        expect(result.run.pendingEncounter).toMatchObject({
          type: 'big-sal-interception',
          title: 'Blocked!',
        });
        return;
      }
    }

    throw new Error('Expected a deterministic seed to trigger Big Sal priority.');
  });

  it('prioritizes police before mugging when Big Sal does not trigger', () => {
    for (let index = 0; index < 1_000; index += 1) {
      const run = {
        ...createNewRun({ seed: `police-priority-travel-${index}` }),
        currentLocationId: 'velvet-heights' as const,
        cash: 50_000,
        debt: 0,
        inventory: {
          weed: { quantity: 1, averagePurchasePrice: 100 },
        },
      };
      const result = travelToLocation(run, 'vista-creek-towers');

      if (
        result.ok &&
        result.run.pendingEncounter?.type === 'police-chase' &&
        createMuggingEncounter(
          result.run,
          'velvet-heights',
          'vista-creek-towers',
        ) !== null
      ) {
        expect(result.run.pendingEncounter).toMatchObject({
          type: 'police-chase',
          title: 'Red and Blue!',
        });
        return;
      }
    }

    throw new Error('Expected a deterministic seed to trigger police priority.');
  });

  it('prioritizes Big Sal before police when both could trigger', () => {
    for (let index = 0; index < 1_000; index += 1) {
      const run = {
        ...createNewRun({ seed: `big-sal-police-priority-${index}` }),
        currentLocationId: 'velvet-heights' as const,
        cash: 50_000,
        debt: 60_000,
        inventory: {
          weed: { quantity: 1, averagePurchasePrice: 100 },
        },
      };
      const result = travelToLocation(run, 'vista-creek-towers');

      if (
        result.ok &&
        result.run.pendingEncounter?.type === 'big-sal-interception' &&
        createPoliceEncounter(
          result.run,
          'velvet-heights',
          'vista-creek-towers',
        ) !== null
      ) {
        expect(result.run.pendingEncounter).toMatchObject({
          type: 'big-sal-interception',
          title: 'Blocked!',
        });
        return;
      }
    }

    throw new Error('Expected a deterministic seed to trigger Big Sal priority.');
  });

  it('does not spawn encounters on final-day travel', () => {
    const run = {
      ...createNewRun({ seed: 'final-day-police' }),
      currentDay: 30,
      currentLocationId: 'velvet-heights' as const,
      cash: 50_000,
      debt: 60_000,
      inventory: {
        weed: { quantity: 1, averagePurchasePrice: 100 },
      },
    };
    const result = travelToLocation(run, 'vista-creek-towers');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.endedRun).toBe(true);
    expect(result.triggeredEncounter).toBe(false);
    expect(result.run.pendingEncounter).toBeNull();
  });

  it('blocks travel while an encounter is pending', () => {
    const run = {
      ...createNewRun({ seed: 'pending-travel' }),
      pendingEncounter: {
        encounterId: 'pending',
        type: 'big-sal-interception' as const,
        title: 'Blocked!',
        body: 'Pay up.',
        createdDay: 1,
        fromLocationId: 'velvet-heights' as const,
        toLocationId: 'vista-creek-towers' as const,
        debtAtTrigger: 25_000,
      },
    };

    expect(travelToLocation(run, 'the-bodega')).toEqual({
      ok: false,
      reason: 'pending-encounter',
    });
  });
});
