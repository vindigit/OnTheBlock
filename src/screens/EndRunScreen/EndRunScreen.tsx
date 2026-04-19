import { StyleSheet, Text, View } from 'react-native';
import { useRunStore } from '../../application/store/runStore';
import { Button } from '../../components/common/Button';
import { Screen } from '../../components/common/Screen';
import { UI } from '../../config/ui';
import { getNetAfterDebt } from '../../domain/selectors/runSelectors';
import { formatCurrency } from '../../utils/formatting';

export function EndRunScreen() {
  const run = useRunStore((state) => state.currentRun);
  const startNewRun = useRunStore((state) => state.startNewRun);
  const abandonRun = useRunStore((state) => state.abandonRun);

  if (!run) {
    return null;
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Run Complete</Text>
        <Text style={styles.title}>Money made: {formatCurrency(getNetAfterDebt(run))}</Text>
      </View>
      <View style={styles.summary}>
        <SummaryRow label="Final cash" value={formatCurrency(run.cash)} />
        <SummaryRow label="Final debt" value={formatCurrency(run.debt)} />
        <SummaryRow label="Unpaid debt deduction" value={formatCurrency(run.debt)} />
        <SummaryRow label="Net worth" value={formatCurrency(getNetAfterDebt(run))} />
        <SummaryRow label="Days reached" value={`${run.currentDay}`} />
        <SummaryRow label="Encounters resolved" value={`${run.encounterHistory.length}`} />
        <SummaryRow label="End reason" value={run.endReason?.split('-').join(' ') ?? 'day limit'} />
      </View>
      <Button onPress={() => startNewRun()}>New Run</Button>
      <Button onPress={abandonRun} tone="danger">
        Back to Start
      </Button>
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 8,
  },
  kicker: {
    color: UI.colors.money,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: UI.colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  summary: {
    backgroundColor: UI.colors.surface,
    borderRadius: UI.radius.medium,
    borderColor: UI.colors.line,
    borderWidth: 1,
  },
  summaryRow: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomColor: UI.colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    color: UI.colors.muted,
    fontWeight: '800',
  },
  summaryValue: {
    color: UI.colors.ink,
    fontWeight: '900',
  },
});
