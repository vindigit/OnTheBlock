import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { BootScreen } from '../../screens/BootScreen/BootScreen';
import { EndRunScreen } from '../../screens/EndRunScreen/EndRunScreen';
import { HomeScreen } from '../../screens/HomeScreen/HomeScreen';
import { InventoryScreen } from '../../screens/InventoryScreen/InventoryScreen';
import { MarketScreen } from '../../screens/MarketScreen/MarketScreen';
import { ServicesScreen } from '../../screens/ServicesScreen/ServicesScreen';
import { TravelScreen } from '../../screens/TravelScreen/TravelScreen';
import { UI } from '../../config/ui';
import { useRunStore } from '../store/runStore';

export type MainTabParamList = {
  Market: undefined;
  Inventory: undefined;
  Travel: undefined;
  Services: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

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
      <Tab.Screen name="Services" component={ServicesScreen} />
    </Tab.Navigator>
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
      <MainTabs />
    </NavigationContainer>
  );
}
