import { StyleSheet, Text, View } from 'react-native';
import { useRunStore } from '../../application/store/runStore';
import { Screen } from '../../components/common/Screen';
import { RunHud } from '../../components/hud/RunHud';
import { UI } from '../../config/ui';
import {
  getCapacityMax,
  getCapacityUsed,
  getInventoryRows,
} from '../../domain/selectors/runSelectors';
import { formatCurrency } from '../../utils/formatting';

export function InventoryScreen() {
  const run = useRunStore((state) => state.currentRun);

  if (!run) {
    return null;
  }

  const rows = getInventoryRows(run);

  return (
    <Screen>
      <RunHud run={run} />
      <Text style={styles.title}>Inventory</Text>
      <Text style={styles.copy}>
        Carrying {getCapacityUsed(run)} of {getCapacityMax(run)}.
      </Text>
      <View style={styles.list}>
        {rows.length === 0 ? (
          <Text style={styles.empty}>Nothing in your pockets.</Text>
        ) : (
          rows.map((row) => (
            <View key={row.drug.drugId} style={styles.row}>
              <View style={styles.itemText}>
                <Text style={styles.name}>{row.drug.displayName}</Text>
                <Text style={styles.average}>
                  {row.drug.unit} / Avg paid {formatCurrency(row.averagePurchasePrice ?? 0)}
                </Text>
              </View>
              <Text style={styles.quantity}>{row.quantity}</Text>
            </View>
          ))
        )}
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
  copy: {
    color: UI.colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  empty: {
    color: UI.colors.muted,
    fontWeight: '800',
    fontSize: 16,
  },
  row: {
    minHeight: 58,
    borderRadius: UI.radius.medium,
    borderColor: UI.colors.line,
    borderWidth: 1,
    backgroundColor: UI.colors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: UI.colors.ink,
    fontWeight: '900',
    fontSize: 17,
  },
  itemText: {
    flex: 1,
    gap: 4,
  },
  average: {
    color: UI.colors.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  quantity: {
    color: UI.colors.money,
    fontWeight: '900',
    fontSize: 18,
  },
});
