# Building Android APK

This guide will help you build an Android APK from this web application using Capacitor.

## Prerequisites

1. **Node.js** (v18 or higher) - Already installed
2. **Java JDK** (version 17 or higher) - Required for Android builds
3. **Android Studio** - Required for Android SDK and build tools
4. **Android SDK** - Installed via Android Studio

## Step 1: Install Dependencies

```bash
npm install
```

This will install Capacitor and all required dependencies.

## Step 2: Build the Web App

```bash
npm run build:mobile
```

This builds the React app and outputs it to `dist/public`.

## Step 3: Initialize Capacitor (First Time Only)

If this is the first time setting up Capacitor:

```bash
npx cap init
```

When prompted:
- **App name**: AssignFlow (or your preferred name)
- **App ID**: com.blackboxai.app (or your preferred package name)
- **Web dir**: dist/public

## Step 4: Add Android Platform

```bash
npx cap add android
```

This creates the `android` folder with the Android project.

## Step 5: Sync Web Assets

```bash
npx cap sync
```

This copies the built web app to the Android project.

## Step 6: Build APK

You have two options:

### Option A: Build using Android Studio (Recommended)

1. Open Android Studio
2. Open the `android` folder in Android Studio
3. Wait for Gradle sync to complete
4. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
5. Wait for the build to complete
6. The APK will be located at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option B: Build using Command Line

```bash
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Quick Build Script

You can use the provided npm script to build and open in Android Studio:

```bash
npm run cap:build:android
```

This will:
1. Build the web app
2. Sync with Capacitor
3. Open Android Studio

## Important Notes

- **Debug APK**: The default build creates a debug APK that can be installed on any device
- **Release APK**: For production, you'll need to create a signed release APK (requires a keystore)
- **API Endpoints**: If your app makes API calls, you may need to update the API base URL to point to your production server
- **Permissions**: Check `android/app/src/main/AndroidManifest.xml` for required permissions

## Troubleshooting

### "Command not found: cap"
Run: `npx cap` instead of `cap`

### "Android SDK not found"
- Install Android Studio
- Open Android Studio and go to **Tools > SDK Manager**
- Install Android SDK and build tools

### "Java not found"
- Install Java JDK 17 or higher
- Set JAVA_HOME environment variable

### Build Errors
- Make sure you've run `npm run build:mobile` first
- Ensure all dependencies are installed: `npm install`
- Try cleaning the Android build: `cd android && ./gradlew clean`

## Next Steps

After building your first APK:
1. Test it on an Android device or emulator
2. Configure app icon and splash screen in `android/app/src/main/res/`
3. Update app metadata in `android/app/build.gradle`
4. For production, create a signed release APK




