import { LOCATION_BY_ID } from '../../../config/locations';
import type { DebtPaymentResult, PlayerRun } from '../../models/types';

function isWholePositiveAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

export function payDebt(run: PlayerRun, amount: number): DebtPaymentResult {
  if (run.isRunEnded) {
    return { ok: false, reason: 'run-ended' };
  }

  if (!LOCATION_BY_ID[run.currentLocationId].hasLoanShark) {
    return { ok: false, reason: 'unavailable-location' };
  }

  if (!isWholePositiveAmount(amount)) {
    return { ok: false, reason: 'invalid-amount' };
  }

  if (run.debt <= 0) {
    return { ok: false, reason: 'no-debt' };
  }

  if (run.cash <= 0) {
    return { ok: false, reason: 'no-cash' };
  }

  if (amount > run.cash) {
    return { ok: false, reason: 'insufficient-cash' };
  }

  if (amount > run.debt) {
    return { ok: false, reason: 'exceeds-debt' };
  }

  const debtAfter = run.debt - amount;
  const cashAfter = run.cash - amount;

  return {
    ok: true,
    amount,
    run: {
      ...run,
      cash: cashAfter,
      debt: debtAfter,
      actionLog: [
        ...run.actionLog,
        {
          type: 'debt-payment',
          day: run.currentDay,
          locationId: run.currentLocationId,
          amount,
          debtBefore: run.debt,
          debtAfter,
          cashAfter,
        },
      ],
    },
  };
}

export function collectDebtForInterception(run: PlayerRun): {
  run: PlayerRun;
  amount: number;
} {
  const amount = Math.min(run.cash, run.debt);

  return {
    amount,
    run: {
      ...run,
      cash: run.cash - amount,
      debt: run.debt - amount,
    },
  };
}
