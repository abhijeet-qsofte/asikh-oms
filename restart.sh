#!/bin/bash

# Set colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
  echo -e "\n${BLUE}==== $1 ====${NC}"
}

# Get the project root directory
PROJECT_ROOT="$(pwd)"
MOBILE_DIR="$PROJECT_ROOT/mobile/asikh-oms-mobile"

# Restart backend API
print_header "Restarting Backend API"
echo "Stopping containers..."
docker-compose down
echo "Building and starting containers..."
docker-compose up --build -d
echo -e "${GREEN}Backend API restarted successfully!${NC}"

# Restart mobile app
print_header "Restarting Mobile App"
cd "$MOBILE_DIR"
echo "Clearing Metro bundler cache..."
npx expo start --clear --no-dev --minify &
EXPO_PID=$!

# Wait for Expo to start
echo "Waiting for Expo to start..."
sleep 5

echo -e "${GREEN}Development environment restarted successfully!${NC}"
echo -e "Backend API is running in Docker"
echo -e "Mobile app is running with Expo"
echo -e "\nPress Ctrl+C to stop the Expo server when you're done"

# Keep the script running until user terminates it
wait $EXPO_PID
