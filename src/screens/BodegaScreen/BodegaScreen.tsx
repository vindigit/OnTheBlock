import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRunStore } from '../../application/store/runStore';
import { Button } from '../../components/common/Button';
import { Screen } from '../../components/common/Screen';
import { RunHud } from '../../components/hud/RunHud';
import { UI } from '../../config/ui';
import type {
  AttachmentDefinition,
  BodegaItemId,
  BodegaStockItem,
  WeaponDefinition,
} from '../../domain/models/types';
import {
  canAccessBodega,
  getBodegaStock,
  getEquippedWeaponStats,
} from '../../domain/selectors/runSelectors';
import { formatCurrency } from '../../utils/formatting';

const CATEGORY_LABELS = {
  survival: 'Survival',
  apparel: 'Apparel',
  defense: 'Defense',
  attachments: 'Attachments',
} as const;

function getStockId(item: BodegaStockItem): BodegaItemId {
  if ('itemId' in item) {
    return item.itemId;
  }

  if ('weaponId' in item) {
    return item.weaponId;
  }

  return item.attachmentId;
}

function isWeapon(item: BodegaStockItem): item is WeaponDefinition {
  return 'weaponId' in item;
}

function isAttachment(item: BodegaStockItem): item is AttachmentDefinition {
  return 'attachmentId' in item;
}

export function BodegaScreen() {
  const run = useRunStore((state) => state.currentRun);
  const buyBodegaItem = useRunStore((state) => state.buyBodegaItem);
  const equipWeapon = useRunStore((state) => state.equipWeapon);
  const installAttachment = useRunStore((state) => state.installAttachment);
  const [message, setMessage] = useState<string | null>(null);

  const groupedStock = useMemo(
    () =>
      getBodegaStock().reduce(
        (groups, item) => {
          groups[item.category].push(item);
          return groups;
        },
        {
          survival: [] as BodegaStockItem[],
          apparel: [] as BodegaStockItem[],
          defense: [] as BodegaStockItem[],
          attachments: [] as BodegaStockItem[],
        },
      ),
    [],
  );

  if (!run) {
    return null;
  }

  const equippedWeapon = getEquippedWeaponStats(run);
  const hasBodega = canAccessBodega(run);

  const handleBuy = (item: BodegaStockItem) => {
    const result = buyBodegaItem(getStockId(item));

    if (result.ok) {
      setMessage(`Bought ${item.displayName}.`);
      return;
    }

    setMessage(result.reason.split('-').join(' '));
  };

  const handleEquip = (item: WeaponDefinition) => {
    const result = equipWeapon(item.weaponId);

    if (result.ok) {
      setMessage(`Equipped ${item.displayName}.`);
      return;
    }

    setMessage(result.reason.split('-').join(' '));
  };

  const handleInstall = (item: AttachmentDefinition) => {
    const result = installAttachment(item.attachmentId);

    if (result.ok) {
      setMessage(`Installed ${item.displayName}.`);
      return;
    }

    setMessage(result.reason.split('-').join(' '));
  };

  return (
    <Screen>
      <RunHud run={run} />
      <View style={styles.headingGroup}>
        <Text style={styles.title}>The Bodega</Text>
        <Text style={styles.copy}>
          Cash {formatCurrency(run.cash)}. Stock is fixed behind the counter.
        </Text>
      </View>

      {!hasBodega ? (
        <View style={styles.panel}>
          <Text style={styles.copy}>The Bodega only opens at The Bodega.</Text>
        </View>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {(Object.keys(groupedStock) as Array<keyof typeof groupedStock>).map((category) => (
        <View key={category} style={styles.section}>
          <Text style={styles.sectionTitle}>{CATEGORY_LABELS[category]}</Text>
          {groupedStock[category].map((item) => {
            const stockId = getStockId(item);
            const ownedWeapon = isWeapon(item)
              ? run.equipment.ownedWeapons[item.weaponId]
              : null;
            const ownsApparel =
              'capacityBonus' in item &&
              run.equipment.ownedApparelItemIds.includes(item.itemId);
            const isEquipped =
              isWeapon(item) &&
              run.equipment.equippedWeaponLoadout.weaponId === item.weaponId;
            const ownedAttachmentCount = isAttachment(item)
              ? run.equipment.ownedAttachmentCounts[item.attachmentId] ?? 0
              : 0;
            const attachmentInstalled =
              isAttachment(item) &&
              equippedWeapon?.installedAttachmentIds.includes(item.attachmentId);
            const alreadyOwned = Boolean(ownedWeapon || ownsApparel);

            return (
              <View key={stockId} style={styles.row}>
                <View style={styles.itemText}>
                  <Text style={styles.name}>{item.displayName}</Text>
                  <Text style={styles.meta}>
                    {formatCurrency(item.price)} / {item.description}
                  </Text>
                  {isAttachment(item) ? (
                    <Text style={styles.meta}>Owned loose: {ownedAttachmentCount}</Text>
                  ) : null}
                  {isWeapon(item) && ownedWeapon ? (
                    <Text style={styles.meta}>
                      Installed mods: {ownedWeapon.installedAttachmentIds.length}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <Button
                    disabled={!hasBodega || alreadyOwned || run.cash < item.price}
                    onPress={() => handleBuy(item)}
                  >
                    {alreadyOwned ? 'Owned' : 'Buy'}
                  </Button>
                  {isWeapon(item) && ownedWeapon ? (
                    <Button
                      disabled={isEquipped}
                      onPress={() => handleEquip(item)}
                      tone="secondary"
                    >
                      {isEquipped ? 'Equipped' : 'Equip'}
                    </Button>
                  ) : null}
                  {isAttachment(item) ? (
                    <Button
                      disabled={
                        !equippedWeapon ||
                        ownedAttachmentCount <= 0 ||
                        attachmentInstalled === true
                      }
                      onPress={() => handleInstall(item)}
                      tone="secondary"
                    >
                      {attachmentInstalled ? 'Installed' : 'Install'}
                    </Button>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ))}
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
    lineHeight: 22,
  },
  message: {
    color: UI.colors.ink,
    fontWeight: '800',
  },
  panel: {
    backgroundColor: UI.colors.surface,
    borderRadius: UI.radius.medium,
    borderColor: UI.colors.line,
    borderWidth: 1,
    padding: 14,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: UI.colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  row: {
    minHeight: 76,
    borderRadius: UI.radius.medium,
    borderColor: UI.colors.line,
    borderWidth: 1,
    backgroundColor: UI.colors.surface,
    padding: 12,
    gap: 10,
  },
  itemText: {
    gap: 4,
  },
  name: {
    color: UI.colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    color: UI.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
