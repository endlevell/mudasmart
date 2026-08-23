import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ScreenHeader } from '../../components/ui/screen-header';
import { Select } from '../../components/ui/select';
import { colors, spacing, type } from '../../constants/theme';
import { codesApi, type RegistrationCode } from '../../api/codes.api';
import { configApi } from '../../api/sessions.api';

// Pengaturan admin — jam absen + kelola kode registrasi (Bagian 9.2.8).
export default function PengaturanScreen() {
  const [config, setConfig] = useState({ checkInStart: '', onTimeCutoff: '', checkInEnd: '' });
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  const [newCode, setNewCode] = useState({ code: '', roleAllowed: 'murid', maxUses: '' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const cfg = (await configApi.getAttendance()).data;
      setConfig({ checkInStart: cfg.checkInStart, onTimeCutoff: cfg.onTimeCutoff, checkInEnd: cfg.checkInEnd });
      setCodes((await codesApi.list()).data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat pengaturan');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfig = async () => {
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!hhmm.test(config.checkInStart) || !hhmm.test(config.onTimeCutoff) || !hhmm.test(config.checkInEnd)) {
      setError('Format jam harus HH:MM');
      return;
    }
    setPending(true);
    try {
      await configApi.updateAttendance(config);
      setNotice('Jam absen tersimpan');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan jam absen');
    } finally {
      setPending(false);
    }
  };

  const createCode = async () => {
    const code = newCode.code.trim().toUpperCase();
    if (code.length < 4) {
      setError('Kode minimal 4 karakter');
      return;
    }
    setPending(true);
    try {
      await codesApi.create({
        code,
        roleAllowed: newCode.roleAllowed as 'murid' | 'guru',
        maxUses: newCode.maxUses ? Number(newCode.maxUses) : undefined,
      });
      setNewCode({ code: '', roleAllowed: 'murid', maxUses: '' });
      await load();
      setNotice(`Kode ${code} dibuat`);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat kode');
    } finally {
      setPending(false);
    }
  };

  const toggleCode = (code: RegistrationCode) => {
    Alert.alert(
      code.isActive ? 'Nonaktifkan Kode' : 'Aktifkan Kode',
      code.isActive
        ? `Kode ${code.code} tidak bisa dipakai registrasi baru.`
        : `Kode ${code.code} bisa dipakai lagi.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: code.isActive ? 'Nonaktifkan' : 'Aktifkan',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await codesApi.setActive(code.code, !code.isActive);
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal mengubah kode');
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.backgroundAlt }} contentContainerStyle={[styles.container, { paddingBottom: 140 }]}>
      <ScreenHeader title="Pengaturan" subtitle="Jam absen & kode registrasi" />
      <View style={styles.content}>
      <Card>
        <Text style={styles.sectionTitle}>Jam Absen</Text>
        <Input label="Mulai Absen" onChangeText={(v) => setConfig((p) => ({ ...p, checkInStart: v }))} placeholder="06:00" value={config.checkInStart} />
        <Input label="Batas Tepat Waktu" onChangeText={(v) => setConfig((p) => ({ ...p, onTimeCutoff: v }))} placeholder="07:00" value={config.onTimeCutoff} />
        <Input label="Akhir Absen" onChangeText={(v) => setConfig((p) => ({ ...p, checkInEnd: v }))} placeholder="08:00" value={config.checkInEnd} />
        <Button label="Simpan Jam Absen" onPress={() => void saveConfig()} pending={pending} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Kode Registrasi</Text>
        {codes.map((code) => (
          <View key={code.code} style={styles.codeRow}>
            <View style={styles.codeInfo}>
              <Text style={styles.codeText}>{code.code}</Text>
              <Text style={styles.meta}>
                {code.roleAllowed} · terpakai {code.usedCount}{code.maxUses ? `/${code.maxUses}` : ''}
              </Text>
            </View>
            <View style={styles.codeActions}>
              <Badge label={code.isActive ? 'Aktif' : 'Nonaktif'} tone={code.isActive ? 'success' : 'neutral'} />
              <Pressable onPress={() => toggleCode(code)} hitSlop={8}>
                <Text style={styles.toggle}>{code.isActive ? 'Nonaktifkan' : 'Aktifkan'}</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {codes.length === 0 ? <Text style={styles.meta}>Belum ada kode</Text> : null}

        <View style={styles.divider} />
        <Input label="Kode Baru" onChangeText={(v) => setNewCode((p) => ({ ...p, code: v }))} placeholder="MURID2027" value={newCode.code} autoCapitalize="characters" />
        <Select
          label="Role"
          onSelect={(value) => setNewCode((p) => ({ ...p, roleAllowed: value }))}
          options={[
            { label: 'Murid', value: 'murid' },
            { label: 'Guru', value: 'guru' },
          ]}
          value={newCode.roleAllowed}
        />
        <Input keyboardType="number-pad" label="Maks. Pemakaian (opsional)" onChangeText={(v) => setNewCode((p) => ({ ...p, maxUses: v }))} placeholder="Tanpa batas" value={newCode.maxUses} />
        <Button label="Buat Kode" onPress={() => void createCode()} pending={pending} />
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt },
  content: { gap: spacing.md, padding: spacing.md },
  sectionTitle: { ...type.label, color: colors.textSecondary, marginBottom: spacing.xs, textTransform: 'uppercase' },
  codeRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  codeInfo: { flex: 1 },
  codeText: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary },
  codeActions: { alignItems: 'flex-end', gap: spacing.xs },
  toggle: { color: colors.info, fontSize: type.caption.fontSize, fontWeight: '600' },
  divider: { backgroundColor: colors.border, height: 1, marginVertical: spacing.sm },
  error: { color: colors.danger, fontSize: type.caption.fontSize },
  notice: { color: colors.primary700, fontSize: type.caption.fontSize, fontWeight: '600' },
});
