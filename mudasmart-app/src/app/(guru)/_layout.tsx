import { Tabs, usePathname, router, type Href } from 'expo-router';
import { FloatingTabBar, type TabItem } from '../../components/floating-tab-bar';

const tabs: TabItem[] = [
  { key: 'beranda', label: 'Beranda', icon: 'home-outline', href: '/(guru)' },
  { key: 'rekap', label: 'Rekap', icon: 'stats-chart-outline', href: '/(guru)/rekap' },
  { key: 'murid', label: 'Murid', icon: 'people-outline', href: '/(guru)/murid' },
  { key: 'profil', label: 'Profil', icon: 'person-outline', href: '/(guru)/profil' },
];

// Pathname nyata tanpa group: '/(guru)' → '/guru'.
const toPath = (href: string) => href.replace('/(guru)', '/guru');

export default function GuruLayout() {
  const pathname = usePathname();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => {
        // /guru/murid/<id> tetap menyorot tab Murid.
        const activeKey =
          tabs.find((tab) => pathname === toPath(tab.href))?.key ??
          tabs.find((tab) => pathname.startsWith(`${toPath(tab.href)}/`))?.key ??
          'beranda';
        return <FloatingTabBar tabs={tabs} activeKey={activeKey} onSelect={(href) => router.navigate(href as Href)} />;
      }}
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
