#!/bin/bash
set -e

# Unset potentially polluting env vars
unset AWS_REGION
unset AWS_DEFAULT_REGION

echo "Deploying to AWS Lambda (retry)..."
# Explicitly set region
aws lambda update-function-code --function-name assignflow-api --zip-file fileb://deploy.zip --region us-east-1 

echo "Deployment complete."
