import { applyDailyDebtGrowth } from '../debt/debtEngine';
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
