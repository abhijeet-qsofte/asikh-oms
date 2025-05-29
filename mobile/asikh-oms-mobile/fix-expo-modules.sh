#!/bin/bash

# Exit on error
set -e

echo "=== Starting Expo Modules Fix Process ==="

# Step 1: Set up Android SDK environment variables explicitly
echo "Setting up Android SDK environment..."
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/35.0.0

# Step 2: Install specific versions of dependencies that are known to work together
echo "Installing compatible dependencies..."
npm install --legacy-peer-deps expo@~49.0.15 expo-modules-core@~1.5.12 expo-linear-gradient@~12.3.0

# Step 3: Install the expo-module-scripts package which contains the Gradle plugin
echo "Installing expo-module-scripts..."
npm install --legacy-peer-deps expo-module-scripts

# Step 4: Create a plugin repository file for the Expo module Gradle plugin
echo "Creating plugin repository file..."
mkdir -p android/plugin-repos
cat > android/plugin-repos/expo-module-plugin.gradle << EOL
pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
        maven { url "https://maven.pkg.github.com/expo/expo" }
        maven { url "https://jitpack.io" }
    }
    resolutionStrategy {
        eachPlugin {
            if (requested.id.id == 'expo-module-gradle-plugin') {
                useModule('host.exp.exponent:expo-module-gradle-plugin:0.0.1')
            }
        }
    }
}
EOL

# Step 5: Update settings.gradle to include the plugin repository
echo "Updating settings.gradle..."
cat > android/settings.gradle << EOL
apply from: new File(rootDir, "plugin-repos/expo-module-plugin.gradle")

rootProject.name = 'asikh-oms-mobile'

apply from: new File(["node", "--print", "require.resolve('expo/package.json')"].execute(null, rootDir).text.trim(), "../scripts/autolinking.gradle");
useExpoModules()

include ':app'
includeBuild('../node_modules/@react-native/gradle-plugin')
EOL

# Step 6: Generate native code with Expo
echo "Generating native code with Expo..."
npx expo prebuild --clean --platform android

echo "=== Expo Modules Fix Process Completed ==="
echo "Now you can try building the APK with:"
echo "./build-direct-apk.sh"
