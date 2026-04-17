import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useRunStore } from '../../application/store/runStore';
import { Button } from '../../components/common/Button';
import { Screen } from '../../components/common/Screen';
import { RunHud } from '../../components/hud/RunHud';
import { LOCATIONS } from '../../config/locations';
import { UI } from '../../config/ui';
import type { LocationDefinition, LocationId } from '../../domain/models/types';

export function TravelScreen() {
  const run = useRunStore((state) => state.currentRun);
  const travel = useRunStore((state) => state.travel);
  const [pendingLocation, setPendingLocation] = useState<LocationDefinition | null>(null);

  if (!run) {
    return null;
  }

  const handleTravel = (locationId: LocationId) => {
    const result = travel(locationId);

    if (result.ok) {
      setPendingLocation(null);
    }
  };
  const pendingInvolvesEzMart =
    pendingLocation !== null &&
    (pendingLocation.locationId === 'ez-mart' || run.currentLocationId === 'ez-mart');

  return (
    <Screen scroll={false}>
      <RunHud run={run} />
      <View style={styles.headingGroup}>
        <Text style={styles.title}>Travel</Text>
        <Text style={styles.copy}>Every move grows the note.</Text>
      </View>
      <View style={styles.map}>
        <Svg height="100%" width="100%" viewBox="0 0 100 100">
          <Line x1="50" y1="16" x2="79" y2="49" stroke={UI.colors.accent} strokeWidth="2.5" />
          <Line x1="79" y1="49" x2="50" y2="83" stroke={UI.colors.accent} strokeWidth="2.5" />
          <Line x1="50" y1="83" x2="21" y2="49" stroke={UI.colors.accent} strokeWidth="2.5" />
          <Line x1="21" y1="49" x2="50" y2="16" stroke={UI.colors.accent} strokeWidth="2.5" />
          {LOCATIONS.map((location) => (
            <Circle
              key={location.locationId}
              cx={location.mapPosition.x}
              cy={location.mapPosition.y}
              r="8"
              fill={
                location.locationId === run.currentLocationId
                  ? UI.colors.money
                  : UI.colors.node
              }
              stroke={UI.colors.ink}
              strokeWidth="1.2"
            />
          ))}
        </Svg>
        {LOCATIONS.map((location) => {
          const isCurrent = location.locationId === run.currentLocationId;
          return (
            <Pressable
              accessibilityLabel={`${location.displayName}${isCurrent ? ', current location' : ''}`}
              accessibilityRole="button"
              disabled={isCurrent}
              key={location.locationId}
              onPress={() => setPendingLocation(location)}
              style={[
                styles.nodeButton,
                {
                  left: `${location.mapPosition.x - 16}%`,
                  top: `${location.mapPosition.y - 8}%`,
                },
                isCurrent && styles.currentNodeButton,
              ]}
            >
              <Text style={styles.nodeLabel}>{location.displayName}</Text>
            </Pressable>
          );
        })}
      </View>
      <Modal visible={pendingLocation !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Head to {pendingLocation?.displayName}?</Text>
            <Text style={styles.modalCopy}>
              {pendingInvolvesEzMart
                ? 'EZ Mart runs do not burn the day.'
                : 'Day advances and debt grows.'}
            </Text>
            <Button
              onPress={() => {
                if (pendingLocation) {
                  handleTravel(pendingLocation.locationId);
                }
              }}
            >
              Travel
            </Button>
            <Button onPress={() => setPendingLocation(null)} tone="danger">
              Stay
            </Button>
          </View>
        </View>
      </Modal>
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
  map: {
    flex: 1,
    minHeight: 380,
    position: 'relative',
  },
  nodeButton: {
    position: 'absolute',
    width: '32%',
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    backgroundColor: UI.colors.surface,
    borderRadius: UI.radius.medium,
    borderColor: UI.colors.line,
    borderWidth: 1,
  },
  currentNodeButton: {
    borderColor: UI.colors.money,
    backgroundColor: '#EEF8F1',
  },
  nodeLabel: {
    color: UI.colors.ink,
    fontWeight: '900',
    textAlign: 'center',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalBox: {
    backgroundColor: UI.colors.surface,
    borderRadius: UI.radius.medium,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    color: UI.colors.ink,
    fontWeight: '900',
    fontSize: 22,
  },
  modalCopy: {
    color: UI.colors.muted,
    fontWeight: '800',
  },
});
