#!/bin/bash

# Setup script for Android APK build

echo "🚀 Setting up Android build environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the web app
echo "🔨 Building web app..."
npm run build:mobile

# Check if Capacitor is installed
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not available. Please check your Node.js installation."
    exit 1
fi

# Initialize Capacitor if android folder doesn't exist
if [ ! -d "android" ]; then
    echo "📱 Initializing Capacitor..."
    npx cap init --web-dir=dist/public --app-id=com.blackboxai.app --app-name="AssignFlow" --npm-client=npm
    
    echo "🤖 Adding Android platform..."
    npx cap add android
else
    echo "✅ Android platform already exists"
fi

# Sync web assets
echo "🔄 Syncing web assets..."
npx cap sync

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Install Android Studio if you haven't already"
echo "2. Open Android Studio"
echo "3. Open the 'android' folder in Android Studio"
echo "4. Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo ""
echo "Or run: npm run cap:open:android"
echo ""




