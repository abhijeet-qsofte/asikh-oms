#!/bin/bash

# Exit on error
set -e

echo "=== Starting Local Build with Dependency Fixing ==="

# Step 1: Clean up previous builds
echo "Cleaning previous builds..."
rm -rf android/app/build

# Step 2: Set up Android SDK environment variables explicitly
echo "Setting up Android SDK environment..."
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/35.0.0

# Step 3: Create local.properties file with SDK path
echo "Creating local.properties file..."
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

# Step 4: Install dependencies with legacy-peer-deps
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Step 5: Fix webpack config version
echo "Fixing webpack config version..."
npm install @expo/webpack-config@^18.0.1 --legacy-peer-deps

# Step 6: Generate native code with Expo
echo "Generating native code with Expo..."
npx expo prebuild --clean --platform android

# Step 7: Fix app/build.gradle for Fresco versions
echo "Fixing app/build.gradle for Fresco versions..."
sed -i '' 's/\${reactAndroidLibs.versions.fresco.get()}/2.5.0/g' android/app/build.gradle

# Step 8: Fix settings.gradle
echo "Fixing settings.gradle..."
cat > android/settings.gradle << EOL
rootProject.name = 'asikh-oms-mobile'

apply from: new File(["node", "--print", "require.resolve('expo/package.json')"].execute(null, rootDir).text.trim(), "../scripts/autolinking.gradle");
useExpoModules()

include ':app'

includeBuild('../node_modules/@react-native/gradle-plugin')
EOL

# Step 9: Build the APK directly with Gradle
echo "Building APK with Gradle..."
cd android && ./gradlew assembleDebug --no-daemon --info

# Step 10: Check if build was successful and copy APK
if [ -f app/build/outputs/apk/debug/app-debug.apk ]; then
  echo "=== Build successful! ==="
  cp app/build/outputs/apk/debug/app-debug.apk ../asikh-oms-debug.apk
  echo "APK built successfully! You can find it at:"
  echo "$(cd .. && pwd)/asikh-oms-debug.apk"
else
  echo "=== Build failed! ==="
  echo "APK build failed. Please check the logs for more details."
fi

echo "=== Build process completed ==="
