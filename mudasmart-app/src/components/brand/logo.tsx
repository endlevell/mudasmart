import { useId } from 'react';
import Svg, { Circle, Defs, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '../../constants/theme';

type Variant = 'color' | 'light' | 'dark';

const SPARKLE = 'M0 -15 Q3.2 -3.2 15 0 Q3.2 3.2 0 15 Q-3.2 3.2 -15 0 Q-3.2 -3.2 0 -15 Z';

interface MudasmartLogoProps {
  size?: number;
  /** color = palet penuh; light = putih (latar gelap); dark = satu warna gelap */
  variant?: Variant;
}

// Brand mark "Crescent Scan" — sabin + bingkai pemindai + kilau.
// Digambar dengan react-native-svg agar tajam di semua ukuran.
export function MudasmartLogo({ size = 48, variant = 'color' }: MudasmartLogoProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `grad-${uid}`;
  const maskId = `cut-${uid}`;

  const frame = variant === 'light' ? '#FFFFFF' : variant === 'dark' ? colors.primary900 : colors.primary700;
  const crescent = variant === 'light' ? '#FFFFFF' : variant === 'dark' ? colors.primary900 : `url(#${gradId})`;
  const sparkle = variant === 'light' ? colors.primary300 : variant === 'dark' ? colors.primary900 : colors.primary500;

  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary500} />
          <Stop offset="1" stopColor={colors.primary700} />
        </LinearGradient>
        <Mask id={maskId}>
          <Rect width={240} height={240} fill="white" />
          <Circle cx={141} cy={105} r={39} fill="black" />
        </Mask>
      </Defs>

      {/* Bingkai pemindai */}
      <Path
        d="M91 57 H71 Q57 57 57 71 V91"
        stroke={frame}
        strokeWidth={13}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M149 57 H169 Q183 57 183 71 V91"
        stroke={frame}
        strokeWidth={13}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M183 149 V169 Q183 183 169 183 H149"
        stroke={frame}
        strokeWidth={13}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M91 183 H71 Q57 183 57 169 V149"
        stroke={frame}
        strokeWidth={13}
        strokeLinecap="round"
        fill="none"
      />

      {/* Sabin */}
      <Circle cx={120} cy={123} r={47} fill={crescent} mask={`url(#${maskId})`} />

      {/* Kilau */}
      <Path d={SPARKLE} transform="translate(148 97) scale(0.85)" fill={sparkle} />
    </Svg>
  );
}
