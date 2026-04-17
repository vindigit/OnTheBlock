import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { UI } from '../../config/ui';

export function BootScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={UI.colors.money} />
      <Text style={styles.text}>Loading your run...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: UI.colors.background,
  },
  text: {
    color: UI.colors.ink,
    fontWeight: '800',
    fontSize: 16,
  },
});
