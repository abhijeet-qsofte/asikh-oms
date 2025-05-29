#!/bin/bash
# Script to deploy backend changes to Heroku

echo "Deploying backend changes to Heroku..."

# Add all changes
git add .

# Commit changes
git commit -m "Fix batch creation and add-crate endpoint"

# Push to Heroku backend
git push heroku-backend main

echo "Backend deployment completed!"
