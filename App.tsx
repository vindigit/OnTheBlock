import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/application/navigation/AppNavigator';

export default function App() {
  return (
    <>
      <AppNavigator />
      <StatusBar style="dark" />
    </>
  );
}
