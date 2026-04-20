import { Modal, StyleSheet, Text, View } from 'react-native';
import { UI } from '../../config/ui';
import type { PendingEncounter } from '../../domain/models/types';
import { formatCurrency } from '../../utils/formatting';
import { Button } from '../common/Button';

type EncounterModalProps = {
  pendingEncounter: PendingEncounter | null;
  cash: number;
  debt: number;
  dopeCarried: number;
  health: number;
  equippedWeaponStats: {
    displayName: string;
    damage: number;
    accuracy: number;
  } | null;
  onHandItOver: () => void;
  onSurrender: () => void;
  onRun: () => void;
  onFight: () => void;
};

export function EncounterModal({
  cash,
  debt,
  dopeCarried,
  equippedWeaponStats,
  health,
  onFight,
  onHandItOver,
  onRun,
  onSurrender,
  pendingEncounter,
}: EncounterModalProps) {
  if (!pendingEncounter) {
    return null;
  }

  const isMugging = pendingEncounter.type === 'mugging';
  const isPolice = pendingEncounter.type === 'police-chase';
  const kicker = isPolice
    ? 'Officer Hardass'
    : isMugging
      ? 'Street wolves'
      : "Big Sal's crew";
  const threat = isPolice
    ? 'Run clean or fight dirty.'
    : isMugging
      ? 'Cash talks loud. So do guns.'
      : 'No deals. No walking away.';

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text style={styles.title}>{pendingEncounter.title}</Text>
          <Text style={styles.body}>{pendingEncounter.body}</Text>
          <Text style={styles.threat}>{threat}</Text>
          {pendingEncounter.lastRoundSummary ? (
            <Text style={styles.roundSummary}>
              {pendingEncounter.lastRoundSummary}
            </Text>
          ) : null}

          <View style={styles.stats}>
            {isPolice ? (
              <>
                <PressureStat label="Cash on hand" value={formatCurrency(cash)} />
                <PressureStat label="Health" value={`${health}`} />
                <PressureStat label="Dope carried" value={`${dopeCarried}`} />
                <PressureStat
                  label="Police remaining"
                  value={`${pendingEncounter.officersRemaining ?? 1}`}
                />
              </>
            ) : (
              <>
                <PressureStat label="Cash on hand" value={formatCurrency(cash)} />
                <PressureStat
                  label="Outstanding debt"
                  value={formatCurrency(debt)}
                />
                <PressureStat label="Health" value={`${health}`} />
              </>
            )}
          </View>

          <View style={styles.actions}>
            {isPolice ? null : isMugging ? (
              <Button onPress={onSurrender}>Surrender</Button>
            ) : (
              <Button onPress={onHandItOver}>Hand it over</Button>
            )}
            <Button onPress={onRun} tone="danger">
              Run
            </Button>
            {(isMugging || isPolice) && equippedWeaponStats ? (
              <Button onPress={onFight} tone="secondary">
                Fight with {equippedWeaponStats.displayName}
              </Button>
            ) : null}
            {isPolice && !equippedWeaponStats ? (
              <Button disabled onPress={onFight} tone="secondary">
                No weapon equipped
              </Button>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PressureStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  panel: {
    backgroundColor: UI.colors.ink,
    borderRadius: UI.radius.medium,
    borderColor: UI.colors.warning,
    borderWidth: 2,
    padding: 16,
    gap: 12,
  },
  kicker: {
    color: UI.colors.warning,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  body: {
    color: '#E9EFEA',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
  },
  threat: {
    color: UI.colors.warning,
    fontSize: 15,
    fontWeight: '900',
  },
  roundSummary: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  stats: {
    gap: 8,
  },
  stat: {
    minHeight: 48,
    borderRadius: UI.radius.small,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statLabel: {
    color: '#B9C4BC',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  actions: {
    gap: 10,
  },
});
