import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRunStore } from '../../application/store/runStore';
import { Button } from '../../components/common/Button';
import { Screen } from '../../components/common/Screen';
import { RunHud } from '../../components/hud/RunHud';
import { UI } from '../../config/ui';
import { canAccessLoanShark } from '../../domain/selectors/runSelectors';
import { formatCurrency } from '../../utils/formatting';

export function SharksOfficeScreen() {
  const run = useRunStore((state) => state.currentRun);
  const payDebt = useRunStore((state) => state.payDebt);
  const [message, setMessage] = useState<string | null>(null);

  if (!run) {
    return null;
  }

  const hasLoanShark = canAccessLoanShark(run);
  const maxPayment = Math.min(run.cash, run.debt);

  const handlePayDebt = (amount: number) => {
    const result = payDebt(amount);

    if (result.ok) {
      setMessage(`Paid ${formatCurrency(result.amount)}.`);
      return;
    }

    setMessage(result.reason.split('-').join(' '));
  };

  return (
    <Screen>
      <RunHud run={run} />
      <Text style={styles.title}>The Shark's Office</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Big Sal's ledger</Text>
        <Text style={styles.copy}>
          Cash {formatCurrency(run.cash)} / Debt {formatCurrency(run.debt)}
        </Text>
        {hasLoanShark ? (
          <>
            <View style={styles.actionRow}>
              <Button
                disabled={run.cash < 100 || run.debt < 100}
                onPress={() => handlePayDebt(100)}
              >
                Pay $100
              </Button>
              <Button
                disabled={run.cash < 1000 || run.debt < 1000}
                onPress={() => handlePayDebt(1000)}
              >
                Pay $1,000
              </Button>
            </View>
            <Button disabled={maxPayment <= 0} onPress={() => handlePayDebt(maxPayment)}>
              Pay Max {formatCurrency(maxPayment)}
            </Button>
          </>
        ) : (
          <Text style={styles.copy}>Big Sal only takes meetings at Vista Creek Towers.</Text>
        )}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: UI.colors.ink,
    fontSize: 28,
    fontWeight: '900',
  },
  panel: {
    backgroundColor: UI.colors.surface,
    borderRadius: UI.radius.medium,
    borderColor: UI.colors.line,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  panelTitle: {
    color: UI.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  copy: {
    color: UI.colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  message: {
    color: UI.colors.ink,
    fontWeight: '800',
  },
});
