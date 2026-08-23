import { Tabs, router } from 'expo-router';
import { FloatingTabBar, type TabItem } from '../../components/floating-tab-bar';

const tabs: TabItem[] = [
  { key: 'beranda', label: 'Beranda', icon: 'home-outline', href: '/(murid)' },
  { key: 'scan', label: 'Scan', icon: 'scan-outline', href: '/(murid)/scan', isCenter: true },
  { key: 'riwayat', label: 'Riwayat', icon: 'time-outline', href: '/(murid)/riwayat' },
  { key: 'profil', label: 'Profil', icon: 'person-outline', href: '/(murid)/profil' },
];

export default function MuridLayout() {
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
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="riwayat" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
