import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../../application/navigation/AppNavigator';
import { useRunStore } from '../../application/store/runStore';
import { Button } from '../../components/common/Button';
import { Screen } from '../../components/common/Screen';
import { RunHud } from '../../components/hud/RunHud';
import { MarketActionSheet } from '../../components/market/MarketActionSheet';
import { MarketRow } from '../../components/market/MarketRow';
import { DRUG_BY_ID } from '../../config/drugs';
import { UI } from '../../config/ui';
import type { DrugDefinition, DrugId } from '../../domain/models/types';
import {
  canAccessBodega,
  canAccessLoanShark,
  getCurrentMarketQuotes,
} from '../../domain/selectors/runSelectors';

export function MarketScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const run = useRunStore((state) => state.currentRun);
  const buy = useRunStore((state) => state.buy);
  const sell = useRunStore((state) => state.sell);
  const [selectedDrugId, setSelectedDrugId] = useState<DrugId | null>(null);

  const quotes = useMemo(() => (run ? getCurrentMarketQuotes(run) : []), [run]);
  const selectedDrug: DrugDefinition | null = selectedDrugId
    ? DRUG_BY_ID[selectedDrugId]
    : null;

  if (!run) {
    return null;
  }

  return (
    <Screen>
      <RunHud run={run} />
      <View style={styles.headingGroup}>
        <Text style={styles.title}>Market</Text>
        <Text style={styles.copy}>Only posted products move here today.</Text>
      </View>
      {canAccessBodega(run) || canAccessLoanShark(run) ? (
        <View style={styles.contextActions}>
          {canAccessBodega(run) ? (
            <Button onPress={() => navigation.navigate('Bodega')}>Bodega Menu</Button>
          ) : null}
          {canAccessLoanShark(run) ? (
            <Button onPress={() => navigation.navigate('SharksOffice')} tone="danger">
              Meet Big Sal
            </Button>
          ) : null}
        </View>
      ) : null}
      <View style={styles.list}>
        {quotes.map((quote) => (
          <MarketRow
            key={quote.drugId}
            drug={DRUG_BY_ID[quote.drugId]}
            quote={quote}
            onPress={() => setSelectedDrugId(quote.drugId)}
          />
        ))}
      </View>
      <MarketActionSheet
        key={selectedDrug?.drugId ?? 'empty'}
        drug={selectedDrug}
        run={run}
        visible={selectedDrug !== null}
        onBuy={(quantity) =>
          selectedDrug
            ? buy(selectedDrug.drugId, quantity)
            : { ok: false, reason: 'inactive-local-market' }
        }
        onClose={() => setSelectedDrugId(null)}
        onSell={(quantity) =>
          selectedDrug
            ? sell(selectedDrug.drugId, quantity)
            : { ok: false, reason: 'inactive-local-market' }
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingGroup: {
    gap: 4,
  },
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
  contextActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
