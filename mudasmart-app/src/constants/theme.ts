// Design system MUDASmart — palet resmi Bagian 4.1 (hijau Muhammadiyah).
export const colors = {
  primary900: '#073D2C',
  primary700: '#0B6E4F',
  primary500: '#16A374',
  primary300: '#6FCBA3',
  primary100: '#E8F5EF',
  primary50: '#F2FAF6',

  background: '#FFFFFF',
  backgroundAlt: '#F7FAF9',
  surfaceMuted: '#EEF4F1',

  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  info: '#2563EB',
  infoBg: '#DBEAFE',

  dark: '#0B1220',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

// Elevasi dideklarasikan sekali: bayangan lembut dengan offset+blur (Android & iOS).
export const shadow = {
  card: {
    shadowColor: '#0B3D2C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: '#0B3D2C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

// Skala tipografi — satu keluarga (system), hierarki dari ukuran+bobot.
export const type = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};

// Pasangan gradien resmi — dipakai hemat (header brand, tombol utama, tombol scan).
export const gradients = {
  brand: ['#073D2C', '#0B6E4F'],
  fresh: ['#0B6E4F', '#16A374'],
  // Solid abu-abu untuk tombol disabled/pending — tanpa transparansi agar tidak "putih pudar".
  disabled: ['#9CA3AF', '#6B7280'],
} as const;
