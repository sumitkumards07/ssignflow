# AWS App Runner Deployment Configuration

## Quick Start

### 1. Push to GitHub
```bash
git add .
git commit -m "Add AWS deployment configuration"
git push origin main
```

### 2. Deploy via AWS Console

1. **Go to AWS App Runner**: https://console.aws.amazon.com/apprunner
2. **Create Service** → **Source: Container Registry** → **ECR or Source code repository**
3. **Connect GitHub** → Select your `Assignflow` repository
4. **Configure Build**:
   - Runtime: Docker
   - Port: 8080
5. **Configure Service**:
   - Instance role: Create new or use existing
   - Auto-scaling: Min 1, Max 3
6. **Environment Variables** (Add these):
   ```
   DATABASE_URL=<your-neon-db-url>
   SESSION_SECRET=<random-secret>
   GEMINI_API_KEY=<your-gemini-key>
   NODE_ENV=production
   PORT=8080
   ```
7. **Deploy**

### 3. Update Mobile App
After deployment, update `VITE_API_BASE_URL` in your app:
- Get the App Runner URL (e.g., `https://xxx.us-east-1.awsapprunner.com`)
- Update your mobile app's `.env` file

## Estimated Costs
- App Runner: ~$5-15/month for low traffic
- Free tier: 25 compute hours/month for first 12 months
