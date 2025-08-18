#!/usr/bin/env bash
# Build script for Render.com

set -o errexit  # exit on error

echo "🚀 Building Portfolio Investment Platform for Render..."

# Navigate to backend directory
cd backend

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Build completed successfully!"
echo "🎯 Ready for Render deployment!"
