#!/bin/bash
# create-update-bundle.sh
# Script to create OTA update bundles

set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

echo "📦 Creating update bundle for version ${VERSION}..."

# Build the app
echo "🔨 Building application..."
npm run build:mobile

# Create updates directory if it doesn't exist
mkdir -p updates

# Navigate to build output
cd dist/public

# Create ZIP bundle
echo "📦 Creating ZIP bundle..."
zip -r "../../updates/bundle-${VERSION}.zip" .

cd ../..

# Get bundle size
BUNDLE_SIZE=$(wc -c < "updates/bundle-${VERSION}.zip" | tr -d ' ')
BUNDLE_SIZE_MB=$(echo "scale=2; ${BUNDLE_SIZE} / 1024 / 1024" | bc)

echo "✅ Update bundle created successfully!"
echo "   Version: ${VERSION}"
echo "   Location: updates/bundle-${VERSION}.zip"
echo "   Size: ${BUNDLE_SIZE_MB} MB"
echo ""
echo "📝 Next steps:"
echo "   1. Update release notes in server/routes.ts"
echo "   2. Deploy to Lambda: npm run deploy:lambda"
echo "   3. Users will receive the update on next app launch"
