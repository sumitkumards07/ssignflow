#!/bin/bash

# Configuration
SERVER_IP="13.235.90.150"
USER="ec2-user"
KEY_PATH="$1"

if [ -z "$KEY_PATH" ]; then
    echo "Usage: ./deploy_manual.sh <path-to-your-pem-key>"
    echo "Example: ./deploy_manual.sh ~/Downloads/my-key.pem"
    exit 1
fi

echo "🚀 Starting Manual Deployment to $SERVER_IP..."

ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no $USER@$SERVER_IP << 'ENDSSH'
    # Stop on error
    set -e
    
    echo "📂 Navigating to project..."
    if [ ! -d "ssignflow" ]; then
        echo "❌ Project folder 'ssignflow' not found!"
        exit 1
    fi
    cd ssignflow
    
    echo "⬇️ Pulling latest changes..."
    git fetch origin
    git reset --hard origin/main
    
    echo "📦 Installing Dependencies..."
    npm install --legacy-peer-deps
    
    echo "🏗️ Building..."
    npm run build
    
    echo "🔄 Restarting Server..."
    pm2 restart all || pm2 start dist/index.js --name "assignflow"
    
    echo "✅ Remote Deployment Complete!"
ENDSSH
