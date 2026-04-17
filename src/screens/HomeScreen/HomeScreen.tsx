import { StyleSheet, Text, View } from 'react-native';
import { useRunStore } from '../../application/store/runStore';
import { Button } from '../../components/common/Button';
import { Screen } from '../../components/common/Screen';
import { RUN_CONFIG } from '../../config/economy';
import { UI } from '../../config/ui';
import { formatCurrency } from '../../utils/formatting';

export function HomeScreen() {
  const startNewRun = useRunStore((state) => state.startNewRun);
  const lastError = useRunStore((state) => state.lastError);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>On The Block</Text>
        <Text style={styles.title}>Move fast. Carry smart. Settle up.</Text>
        <Text style={styles.copy}>
          {RUN_CONFIG.runLengthDays} days. {formatCurrency(RUN_CONFIG.startingCash)} cash.{' '}
          {formatCurrency(RUN_CONFIG.startingDebt)} debt.
        </Text>
      </View>
      {lastError ? <Text style={styles.error}>Save cleared: {lastError}</Text> : null}
      <Button onPress={() => startNewRun()}>Start Run</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  kicker: {
    color: UI.colors.money,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: UI.colors.ink,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
  },
  copy: {
    color: UI.colors.muted,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
  },
  error: {
    color: UI.colors.warning,
    fontWeight: '800',
  },
});
