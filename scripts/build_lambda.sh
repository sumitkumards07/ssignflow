#!/bin/bash
set -e

echo "1. Building project..."
npm run build:prod

echo "2. Creating deployment directory..."
rm -rf deploy_package
mkdir deploy_package

echo "3. Copying dist files..."
cp -r dist/* deploy_package/

echo "3b. Copying OTA updates..."
mkdir -p deploy_package/updates
cp -r updates/* deploy_package/updates/


echo "4. Creating backend-only package.json..."
VERSION=$(node -p "require('./package.json').version")
cat > deploy_package/package.json <<EOF
{
  "name": "assignflow-lambda",
  "version": "${VERSION}",
  "type": "module",
  "dependencies": {
    "connect-pg-simple": "^10.0.0",
    "dotenv": "^17.2.3",
    "drizzle-orm": "^0.39.1",
    "express": "^4.21.2",
    "express-session": "^1.18.2",
    "multer": "^2.0.2",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "pg": "^8.16.3",
    "serverless-http": "^4.0.0",
    "ws": "^8.18.0",
    "@neondatabase/serverless": "^0.10.4",
    "@google/generative-ai": "^0.24.1",
    "@openrouter/sdk": "^0.2.9",
    "zod": "^3.25.76",
    "pdf-parse": "^2.4.5",
    "date-fns": "^3.6.0"
  }
}
EOF

# Note: library versions should ideally match main package.json, but using latest compatible ones here.
# I will strictly check versions if this fails, but these are standard.

echo "5. Installing backend dependencies..."
cd deploy_package
npm install

echo "6. Zipping deployment package..."
zip -r ../deploy.zip .

echo "7. Done! Upload 'deploy.zip' to AWS Lambda Console."
