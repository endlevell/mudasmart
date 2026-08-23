import { Tabs, router, type Href } from 'expo-router';
import { FloatingTabBar, type TabItem } from '../../components/floating-tab-bar';

const tabs: TabItem[] = [
  { key: 'beranda', routeName: 'index', label: 'Beranda', icon: 'home-outline', href: '/(guru)' },
  { key: 'rekap', routeName: 'rekap', label: 'Rekap', icon: 'stats-chart-outline', href: '/(guru)/rekap' },
  { key: 'murid', routeName: 'murid', label: 'Murid', icon: 'people-outline', href: '/(guru)/murid' },
  { key: 'profil', routeName: 'profil', label: 'Profil', icon: 'person-outline', href: '/(guru)/profil' },
];

export default function GuruLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state }) => (
        <FloatingTabBar
          tabs={tabs}
          activeRouteName={state.routes[state.index]?.name ?? 'index'}
          onSelect={(href) => router.navigate(href as Href)}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="rekap" />
      <Tabs.Screen name="murid" />
      <Tabs.Screen name="profil" />
      {/* Layar tersembunyi dari tab bar, tetap bisa di-push. */}
      <Tabs.Screen name="kelas" options={{ href: null }} />
      <Tabs.Screen name="gerbang" options={{ href: null }} />
      <Tabs.Screen name="pengaturan" options={{ href: null }} />
    </Tabs>
  );
}
