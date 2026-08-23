import { Tabs, router, type Href } from 'expo-router';
import { FloatingTabBar, type TabItem } from '../../components/floating-tab-bar';

const tabs: TabItem[] = [
  { key: 'beranda', routeName: 'index', label: 'Beranda', icon: 'home-outline', href: '/(murid)' },
  { key: 'scan', routeName: 'scan', label: 'Scan', icon: 'scan-outline', href: '/(murid)/scan', isCenter: true },
  { key: 'riwayat', routeName: 'riwayat', label: 'Riwayat', icon: 'time-outline', href: '/(murid)/riwayat' },
  { key: 'profil', routeName: 'profil', label: 'Profil', icon: 'person-outline', href: '/(murid)/profil' },
];

export default function MuridLayout() {
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
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="riwayat" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
