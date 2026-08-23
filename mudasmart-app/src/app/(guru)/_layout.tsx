import { Tabs, router, type Href } from 'expo-router';
import { FloatingTabBar, type TabItem } from '../../components/floating-tab-bar';
import { useAuthStore } from '../../store/auth-store';

const baseTabs: TabItem[] = [
  { key: 'beranda', routeName: 'index', label: 'Beranda', icon: 'home-outline', href: '/(guru)' },
  { key: 'rekap', routeName: 'rekap', label: 'Rekap', icon: 'stats-chart-outline', href: '/(guru)/rekap' },
  { key: 'murid', routeName: 'murid', label: 'Murid', icon: 'people-outline', href: '/(guru)/murid' },
  { key: 'guru', routeName: 'guru', label: 'Guru', icon: 'school-outline', href: '/(guru)/guru' },
  { key: 'profil', routeName: 'profil', label: 'Profil', icon: 'person-outline', href: '/(guru)/profil' },
];

export default function GuruLayout() {
  const isAdmin = useAuthStore((state) => state.session?.user.isAdmin ?? false);
  // Tab Kelola Guru hanya untuk admin.
  const tabs = isAdmin ? baseTabs : baseTabs.filter((tab) => tab.key !== 'guru');

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state }) => (
        <FloatingTabBar
          tabs={tabs}
          activeKey={state.routes[state.index]?.name ?? 'index'}
          onSelect={(href) => router.navigate(href as Href)}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="rekap" />
      <Tabs.Screen name="murid" />
      <Tabs.Screen name="guru" options={isAdmin ? undefined : { href: null }} />
      <Tabs.Screen name="profil" />
      {/* Layar tersembunyi dari tab bar, tetap bisa di-push. */}
      <Tabs.Screen name="kelas" options={{ href: null }} />
      <Tabs.Screen name="gerbang" options={{ href: null }} />
      <Tabs.Screen name="pengaturan" options={{ href: null }} />
    </Tabs>
  );
}
