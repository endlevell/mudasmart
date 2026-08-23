import { Tabs, router } from 'expo-router';
import { FloatingTabBar, type TabItem } from '../../components/floating-tab-bar';

const tabs: TabItem[] = [
  { key: 'beranda', label: 'Beranda', icon: 'home-outline', href: '/(guru)' },
  { key: 'rekap', label: 'Rekap', icon: 'stats-chart-outline', href: '/(guru)/rekap' },
  { key: 'murid', label: 'Murid', icon: 'people-outline', href: '/(guru)/murid' },
  { key: 'profil', label: 'Profil', icon: 'person-outline', href: '/(guru)/profil' },
];

export default function GuruLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state }) => {
        const active = state.routes[state.index]?.name ?? '';
        const activeKey = tabs.find((tab) => tab.href.endsWith(active))?.key ?? 'beranda';
        return <FloatingTabBar tabs={tabs} activeKey={activeKey} onSelect={(href) => router.navigate(href as never)} />;
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="rekap" />
      {/* Stack murid (list + detail) — tab menunjuk ke list-nya. */}
      <Tabs.Screen name="murid" />
      <Tabs.Screen name="profil" />
      {/* Layar tersembunyi dari tab bar, tetap bisa di-push. */}
      <Tabs.Screen name="kelas" options={{ href: null }} />
      <Tabs.Screen name="gerbang" options={{ href: null }} />
      <Tabs.Screen name="pengaturan" options={{ href: null }} />
    </Tabs>
  );
}
