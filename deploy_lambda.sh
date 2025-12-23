#!/bin/bash
set -e
export AWS_CONFIG_FILE=$(pwd)/aws_config
export AWS_SHARED_CREDENTIALS_FILE=$(pwd)/aws_credentials


echo "Building for production..."
npm run build:prod

echo "Preparing deployment package..."
rm -rf deploy_package
mkdir deploy_package
cp -r dist/* deploy_package/
cp package.server.json deploy_package/package.json
# Copy .env if needed, though usually ENV vars are in Lambda console. 
# But let's verify if the app needs .env file execution time or just process.env.
# The app uses 'dotenv', so it might try to load .env. 
# Ideally, we rely on Lambda env vars.

echo "Installing production dependencies..."
cd deploy_package
npm install --omit=dev
# Remove heavy/unnecessary bits if any? 
# For now, keep it simple.

du -sh .
echo "Zipping..."
zip -r ../deploy.zip .
cd ..

echo "Deploying to AWS Lambda..."
# Assuming function name is assignflow-api based on browser tabs
aws lambda update-function-code --function-name assignflow-api --zip-file fileb://deploy.zip --publish

echo "Deployment complete."
