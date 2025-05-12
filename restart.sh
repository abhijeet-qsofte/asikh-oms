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

# Check if we're on macOS
if [[ "$(uname)" != "Darwin" ]]; then
  echo "This script requires macOS to open separate terminal windows."
  exit 1
 fi

# Stop existing Docker containers
print_header "Stopping existing Docker containers"
docker-compose down

# Open a new terminal window for backend
print_header "Starting Backend API in a new terminal"
osascript -e 'tell application "Terminal"
    do script "cd '"$PROJECT_ROOT"' && echo \"==== Starting Backend API ====\" && docker-compose up --build"
end tell'

# Wait a moment for backend to start initializing
sleep 2

# Open a new terminal window for frontend
print_header "Starting Mobile App in a new terminal"
osascript -e 'tell application "Terminal"
    do script "cd '"$MOBILE_DIR"' && echo \"==== Starting Mobile App ====\" && npx expo start --clear"
end tell'

echo -e "${GREEN}Development environment restart initiated!${NC}"
echo -e "Backend API is running in a separate terminal window"
echo -e "Mobile app is running in a separate terminal window"
echo -e "\nCheck the terminal windows for logs and errors"
