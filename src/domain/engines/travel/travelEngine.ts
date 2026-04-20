import { RUN_CONFIG } from '../../../config/economy';
import { LOCATIONS } from '../../../config/locations';
import type { LocationId, PlayerRun, TravelResult } from '../../models/types';
import { applyDailyDebtGrowth } from '../debt/debtEngine';
import {
  createBigSalInterception,
  createMuggingEncounter,
  createPoliceEncounter,
} from '../encounter/encounterEngine';
import { generateMarketsForDay } from '../market/marketEngine';

function endRunAtDayLimit(run: PlayerRun): PlayerRun {
  if (run.isRunEnded) {
    return run;
  }

  return {
    ...run,
    isRunEnded: true,
    endReason: 'day-limit',
    actionLog: [
      ...run.actionLog,
      {
        type: 'run-ended',
        day: run.currentDay,
        reason: 'day-limit',
      },
    ],
  };
}

export function travelToLocation(
  run: PlayerRun,
  destinationLocationId: LocationId,
): TravelResult {
  if (run.isRunEnded) {
    return { ok: false, reason: 'run-ended' };
  }

  if (run.pendingEncounter) {
    return { ok: false, reason: 'pending-encounter' };
  }

  if (!LOCATIONS.some((location) => location.locationId === destinationLocationId)) {
    return { ok: false, reason: 'unknown-location' };
  }

  if (destinationLocationId === run.currentLocationId) {
    return { ok: false, reason: 'same-location' };
  }

  const fromLocationId = run.currentLocationId;
  const nextDay = run.currentDay + 1;
  const effectiveDay = Math.min(nextDay, RUN_CONFIG.runLengthDays);
  const debtAfter = applyDailyDebtGrowth(run.debt);
  const traveledRun: PlayerRun = {
    ...run,
    currentDay: effectiveDay,
    currentLocationId: destinationLocationId,
    debt: debtAfter,
    locationStates: generateMarketsForDay(
      run.seed,
      effectiveDay,
      run.locationStates,
    ),
    actionLog: [
      ...run.actionLog,
      {
        type: 'travel',
        fromLocationId,
        toLocationId: destinationLocationId,
        day: effectiveDay,
        dayAdvanced: true,
        debtBefore: run.debt,
        debtAfter,
      },
    ],
  };

  if (nextDay >= RUN_CONFIG.runLengthDays) {
    return {
      ok: true,
      run: endRunAtDayLimit(traveledRun),
      dayAdvanced: true,
      endedRun: true,
      triggeredEncounter: false,
    };
  }

  const pendingEncounter = createBigSalInterception(
    traveledRun,
    fromLocationId,
    destinationLocationId,
  ) ?? createPoliceEncounter(
    traveledRun,
    fromLocationId,
    destinationLocationId,
  ) ?? createMuggingEncounter(traveledRun, fromLocationId, destinationLocationId);

  return {
    ok: true,
    run: pendingEncounter ? { ...traveledRun, pendingEncounter } : traveledRun,
    dayAdvanced: true,
    endedRun: false,
    triggeredEncounter: pendingEncounter !== null,
  };
}
