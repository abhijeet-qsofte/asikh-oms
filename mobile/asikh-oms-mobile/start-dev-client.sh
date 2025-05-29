#!/bin/bash

# Exit on error
set -e

echo "=== Starting Expo Development Client ==="

# Step 1: Install dependencies with legacy-peer-deps
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Step 2: Start the Expo development client
echo "Starting Expo development client..."
npx expo start --dev-client

echo "=== Expo Development Client Started ==="
echo "Scan the QR code with the Expo Go app to test your batch reconciliation flow."
