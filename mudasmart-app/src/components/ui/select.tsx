import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, type } from '../../constants/theme';

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
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, shadow.floating]}>
            <View style={styles.handle} />
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
  label: { ...type.label, color: colors.textPrimary, marginBottom: spacing.xs + 2 },
  trigger: {
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  value: { color: colors.textPrimary, fontSize: type.body.fontSize },
  placeholder: { color: colors.textSecondary },
  chevron: { color: colors.textSecondary, fontSize: 14 },
  backdrop: { backgroundColor: 'rgba(7,20,15,0.45)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '60%', paddingBottom: spacing.xl },
  handle: { alignSelf: 'center', backgroundColor: colors.borderStrong, borderRadius: radius.full, height: 4, marginBottom: spacing.sm, marginTop: spacing.sm, width: 44 },
  option: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  optionLabel: { color: colors.textPrimary, fontSize: type.body.fontSize },
  active: { color: colors.primary700, fontWeight: '700' },
});
