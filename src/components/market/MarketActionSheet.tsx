import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { UI } from '../../config/ui';
import type { DrugDefinition, PlayerRun, TradeResult } from '../../domain/models/types';
import {
  getCurrentPrice,
  getMaxBuyQuantity,
  getMaxSellQuantity,
} from '../../domain/selectors/runSelectors';
import { formatCurrency } from '../../utils/formatting';
import { getBuyFlowProductName } from '../../utils/productDisplay';
import { Button } from '../common/Button';

type MarketActionSheetProps = {
  drug: DrugDefinition | null;
  run: PlayerRun;
  visible: boolean;
  onClose: () => void;
  onBuy: (quantity: number) => TradeResult;
  onSell: (quantity: number) => TradeResult;
};

export function MarketActionSheet({
  drug,
  onBuy,
  onClose,
  onSell,
  run,
  visible,
}: MarketActionSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  if (!drug) {
    return null;
  }

  const unitPrice = getCurrentPrice(run, drug.drugId) ?? 0;
  const maxBuy = getMaxBuyQuantity(run, drug.drugId);
  const maxSell = getMaxSellQuantity(run, drug.drugId);
  const effectiveQuantity = Math.max(1, quantity);
  const displayName = getBuyFlowProductName(drug.displayName);

  const handleResult = (result: TradeResult, verb: 'Bought' | 'Sold') => {
    if (result.ok) {
      setMessage(`${verb} ${result.quantity} for ${formatCurrency(result.total)}.`);
      setQuantity(1);
      return;
    }

    setMessage(result.reason.split('-').join(' '));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{displayName}</Text>
              <Text style={styles.meta}>{formatCurrency(unitPrice)}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.quantityRow}>
            <Button
              accessibilityLabel="Decrease quantity"
              disabled={effectiveQuantity <= 1}
              onPress={() => setQuantity((value) => Math.max(1, value - 1))}
              tone="secondary"
            >
              -
            </Button>
            <Text style={styles.quantity}>{effectiveQuantity}</Text>
            <Button
              accessibilityLabel="Increase quantity"
              onPress={() => setQuantity((value) => value + 1)}
              tone="secondary"
            >
              +
            </Button>
          </View>

          <View style={styles.quickRow}>
            <Button disabled={maxBuy <= 0} onPress={() => setQuantity(maxBuy)}>
              Max Buy {maxBuy}
            </Button>
            <Button disabled={maxSell <= 0} onPress={() => setQuantity(maxSell)}>
              Max Sell {maxSell}
            </Button>
          </View>

          <View style={styles.actionRow}>
            <Button
              disabled={effectiveQuantity > maxBuy}
              onPress={() => handleResult(onBuy(effectiveQuantity), 'Bought')}
            >
              Buy
            </Button>
            <Button
              disabled={effectiveQuantity > maxSell}
              onPress={() => handleResult(onSell(effectiveQuantity), 'Sold')}
              tone="secondary"
            >
              Sell
            </Button>
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: UI.colors.surface,
    padding: 16,
    borderTopLeftRadius: UI.radius.medium,
    borderTopRightRadius: UI.radius.medium,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: UI.colors.ink,
  },
  meta: {
    color: UI.colors.muted,
    fontWeight: '700',
  },
  close: {
    minHeight: 44,
    justifyContent: 'center',
  },
  closeText: {
    color: UI.colors.warning,
    fontWeight: '900',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantity: {
    minWidth: 64,
    textAlign: 'center',
    color: UI.colors.ink,
    fontWeight: '900',
    fontSize: 22,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
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
