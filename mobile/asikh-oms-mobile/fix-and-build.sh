#!/bin/bash

# Exit on error
set -e

echo "=== Starting APK build process ==="
echo "Cleaning project..."
rm -rf android/app/build

echo "Installing dependencies with legacy-peer-deps..."
npm install --legacy-peer-deps

echo "Generating native code with Expo..."
npx expo prebuild --clean

echo "Fixing Gradle configuration..."

# Create the missing plugin repository file
cat > android/settings.gradle.plugins << EOL
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
        maven { url "https://maven.pkg.github.com/expo/expo" }
    }
}
EOL

# Update settings.gradle to include the plugin management
sed -i '' '1s/^/apply from: "settings.gradle.plugins"\n\n/' android/settings.gradle

# Fix the linear-gradient build.gradle file
cat > android/build.gradle.temp << EOL
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
    ext {
        buildToolsVersion = findProperty('android.buildToolsVersion') ?: '35.0.0'
        minSdkVersion = Integer.parseInt(findProperty('android.minSdkVersion') ?: '24')
        compileSdkVersion = Integer.parseInt(findProperty('android.compileSdkVersion') ?: '35')
        targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '34')
        kotlinVersion = findProperty('android.kotlinVersion') ?: '1.9.25'
        ndkVersion = "26.1.10909125"
    }
    repositories {
        google()
        mavenCentral()
        maven { url "https://maven.pkg.github.com/expo/expo" }
    }
    dependencies {
        classpath('com.android.tools.build:gradle')
        classpath('com.facebook.react:react-native-gradle-plugin')
        classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
    }
}

apply plugin: "com.facebook.react.rootproject"

allprojects {
    repositories {
        maven {
            // All of React Native (JS, Obj-C sources, Android binaries) is installed from npm
            url(new File(['node', '--print', "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim(), '../android'))
        }
        maven {
            // Android JSC is installed from npm
            url(new File(['node', '--print', "require.resolve('jsc-android/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim(), '../dist'))
        }

        google()
        mavenCentral()
        maven { url 'https://www.jitpack.io' }
        maven { url "https://maven.pkg.github.com/expo/expo" }
    }
}
EOL

mv android/build.gradle.temp android/build.gradle

# Create a custom fix for the linear gradient module
mkdir -p android/app/src/main/java/expo/modules/lineargradient
cat > android/app/src/main/java/expo/modules/lineargradient/LinearGradientModule.java << EOL
package expo.modules.lineargradient;

import android.content.Context;
import expo.modules.core.ExportedModule;

public class LinearGradientModule extends ExportedModule {
    public LinearGradientModule(Context context) {
        super(context);
    }

    @Override
    public String getName() {
        return "ExpoLinearGradient";
    }
}
EOL

echo "Building APK..."
cd android && ./gradlew assembleDebug --stacktrace

if [ -f app/build/outputs/apk/debug/app-debug.apk ]; then
    echo "=== Build successful! ==="
    echo "APK built successfully! You can find it at:"
    echo "$(pwd)/app/build/outputs/apk/debug/app-debug.apk"
else
    echo "=== Build failed! ==="
    echo "APK build failed. Please check the logs for more details."
fi
