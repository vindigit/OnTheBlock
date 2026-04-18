import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UI } from '../../config/ui';
import type { DrugDefinition, MarketQuote } from '../../domain/models/types';
import { formatCurrency } from '../../utils/formatting';
import { getBuyFlowProductName } from '../../utils/productDisplay';

type MarketRowProps = {
  drug: DrugDefinition;
  quote: MarketQuote;
  onPress: () => void;
};

export function MarketRow({ drug, onPress, quote }: MarketRowProps) {
  const displayName = getBuyFlowProductName(drug.displayName);

  return (
    <Pressable
      accessibilityLabel={`${displayName}, price ${quote.price}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.nameGroup}>
        <Text style={styles.name}>{displayName}</Text>
      </View>
      <Text style={styles.price}>{formatCurrency(quote.price)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    backgroundColor: UI.colors.surface,
    borderColor: UI.colors.line,
    borderWidth: 1,
    borderRadius: UI.radius.medium,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  pressed: {
    borderColor: UI.colors.money,
    backgroundColor: '#EEF8F1',
  },
  nameGroup: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.colors.ink,
  },
  price: {
    fontSize: 19,
    fontWeight: '900',
    color: UI.colors.money,
  },
});
