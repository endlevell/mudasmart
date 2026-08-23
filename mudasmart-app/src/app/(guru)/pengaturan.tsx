import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ScreenHeader } from '../../components/ui/screen-header';
import { Select } from '../../components/ui/select';
import { colors, radius, spacing, type } from '../../constants/theme';
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
        <Animated.View entering={FadeInDown.delay(40)}>
          <Card>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIcon}>
                <Ionicons name="time-outline" size={17} color={colors.primary700} />
              </View>
              <Text style={styles.sectionTitle}>Jam Absen</Text>
            </View>
            <Input label="Mulai Absen" onChangeText={(v) => setConfig((p) => ({ ...p, checkInStart: v }))} placeholder="06:00" value={config.checkInStart} />
            <Input label="Batas Tepat Waktu" onChangeText={(v) => setConfig((p) => ({ ...p, onTimeCutoff: v }))} placeholder="07:00" value={config.onTimeCutoff} />
            <Input label="Akhir Absen" onChangeText={(v) => setConfig((p) => ({ ...p, checkInEnd: v }))} placeholder="08:00" value={config.checkInEnd} />
            <Button label="Simpan Jam Absen" onPress={() => void saveConfig()} pending={pending} />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90)}>
          <Card>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIcon}>
                <Ionicons name="key-outline" size={17} color={colors.primary700} />
              </View>
              <Text style={styles.sectionTitle}>Kode Registrasi</Text>
              {codes.length > 0 ? <Text style={styles.sectionCount}>{codes.filter((code) => code.isActive).length} aktif</Text> : null}
            </View>

            {codes.map((code) => (
              <View key={code.code} style={styles.codeRow}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{code.code}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.codeMetaRow}>
                    <View style={[styles.roleTag, code.roleAllowed === 'guru' ? styles.roleGuru : styles.roleMurid]}>
                      <Ionicons name={code.roleAllowed === 'guru' ? 'school-outline' : 'person-outline'} size={10} color={code.roleAllowed === 'guru' ? colors.info : colors.primary700} />
                      <Text style={[styles.roleTagText, { color: code.roleAllowed === 'guru' ? colors.info : colors.primary700 }]}>
                        {code.roleAllowed === 'guru' ? 'Guru' : 'Murid'}
                      </Text>
                    </View>
                    <View style={[styles.statusDotWrap, { backgroundColor: code.isActive ? colors.primary100 : colors.surfaceMuted }]}>
                      <View style={[styles.statusDot, { backgroundColor: code.isActive ? colors.primary500 : colors.textSecondary }]} />
                    </View>
                  </View>
                  <Text style={styles.meta}>
                    Terpakai {code.usedCount}{code.maxUses ? `/${code.maxUses}` : ''} kali
                  </Text>
                </View>
                <Pressable hitSlop={8} onPress={() => toggleCode(code)} style={styles.toggleBtn}>
                  <Text style={[styles.toggleText, { color: code.isActive ? colors.danger : colors.primary700 }]}>
                    {code.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </Text>
                </Pressable>
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
        </Animated.View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? (
          <View style={styles.noticeBox}>
            <Ionicons name="checkmark-circle" size={15} color={colors.primary700} />
            <Text style={styles.notice}>{notice}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt },
  content: { gap: spacing.md, padding: spacing.md },
  sectionHead: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm + 2, marginBottom: spacing.xs },
  sectionIcon: { alignItems: 'center', backgroundColor: colors.primary50, borderRadius: 10, height: 34, justifyContent: 'center', width: 34 },
  sectionTitle: { ...type.heading, color: colors.primary700, flex: 1 },
  sectionCount: { ...type.caption, fontWeight: '700', color: colors.textSecondary },
  codeRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm + 2, paddingVertical: spacing.sm - 2 },
  codeBadge: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 1 },
  codeText: { fontSize: type.caption.fontSize, fontWeight: '800', letterSpacing: 0.8, color: colors.textPrimary },
  codeMetaRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  roleTag: { alignItems: 'center', borderRadius: radius.full, flexDirection: 'row', gap: 3, paddingHorizontal: 7, paddingVertical: 2 },
  roleMurid: { backgroundColor: colors.primary100 },
  roleGuru: { backgroundColor: colors.infoBg },
  roleTagText: { fontSize: 10, fontWeight: '700' },
  statusDotWrap: { borderRadius: radius.full, paddingHorizontal: 5, paddingVertical: 5 },
  statusDot: { borderRadius: radius.full, height: 6, width: 6 },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  toggleBtn: { backgroundColor: colors.backgroundAlt, borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  toggleText: { fontSize: type.caption.fontSize, fontWeight: '700' },
  divider: { backgroundColor: colors.border, height: 1, marginVertical: spacing.sm },
  noticeBox: { alignItems: 'center', backgroundColor: colors.primary50, borderRadius: radius.md, flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  notice: { color: colors.primary700, fontSize: type.caption.fontSize, fontWeight: '600' },
  error: { color: colors.danger, fontSize: type.caption.fontSize },
});
