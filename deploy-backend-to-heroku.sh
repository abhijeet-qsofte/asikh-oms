#!/bin/bash

# Script to deploy the backend subtree to Heroku
# Usage: ./deploy-backend-to-heroku.sh [heroku_app_name] [force]
# Example: ./deploy-backend-to-heroku.sh asikh-oms-test force

# Default Heroku app name
HEROKU_APP=${1:-"asikh-oms-test"}
FORCE_PUSH=${2:-"no"}

echo "Deploying backend subtree to Heroku app: $HEROKU_APP"

# Check if the Heroku remote exists
if ! git remote | grep -q "heroku-backend"; then
  echo "Adding heroku-backend remote..."
  git remote add heroku-backend https://git.heroku.com/$HEROKU_APP.git
else
  echo "Heroku remote already exists, updating URL..."
  git remote set-url heroku-backend https://git.heroku.com/$HEROKU_APP.git
fi

# Fetch from Heroku to see if there are any changes
echo "Fetching from Heroku..."
git fetch heroku-backend || echo "Could not fetch from Heroku, continuing anyway..."

# Try to deploy the backend subtree to Heroku
echo "Pushing backend subtree to Heroku..."

if [ "$FORCE_PUSH" = "force" ]; then
  echo "Force pushing to Heroku (this will overwrite remote changes)..."
  # Create a temporary branch for the subtree
  TEMP_BRANCH="temp-deploy-$(date +%s)"
  git subtree split --prefix backend -b $TEMP_BRANCH
  
  # Force push the temporary branch to Heroku
  git push -f heroku-backend $TEMP_BRANCH:main
  
  # Clean up the temporary branch
  git branch -D $TEMP_BRANCH
else
  # Try normal subtree push first
  if git subtree push --prefix backend heroku-backend main; then
    echo "Deployment completed successfully!"
  else
    echo ""
    echo "ERROR: Failed to push to Heroku."
    echo "This could be because the remote repository has changes that are not in your local repository."
    echo ""
    echo "Options:"
    echo "1. Run with force option: ./deploy-backend-to-heroku.sh $HEROKU_APP force"
    echo "   (This will overwrite any remote changes)"
    echo ""
    echo "2. Try to merge remote changes first:"
    echo "   git fetch heroku-backend"
    echo "   git merge heroku-backend/main"
    echo "   Then run this script again."
    echo ""
    exit 1
  fi
fi

# Check if the deployment was successful
if [ $? -eq 0 ]; then
  echo "Deployment completed successfully!"
  
  # Wait a moment for the app to restart
  echo "Waiting for app to restart..."
  sleep 5
  
  # Show recent logs
  echo "Recent logs from $HEROKU_APP:"
  heroku logs --tail --app $HEROKU_APP --num 20
else
  echo "Deployment failed!"
  exit 1
fi

echo "Deployment process completed!"
