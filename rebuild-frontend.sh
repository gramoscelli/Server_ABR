#!/bin/bash

# Script to rebuild and restart the frontend container
# This is needed when frontend code changes are made

echo "🛑 Stopping frontend container..."
docker compose stop frontend

echo "🏗️  Rebuilding frontend image..."
docker compose build frontend

echo "🚀 Starting frontend container..."
docker compose up -d frontend

echo "✅ Done! Checking frontend status..."
docker compose ps frontend

echo ""
echo "📝 Frontend should now be running with the latest code."
echo "   Visit http://localhost:3001 to access the application."
