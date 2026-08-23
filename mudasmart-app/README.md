# mudasmart-app

Mobile Expo Router (SDK 55) untuk MUDASmart. Lihat README root.

```bash
bun install --linker hoisted   # wajib hoisted
cp .env.example .env           # EXPO_PUBLIC_API_URL menunjuk ke API
bun run start                  # Expo Go SDK 55
bun run lint
```

Build release: `eas build -p android --profile production` (aab) atau `--profile preview` (apk uji). R8/ProGuard aktif via `expo-build-properties`; aturan di `proguard-rules.pro`. Uji device fisik sebelum rilis.
