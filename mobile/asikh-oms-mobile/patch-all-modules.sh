#!/bin/bash

# Exit on error
set -e

echo "=== Starting Comprehensive Patch and Build Process ==="

# Step 1: Set up Android SDK environment variables explicitly
echo "Setting up Android SDK environment..."
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/35.0.0

# Step 2: Create local.properties file with SDK path
echo "Creating local.properties file..."
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

# Function to patch a module's build.gradle file
patch_module() {
  local module_name=$1
  local module_path="node_modules/$module_name/android/build.gradle"
  
  if [ -f "$module_path" ]; then
    echo "Patching $module_name build.gradle..."
    cat > "${module_path}.patched" << EOL
apply plugin: 'com.android.library'

group = 'host.exp.exponent'
version = '13.0.1'

def expoModulesCorePlugin = new File(project(":expo-modules-core").projectDir.absolutePath, "ExpoModulesCorePlugin.gradle")
apply from: expoModulesCorePlugin
applyKotlinExpoModulesCorePlugin()

android {
  namespace "expo.modules.${module_name.replace('expo-', '')}"
  compileSdkVersion 34
  defaultConfig {
    minSdkVersion 24
    targetSdkVersion 34
  }
}

dependencies {
  implementation project(':expo-modules-core')
  implementation "org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.8.22"
}
EOL

    mv "$module_path" "${module_path}.original"
    mv "${module_path}.patched" "$module_path"
    echo "Successfully patched $module_name"
  else
    echo "Module $module_name not found, skipping..."
  fi
}

# Step 3: Patch all required modules
echo "Patching all required modules..."
patch_module "expo-barcode-scanner"
patch_module "expo-camera"
patch_module "expo-linear-gradient"
patch_module "expo-image-picker"
patch_module "expo"

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

# Step 7: Restore the original build.gradle files
echo "Restoring original build.gradle files..."
for module in "expo-barcode-scanner" "expo-camera" "expo-linear-gradient" "expo-image-picker" "expo"; do
  module_path="../node_modules/$module/android/build.gradle"
  if [ -f "${module_path}.original" ]; then
    mv "${module_path}.original" "$module_path"
  fi
done

echo "=== Build process completed ==="
