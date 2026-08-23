# ======================================================
# MUDASmart — proguard-rules.pro (Android Release)
# CATATAN: paket & versi Expo/RN berubah cepat. WAJIB uji
# build release di device fisik sebelum rilis — perhatikan
# Logcat untuk ClassNotFoundException / NoSuchMethodError.
# ======================================================

# ---- React Native core & New Architecture (TurboModules/JNI) ----
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**

# ---- Native method bridge — jangan pernah dihapus ----
-keepclasseswithmembernames class * {
    native <methods>;
}

# ---- Expo core & modules ----
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# ---- Dependensi expo-router (reanimated, gesture-handler, screens) ----
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-dontwarn com.swmansion.**

# ---- expo-camera (scan QR — fitur inti aplikasi) ----
-keep class expo.modules.camera.** { *; }
-dontwarn expo.modules.camera.**

# ---- expo-secure-store (penyimpanan token) ----
-keep class expo.modules.securestore.** { *; }

# ---- expo-location (geofence) ----
-keep class expo.modules.location.** { *; }

# ---- react-native-svg (dipakai react-native-qrcode-svg) ----
-keep class com.horcrux.svg.** { *; }

# ---- OkHttp (di bawah fetch) ----
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# ---- Metadata wajib (reflection & stack trace) ----
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes SourceFile,LineNumberTable

# ---- Hindari build gagal karena warning pihak ketiga ----
-dontwarn com.google.android.gms.**
-dontwarn org.jetbrains.annotations.**

# JANGAN tambahkan blanket keep untuk kode aplikasi sendiri —
# itu mematikan obfuscation dan menggagalkan tujuan minify.
