#!/bin/bash
set -e

# Unset potentially polluting env vars
unset AWS_REGION
unset AWS_DEFAULT_REGION

echo "Building for production..."
npm run build:prod

# Read actual version from main package.json
VERSION=$(node -p "require('./package.json').version")
echo "Deploying version: $VERSION"

echo "Preparing lean deployment package..."
rm -rf deploy_package
mkdir deploy_package
cp dist/index.cjs deploy_package/
cp -r dist/public deploy_package/
mkdir -p deploy_package/updates
if [ -f "updates/bundle-${VERSION}.zip" ]; then
    cp "updates/bundle-${VERSION}.zip" deploy_package/updates/
    echo "Included OTA bundle: bundle-${VERSION}.zip"
else
    echo "WARNING: No OTA bundle found for ${VERSION}"
fi

# Create a minimal package.json for production server

cat > deploy_package/package.json <<EOF
{
  "name": "assignflow-server",
  "version": "$VERSION",
  "type": "module",
  "engines": { "node": ">=18.0.0" },
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "express": "^4.21.2",
    "express-session": "^1.18.2",
    "connect-pg-simple": "^10.0.0",
    "pg": "^8.16.3",
    "drizzle-orm": "^0.39.1",
    "multer": "^2.0.2",
    "serverless-http": "^4.0.0",
    "dotenv": "^17.2.3",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "zod": "^3.25.76",
    "drizzle-zod": "^0.7.0",
    "openai": "^4.0.0",
    "pdf-parse": "^2.4.5",
    "ws": "^8.18.0",
    "zod-validation-error": "^3.4.0",
    "stripe": "^14.14.0"
  }
}
EOF

echo "Installing production dependencies..."
cd deploy_package
npm install --omit=dev
# Remove heavy dev artifacts if any
rm -rf node_modules/.bin node_modules/@types
# Clean up large unused files in node_modules to save space
find node_modules -name "*.d.ts" -delete
find node_modules -name "*.map" -delete
find node_modules -name "*.md" -delete
find node_modules -name "test" -type d -exec rm -rf {} +
find node_modules -name "tests" -type d -exec rm -rf {} +
find node_modules -name "docs" -type d -exec rm -rf {} +
find node_modules -name "example" -type d -exec rm -rf {} +
find node_modules -name "examples" -type d -exec rm -rf {} +
find node_modules -name "*.ts" -delete
find node_modules -name "LICENSE" -delete
find node_modules -name "CHANGELOG" -delete
# Specific cleanups for known large packages
rm -rf node_modules/pdfjs-dist/build/pdf.worker.js
rm -rf node_modules/pdfjs-dist/cmaps
rm -rf node_modules/pdfjs-dist/standard_fonts
rm -rf node_modules/@google-cloud/firestore/build/protos
# Specifically remove heavy parts of @google/generative-ai / google-gax if present (can trigger size limit)
cd ..

# Copy shim
cp shim.mjs deploy_package/shim.mjs

echo "Zipping..."
rm -f deploy.zip
cd deploy_package
zip -r -q ../deploy.zip .
cd ..

echo "Deploying to AWS Lambda (us-east-1)..."
AWS_CONFIG_FILE="$PWD/aws_config" AWS_SHARED_CREDENTIALS_FILE="$PWD/aws_credentials" aws lambda update-function-code --function-name assignflow-api --zip-file fileb://deploy.zip --region us-east-1 --publish

echo "Deployment complete."
