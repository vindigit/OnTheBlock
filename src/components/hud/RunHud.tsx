import { StyleSheet, Text, View } from 'react-native';
import { UI } from '../../config/ui';
import type { PlayerRun } from '../../domain/models/types';
import {
  getCapacityMax,
  getCapacityUsed,
  getCurrentLocationName,
  getEquippedWeaponStats,
} from '../../domain/selectors/runSelectors';
import { formatCapacity, formatCurrency } from '../../utils/formatting';

type RunHudProps = {
  run: PlayerRun;
};

export function RunHud({ run }: RunHudProps) {
  const lowHealth = run.health > 0 && run.health <= 25;
  const equippedWeapon = getEquippedWeaponStats(run);

  return (
    <View style={[styles.hud, lowHealth && styles.lowHealth]}>
      <View style={styles.primaryLine}>
        <Text style={styles.day}>Day {run.currentDay}</Text>
        <Text style={styles.location}>{getCurrentLocationName(run)}</Text>
      </View>
      <View style={styles.statGrid}>
        <Stat label="Cash" value={formatCurrency(run.cash)} />
        <Stat label="Debt" value={formatCurrency(run.debt)} />
        <Stat label="Health" value={`${run.health}`} warning={lowHealth} />
        <Stat
          label="Carry"
          value={formatCapacity(getCapacityUsed(run), getCapacityMax(run))}
        />
      </View>
      {equippedWeapon ? (
        <View style={styles.weaponLine}>
          <Text style={styles.weaponText}>
            {equippedWeapon.displayName} / Dmg {equippedWeapon.damage} / Acc{' '}
            {equippedWeapon.accuracy}%
          </Text>
          <View style={styles.modPills}>
            {equippedWeapon.installedAttachmentIds.includes('switch') ? (
              <Text style={styles.modPill}>SW</Text>
            ) : null}
            {equippedWeapon.installedAttachmentIds.includes('laser_beam') ? (
              <Text style={styles.modPill}>LB</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Stat({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, warning && styles.warningText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    backgroundColor: UI.colors.surface,
    borderColor: UI.colors.line,
    borderWidth: 1,
    borderRadius: UI.radius.medium,
    padding: 12,
    gap: 10,
  },
  lowHealth: {
    borderColor: UI.colors.warning,
  },
  primaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  day: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.colors.ink,
  },
  location: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    color: UI.colors.muted,
    textAlign: 'right',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stat: {
    minWidth: '47%',
    flex: 1,
    backgroundColor: UI.colors.background,
    borderRadius: UI.radius.small,
    padding: 8,
  },
  statLabel: {
    fontSize: 12,
    color: UI.colors.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    color: UI.colors.ink,
    fontWeight: '900',
  },
  warningText: {
    color: UI.colors.warning,
  },
  weaponLine: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  weaponText: {
    flex: 1,
    color: UI.colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  modPills: {
    flexDirection: 'row',
    gap: 4,
  },
  modPill: {
    minWidth: 28,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: UI.radius.small,
    backgroundColor: UI.colors.accent,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
});
