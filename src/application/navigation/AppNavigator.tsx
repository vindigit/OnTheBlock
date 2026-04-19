import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { BodegaScreen } from '../../screens/BodegaScreen/BodegaScreen';
import { BootScreen } from '../../screens/BootScreen/BootScreen';
import { EndRunScreen } from '../../screens/EndRunScreen/EndRunScreen';
import { HomeScreen } from '../../screens/HomeScreen/HomeScreen';
import { InventoryScreen } from '../../screens/InventoryScreen/InventoryScreen';
import { MarketScreen } from '../../screens/MarketScreen/MarketScreen';
import { SharksOfficeScreen } from '../../screens/SharksOfficeScreen/SharksOfficeScreen';
import { TravelScreen } from '../../screens/TravelScreen/TravelScreen';
import { UI } from '../../config/ui';
import { useRunStore } from '../store/runStore';

export type MainTabParamList = {
  Market: undefined;
  Inventory: undefined;
  Travel: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Bodega: undefined;
  SharksOffice: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: UI.colors.money,
        tabBarInactiveTintColor: UI.colors.muted,
        tabBarStyle: {
          minHeight: 64,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: UI.colors.surface,
          borderTopColor: UI.colors.line,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen name="Market" component={MarketScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Travel" component={TravelScreen} />
    </Tab.Navigator>
  );
}

function EncounterOverlay() {
  const run = useRunStore((state) => state.currentRun);
  const resolvePendingEncounter = useRunStore((state) => state.resolvePendingEncounter);
  const pendingEncounter = run?.pendingEncounter ?? null;

  return (
    <Modal visible={pendingEncounter !== null} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{pendingEncounter?.title}</Text>
          <Text style={styles.modalCopy}>{pendingEncounter?.body}</Text>
          <Button onPress={() => resolvePendingEncounter('hand-it-over')}>
            Hand it over
          </Button>
          <Button onPress={() => resolvePendingEncounter('run')} tone="danger">
            Run
          </Button>
        </View>
      </View>
    </Modal>
  );
}

export function AppNavigator() {
  const bootStatus = useRunStore((state) => state.bootStatus);
  const currentRun = useRunStore((state) => state.currentRun);
  const hydrate = useRunStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (bootStatus === 'booting') {
    return <BootScreen />;
  }

  if (!currentRun) {
    return <HomeScreen />;
  }

  if (currentRun.isRunEnded) {
    return <EndRunScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Bodega"
          component={BodegaScreen}
          options={{ title: 'The Bodega' }}
        />
        <Stack.Screen
          name="SharksOffice"
          component={SharksOfficeScreen}
          options={{ title: "The Shark's Office" }}
        />
      </Stack.Navigator>
      <EncounterOverlay />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  modalBox: {
    backgroundColor: UI.colors.surface,
    borderRadius: UI.radius.medium,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    color: UI.colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  modalCopy: {
    color: UI.colors.muted,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
});
