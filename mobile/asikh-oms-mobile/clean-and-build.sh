#!/bin/bash

# Exit on error
set -e

echo "=== Starting Clean and Build Process ==="

# Step 1: Clean npm cache and node_modules
echo "Cleaning npm cache and node_modules..."
npm cache clean --force
rm -rf node_modules
rm -rf package-lock.json

# Step 2: Reinstall dependencies
echo "Reinstalling dependencies..."
npm install --legacy-peer-deps

# Step 3: Install EAS CLI if not already installed
echo "Ensuring EAS CLI is installed..."
npm install -g eas-cli

# Step 4: Update eas.json to ensure it has the right configuration
echo "Updating eas.json configuration..."
cat > eas.json << EOL
{
  "cli": {
    "version": ">= 0.60.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "local-apk": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "image": "latest",
        "withoutCredentials": true
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://asikh-oms-test-cd0577c5c937.herokuapp.com"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://asikh-oms-prod.herokuapp.com"
      }
    },
    "production-apk": {
      "distribution": "store",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://asikh-oms-prod.herokuapp.com"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
EOL

# Step 5: Run EAS Build locally with NODE_ENV set
echo "Building APK locally with EAS Build..."
export NODE_ENV=production
eas build --platform android --profile local-apk --local --non-interactive

echo "=== Build process completed ==="
