#!/bin/bash
set -e

# Unset potentially polluting env vars
unset AWS_REGION
unset AWS_DEFAULT_REGION

echo "Building for production..."
npm run build:prod

echo "Preparing lean deployment package..."
rm -rf deploy_package
mkdir deploy_package
cp -r dist/* deploy_package/
# Copy updates folder if it exists
if [ -d "updates" ]; then
  cp -r updates deploy_package/
fi

# Create a minimal package.json for production server
# Read actual version from main package.json
VERSION=$(node -p "require('./package.json').version")
echo "Deploying version: $VERSION"

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
    "zod-validation-error": "^3.4.0"
  }
}
EOF

echo "Installing lean production dependencies..."
cd deploy_package
npm install

echo "Zipping..."
rm -f ../deploy.zip
zip -r -q ../deploy.zip .
cd ..

echo "Deploying to AWS Lambda (us-east-1)..."
AWS_CONFIG_FILE=aws_config AWS_SHARED_CREDENTIALS_FILE=aws_credentials aws lambda update-function-code --function-name assignflow-api --zip-file fileb://deploy.zip --region us-east-1 --publish

echo "Deployment complete."
