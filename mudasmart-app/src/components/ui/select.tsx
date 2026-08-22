import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';

interface SelectProps {
  label: string;
  value: string | null;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
  placeholder?: string;
}

// Pengganti picker tanpa dependency baru — Modal + FlatList.
export function Select({ label, value, options, onSelect, placeholder = 'Pilih' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={styles.trigger}>
        <Text style={[styles.value, !selected && styles.placeholder]}>{selected?.label ?? placeholder}</Text>
      </Pressable>
      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                  style={styles.option}
                >
                  <Text style={[styles.optionLabel, item.value === value && styles.active]}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: spacing.xs },
  trigger: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  value: { color: colors.textPrimary, fontSize: 16 },
  placeholder: { color: colors.textSecondary },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.4)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '60%', paddingBottom: spacing.xl },
  option: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  optionLabel: { color: colors.textPrimary, fontSize: 16 },
  active: { color: colors.primary700, fontWeight: '600' },
});
