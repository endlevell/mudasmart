import { Tabs, usePathname, router, type Href } from 'expo-router';
import { FloatingTabBar, type TabItem } from '../../components/floating-tab-bar';

const tabs: TabItem[] = [
  { key: 'beranda', label: 'Beranda', icon: 'home-outline', href: '/(murid)' },
  { key: 'scan', label: 'Scan', icon: 'scan-outline', href: '/(murid)/scan', isCenter: true },
  { key: 'riwayat', label: 'Riwayat', icon: 'time-outline', href: '/(murid)/riwayat' },
  { key: 'profil', label: 'Profil', icon: 'person-outline', href: '/(murid)/profil' },
];

// Pathname nyata tanpa group: '/(murid)' → '/murid'.
const toPath = (href: string) => href.replace('/(murid)', '/murid');

export default function MuridLayout() {
  const pathname = usePathname();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => {
        const activeKey = tabs.find((tab) => toPath(tab.href) === pathname)?.key ?? 'beranda';
        return <FloatingTabBar tabs={tabs} activeKey={activeKey} onSelect={(href) => router.navigate(href as Href)} />;
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="riwayat" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
