#!/bin/bash

# Exit on error
set -e

echo "=== Starting Patch and Build Process ==="

# Step 1: Set up Android SDK environment variables explicitly
echo "Setting up Android SDK environment..."
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/35.0.0

# Step 2: Create local.properties file with SDK path
echo "Creating local.properties file..."
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

# Step 3: Patch the expo-barcode-scanner build.gradle file
echo "Patching expo-barcode-scanner build.gradle..."
cat > node_modules/expo-barcode-scanner/android/build.gradle.patched << EOL
apply plugin: 'com.android.library'

group = 'host.exp.exponent'
version = '13.0.1'

def expoModulesCorePlugin = new File(project(":expo-modules-core").projectDir.absolutePath, "ExpoModulesCorePlugin.gradle")
apply from: expoModulesCorePlugin
applyKotlinExpoModulesCorePlugin()
// Removed problematic method calls
// useCoreDependencies()
// useDefaultAndroidSdkVersions()
// useExpoPublishing()

android {
  namespace "expo.modules.barcodescanner"
  defaultConfig {
    versionCode 26
    versionName "13.0.1"
  }
}

dependencies {
  api 'com.google.mlkit:barcode-scanning:17.1.0'
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.4.3")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.4.1")
}
EOL

mv node_modules/expo-barcode-scanner/android/build.gradle node_modules/expo-barcode-scanner/android/build.gradle.original
mv node_modules/expo-barcode-scanner/android/build.gradle.patched node_modules/expo-barcode-scanner/android/build.gradle

# Step 4: Fix app/build.gradle for Fresco versions
echo "Fixing app/build.gradle for Fresco versions..."
sed -i '' 's/\${reactAndroidLibs.versions.fresco.get()}/2.5.0/g' android/app/build.gradle

# Step 5: Build the APK with Gradle
echo "Building APK with Gradle..."
cd android && ./gradlew assembleDebug --no-daemon

# Step 6: Check if build was successful and copy APK
if [ -f app/build/outputs/apk/debug/app-debug.apk ]; then
  echo "=== Build successful! ==="
  cp app/build/outputs/apk/debug/app-debug.apk ../asikh-oms-debug.apk
  echo "APK built successfully! You can find it at:"
  echo "$(cd .. && pwd)/asikh-oms-debug.apk"
else
  echo "=== Build failed! ==="
  echo "APK build failed. Please check the logs for more details."
fi

# Step 7: Restore the original expo-barcode-scanner build.gradle file
echo "Restoring original expo-barcode-scanner build.gradle..."
mv ../node_modules/expo-barcode-scanner/android/build.gradle.original ../node_modules/expo-barcode-scanner/android/build.gradle

echo "=== Build process completed ==="
