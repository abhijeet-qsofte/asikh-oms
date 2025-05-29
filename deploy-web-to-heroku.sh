#!/bin/bash

# Script to deploy the web-app subtree to Heroku
# Usage: ./deploy-web-to-heroku.sh [heroku_app_name] [force]
# Example: ./deploy-web-to-heroku.sh asikh-oms-web force

# Default Heroku app name
HEROKU_APP=${1:-"asikh-oms-web"}
FORCE_PUSH=${2:-"no"}

echo "Deploying web-app subtree to Heroku app: $HEROKU_APP"

# Check if the Heroku remote exists
if ! git remote | grep -q "heroku-web"; then
  echo "Adding heroku-web remote..."
  git remote add heroku-web https://git.heroku.com/$HEROKU_APP.git
else
  echo "Heroku remote already exists, updating URL..."
  git remote set-url heroku-web https://git.heroku.com/$HEROKU_APP.git
fi

# Fetch from Heroku to see if there are any changes
echo "Fetching from Heroku..."
git fetch heroku-web || echo "Could not fetch from Heroku, continuing anyway..."

# Try to deploy the web-app subtree to Heroku
echo "Pushing web-app subtree to Heroku..."

if [ "$FORCE_PUSH" = "force" ]; then
  echo "Force pushing to Heroku (this will overwrite remote changes)..."
  # Create a temporary branch for the subtree
  TEMP_BRANCH="temp-deploy-$(date +%s)"
  git subtree split --prefix web-app -b $TEMP_BRANCH
  
  # Force push the temporary branch to Heroku
  git push -f heroku-web $TEMP_BRANCH:main
  
  # Clean up the temporary branch
  git branch -D $TEMP_BRANCH
else
  # Try normal subtree push first
  if git subtree push --prefix web-app heroku-web main; then
    echo "Deployment completed successfully!"
  else
    echo ""
    echo "ERROR: Failed to push to Heroku."
    echo "This could be because the remote repository has changes that are not in your local repository."
    echo ""
    echo "Options:"
    echo "1. Run with force option: ./deploy-web-to-heroku.sh $HEROKU_APP force"
    echo "   (This will overwrite any remote changes)"
    echo ""
    echo "2. Try to merge remote changes first:"
    echo "   git fetch heroku-web"
    echo "   git merge heroku-web/main"
    echo "   Then run this script again."
    echo ""
    exit 1
  fi
fi

echo "Deployment completed!"
