import { Modal, StyleSheet, Text, View } from 'react-native';
import { UI } from '../../config/ui';
import { Button } from '../common/Button';

type EncounterResultModalProps = {
  visible: boolean;
  title: string;
  body: string;
  onDismiss: () => void;
};

export function EncounterResultModal({
  body,
  onDismiss,
  title,
  visible,
}: EncounterResultModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Button onPress={onDismiss}>Keep moving</Button>
        </View>
      </View>
    </Modal>
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
});
