// Semua keputusan waktu absen memakai WIB (Asia/Jakarta) — independen dari timezone VPS.
const TZ = 'Asia/Jakarta';

const wibParts = () =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute', string>;

export const todayWib = () => {
  const p = wibParts();
  return `${p.year}-${p.month}-${p.day}`;
};

export const wibMinutes = () => {
  const p = wibParts();
  const hour = p.hour === '24' ? 0 : Number(p.hour);
  return hour * 60 + Number(p.minute);
};

export const hhmmToMinutes = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

// Konversi TTL ("15m", "12h", "30d") → milidetik. Dipakai env token.
export const ttlToMs = (value: string): number => {
  const match = /^(\d+)([mhd])$/.exec(value.trim());
  if (!match) return 0;
  const amount = Number(match[1]);
  const unitMs = { m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 'm' | 'h' | 'd'];
  return amount * unitMs;
};
