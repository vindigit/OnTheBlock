import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { EncounterModal } from '../../components/encounter/EncounterModal';
import { EncounterResultModal } from '../../components/encounter/EncounterResultModal';
import { BodegaScreen } from '../../screens/BodegaScreen/BodegaScreen';
import { BootScreen } from '../../screens/BootScreen/BootScreen';
import { EndRunScreen } from '../../screens/EndRunScreen/EndRunScreen';
import { HomeScreen } from '../../screens/HomeScreen/HomeScreen';
import { InventoryScreen } from '../../screens/InventoryScreen/InventoryScreen';
import { MarketScreen } from '../../screens/MarketScreen/MarketScreen';
import { SharksOfficeScreen } from '../../screens/SharksOfficeScreen/SharksOfficeScreen';
import { TravelScreen } from '../../screens/TravelScreen/TravelScreen';
import { useRunStore } from '../store/runStore';
import { UI } from '../../config/ui';
import {
  getCapacityUsed,
  getEquippedWeaponStats,
} from '../../domain/selectors/runSelectors';
import { formatCurrency } from '../../utils/formatting';

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

function ConnectedEncounterModal() {
  const run = useRunStore((state) => state.currentRun);
  const resolvePendingEncounter = useRunStore((state) => state.resolvePendingEncounter);
  const [resultBlurb, setResultBlurb] = useState<{
    title: string;
    body: string;
  } | null>(null);

  if (!run) {
    return null;
  }

  return (
    <>
      <EncounterModal
        cash={run.cash}
        debt={run.debt}
        dopeCarried={getCapacityUsed(run)}
        equippedWeaponStats={getEquippedWeaponStats(run)}
        health={run.health}
        onHandItOver={() => resolvePendingEncounter('hand-it-over')}
        onSurrender={() => resolvePendingEncounter('surrender')}
        onRun={() => {
          const result = resolvePendingEncounter('run');

          if (result.ok && result.outcome === 'contraband-seized') {
            const historyEntry = result.run.encounterHistory.at(-1);
            const cashLost = historyEntry?.cashLost ?? 0;
            const inventoryUnitsLost = historyEntry?.inventoryUnitsLost ?? 0;

            setResultBlurb({
              title: 'Shakedown!',
              body: `Officer Hardass tossed your stash. You lost ${formatCurrency(cashLost)} and ${inventoryUnitsLost} units of dope.`,
            });
          }
        }}
        onFight={() => resolvePendingEncounter('fight')}
        pendingEncounter={run.pendingEncounter}
      />
      <EncounterResultModal
        body={resultBlurb?.body ?? ''}
        onDismiss={() => setResultBlurb(null)}
        title={resultBlurb?.title ?? ''}
        visible={resultBlurb !== null}
      />
    </>
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
      <ConnectedEncounterModal />
    </NavigationContainer>
  );
}
