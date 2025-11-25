# Android APK Build Instructions

## Prerequisites

1. **Install Android Studio** and Android SDK
2. **Install Java JDK 11+**
3. **Set ANDROID_HOME** environment variable
4. **Install Capacitor CLI**: `npm install -g @capacitor/cli`

## Option 1: Using Capacitor (Recommended for Web-based Android app)

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialize Capacitor (if not already done)
npx cap init

# Add Android platform
npx cap add android

# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Build APK
cd android
./gradlew assembleRelease

# APK will be in: android/app/build/outputs/apk/release/app-release.apk
```

## Option 2: Using Tauri (Desktop only - no Android support)

Tauri currently only supports desktop platforms (Windows, macOS, Linux).
For Android, use Capacitor instead.

## Option 3: Manual Build

1. Build web assets: `npm run build`
2. Copy `dist/` to Android project's `assets/` folder
3. Build with Android Studio or Gradle

## Environment Variables

Set these in your `.env` file or environment:

```bash
ANDROID_HOME=/path/to/android/sdk
JAVA_HOME=/path/to/java
```

## Build Scripts

- `npm run build:android` - Full build (web + APK)
- `npm run build:android:apk` - Build APK only (requires existing Android project)
- `npm run build:android:setup` - Initial setup (add Capacitor, sync)

## Notes

- First build may take 10-15 minutes (downloads dependencies)
- Ensure Android SDK API level 33+ is installed
- Sign the APK for production release
