#!/bin/bash
export AWS_ACCESS_KEY_ID=AKIARSCWF3MUFZAK6ONC
export AWS_SECRET_ACCESS_KEY=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
export AWS_DEFAULT_REGION=us-east-1
export AWS_CONFIG_FILE="$PWD/aws_config"

BUCKET_NAME="assignflow-deployment-bucket-1766650709"

echo "Uploading zip to S3 ($BUCKET_NAME)..."
/opt/homebrew/bin/aws s3 cp deploy.zip "s3://$BUCKET_NAME/deploy.zip"

echo "Updating Lambda from S3..."
/opt/homebrew/bin/aws lambda update-function-code \
  --function-name assignflow-api \
  --s3-bucket "$BUCKET_NAME" \
  --s3-key deploy.zip \
  --region us-east-1 \
  --publish

echo "Updating Handler to shim.handler..."
/opt/homebrew/bin/aws lambda update-function-configuration \
  --function-name assignflow-api \
  --handler shim.handler \
  --region us-east-1
