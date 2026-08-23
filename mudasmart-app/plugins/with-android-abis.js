const { withGradleProperties } = require('expo/config-plugins');

// HP fisik hanya menjalankan ARM — ABI x86/x86_64 murni untuk emulator dan
// menyumbang porsi terbesar ukuran APK universal (native libs ×4).
// Dengan membatasi ke dua ABI ARM, APK turun dari ~100MB ke ~40-an MB.
const ABIS = ['arm64-v8a', 'armeabi-v7a'];

module.exports = function withAndroidAbis(config) {
  return withGradleProperties(config, (modConfig) => {
    const key = 'reactNativeArchitectures';
    const value = ABIS.join(',');
    const existing = modConfig.modResults.find((item) => item.type === 'property' && item.key === key);
    if (existing) {
      existing.value = value;
    } else {
      modConfig.modResults.push({ type: 'property', key, value });
    }
    return modConfig;
  });
};
