import { createNewRun } from '../run/runEngine';
import { payDebt } from './debtPaymentEngine';

describe('debt payment engine', () => {
  it('pays debt from cash and logs the payment', () => {
    const run = {
      ...createNewRun({ seed: 'debt-payment' }),
      currentLocationId: 'vista-creek-towers' as const,
    };
    const result = payDebt(run, 100);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.run.cash).toBe(run.cash - 100);
    expect(result.run.debt).toBe(run.debt - 100);
    expect(result.run.actionLog.at(-1)).toMatchObject({
      type: 'debt-payment',
      amount: 100,
      debtBefore: run.debt,
      debtAfter: run.debt - 100,
      cashAfter: run.cash - 100,
    });
  });

  it('allows max payment bounded by available cash and debt', () => {
    const cashBoundRun = {
      ...createNewRun({ seed: 'cash-bound' }),
      currentLocationId: 'vista-creek-towers' as const,
      cash: 250,
      debt: 500,
    };
    const cashBoundResult = payDebt(cashBoundRun, Math.min(cashBoundRun.cash, cashBoundRun.debt));

    expect(cashBoundResult.ok).toBe(true);
    if (!cashBoundResult.ok) {
      return;
    }
    expect(cashBoundResult.run.cash).toBe(0);
    expect(cashBoundResult.run.debt).toBe(250);

    const debtBoundRun = {
      ...createNewRun({ seed: 'debt-bound' }),
      currentLocationId: 'vista-creek-towers' as const,
      cash: 500,
      debt: 250,
    };
    const debtBoundResult = payDebt(debtBoundRun, Math.min(debtBoundRun.cash, debtBoundRun.debt));

    expect(debtBoundResult.ok).toBe(true);
    if (!debtBoundResult.ok) {
      return;
    }
    expect(debtBoundResult.run.cash).toBe(250);
    expect(debtBoundResult.run.debt).toBe(0);
  });

  it('rejects invalid, impossible, and ended-run payments', () => {
    const run = {
      ...createNewRun({ seed: 'reject-debt' }),
      currentLocationId: 'vista-creek-towers' as const,
    };

    expect(payDebt(run, 0)).toEqual({ ok: false, reason: 'invalid-amount' });
    expect(payDebt({ ...run, cash: 0 }, 100)).toEqual({ ok: false, reason: 'no-cash' });
    expect(payDebt({ ...run, debt: 0 }, 100)).toEqual({ ok: false, reason: 'no-debt' });
    expect(payDebt({ ...run, cash: 50 }, 100)).toEqual({
      ok: false,
      reason: 'insufficient-cash',
    });
    expect(payDebt({ ...run, debt: 50 }, 100)).toEqual({
      ok: false,
      reason: 'exceeds-debt',
    });
    expect(payDebt({ ...run, isRunEnded: true }, 100)).toEqual({
      ok: false,
      reason: 'run-ended',
    });
  });

  it('only allows voluntary repayment at Vista Creek Towers', () => {
    const run = {
      ...createNewRun({ seed: 'wrong-place' }),
      currentLocationId: 'the-bodega' as const,
    };

    expect(payDebt(run, 100)).toEqual({
      ok: false,
      reason: 'unavailable-location',
    });
  });
});
