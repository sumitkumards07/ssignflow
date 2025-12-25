# OTA Update System - Quick Reference

## 🚀 Quick Start

### Push an Update (3 Steps)

```bash
# 1. Make your changes + bump version in package.json
# 2. Create update bundle
npm run create:update

# 3. Deploy to Lambda
bash deploy_lambda_lean.sh
```

Done! Users get the update on next app launch. ✅

---

## 📝 Common Tasks

### Create First Update Bundle
```bash
# Increment version in package.json: 1.0.3 → 1.0.4
npm run create:update
```

### Test Update Locally
```bash
# Start server
npm run dev

# Check update endpoint
curl "http://localhost:5001/api/updates/check?version=1.0.3"
```

### Customize Release Notes
Edit `server/routes.ts` line ~125:
```typescript
releaseNotes: "Your message here"
```

### Force Critical Update
Edit `server/routes.ts` line ~126:
```typescript
critical: true  // Users must update
```

---

## 📁 File Structure

```
assignflow/
├── server/routes.ts              # Update endpoints
├── client/src/
│   ├── lib/UpdateService.ts      # Update logic
│   ├── components/UpdateDialog.tsx # Update UI
│   └── App.tsx                   # Integration
├── scripts/create-update-bundle.sh # Build script
├── updates/
│   └── bundle-1.0.4.zip          # Update bundles
└── package.json                  # Version number
```

---

## ✅ Checklist: Pushing an Update

- [ ] Make code changes
- [ ] Test locally
- [ ] Bump version in `package.json`
- [ ] Run `npm run create:update`
- [ ] Update release notes (optional)
- [ ] Run `bash deploy_lambda_lean.sh`
- [ ] Wait ~2 min for deployment
- [ ] Test on device

---

## 🎯 What Can Be Updated

| Type | OTA? | Requires New APK? |
|------|------|-------------------|
| UI changes | ✅ Yes | ❌ No |
| Bug fixes | ✅ Yes | ❌ No |
| New features (JS) | ✅ Yes | ❌ No |
| Text/styling | ✅ Yes | ❌ No |
| API changes | ✅ Yes | ❌ No |
| New permissions | ❌ No | ✅ Yes |
| App icon/name | ❌ No | ✅ Yes |
| Capacitor plugins | ❌ No | ✅ Yes |

---

## 🐛 Troubleshooting

**Update not showing?**
```bash
# Check version
cat package.json | grep version

# Verify bundle exists
ls -lh updates/bundle-*.zip

# Test endpoint
curl "YOUR_LAMBDA_URL/api/updates/check?version=1.0.3"
```

**Download fails?**
- Check bundle size < 50 MB
- Verify Lambda deployment includes `updates/` folder
- Ensure `VITE_API_BASE_URL` is correct

---

## 💡 Pro Tips

1. **Always test locally first**
2. **Write clear release notes** - users appreciate it
3. **Small bundles** = faster updates
4. **Version format**: MAJOR.MINOR.PATCH (e.g., 1.0.4)
5. **Critical updates** only for security/breaking issues

---

## 📞 Quick Commands

```bash
# Create update
npm run create:update

# Deploy to Lambda
bash deploy_lambda_lean.sh

# Check current version
node -p "require('./package.json').version"

# List all update bundles
ls -lh updates/

# Test update endpoint
curl "http://localhost:5001/api/updates/check?version=1.0.3"
```

---

## 🎉 Success Metrics

After deploying your first update:
- ⏱️ **Time to deploy**: ~5 minutes (vs days for Play Store)
- 💰 **Cost**: $0 (free!)  
- 👥 **User experience**: Seamless auto update
- 🚀 **Update speed**: Instant on app launch

---

> **Remember**: This system is 100% free and uses your existing infrastructure. No third-party services, no subscriptions, full control! 🎯
