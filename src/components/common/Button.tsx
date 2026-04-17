import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { UI } from '../../config/ui';

type ButtonProps = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
  accessibilityLabel?: string;
}>;

export function Button({
  accessibilityLabel,
  children,
  disabled = false,
  onPress,
  tone = 'primary',
}: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[tone],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 96,
    borderRadius: UI.radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: UI.colors.money,
  },
  secondary: {
    backgroundColor: UI.colors.accent,
  },
  danger: {
    backgroundColor: UI.colors.warning,
  },
  disabled: {
    opacity: 0.42,
  },
  pressed: {
    opacity: 0.84,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
});
