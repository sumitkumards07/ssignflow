# APK Installation Instructions

## ⚠️ IMPORTANT - Read Before Installing

### If You Have v1.0.3 or Earlier Installed

**You MUST uninstall the old version first!**

The signing key was updated, so Android won't allow an upgrade. Follow these steps:

#### Step 1: Uninstall Old Version
```
1. Open Settings on your phone
2. Go to Apps → AssignFlow
3. Tap "Uninstall"
4. Confirm
```

**📝 Note**: Your data is backed up automatically to device storage, so you won't lose anything!

---

## 📦 Installing v1.0.4

### Method 1: Direct Install (Recommended)

1. **Enable Unknown Sources** (one-time setup)
   - Settings → Security → Unknown Sources → Enable
   - Or Settings → Apps → Special Access → Install Unknown Apps → Allow for your file manager/browser

2. **Download the APK**
   - File: `assignflow-v1.0.4-INSTALL.apk`
   - Size: 6.9 MB

3. **Install**
   - Tap the downloaded APK file
   - Click "Install"
   - Wait for installation to complete
   - Click "Open"

4. **Login**
   - Your data will automatically restore from backup
   - Or login with your credentials

---

### Method 2: Using ADB (for developers)

```bash
# Uninstall old version
adb uninstall com.assignflow.app

# Install new version
adb install assignflow-v1.0.4-INSTALL.apk

# Or do both in one command
adb install -r assignflow-v1.0.4-INSTALL.apk
```

---

## ❓ Troubleshooting

### "App Not Installed" Error

**Cause**: Old version with different signature is still installed

**Solution**:
1. Uninstall the old version completely
2. Restart your phone
3. Install the new APK

### "Can't Install from Unknown Sources"

**Solution**:
1. Enable unknown sources (see Method 1, step 1)
2. Or use ADB installation (Method 2)

### "Installation Blocked"

**Solution**:
- Some phones (Samsung, Xiaomi) have extra security
- Go to Settings → Security → Install Unknown Apps
- Find your file manager or browser
- Enable "Allow from this source"

### Data Not Restoring

**Solution**:
1. Open the app
2. Go to Settings → Backup & Restore
3. Tap "Restore from Backup"
4. Select the latest backup

---

## ✅ Verification

After installation, verify:
- [ ] App opens without crashing
- [ ] Login works
- [ ] Tasks are visible (if data restored)
- [ ] Database features work (create a task)

---

## 🎉 What's New in v1.0.4

- ✅ Database connectivity fixes
- ✅ **OTA Update System** - future updates install automatically!
- ✅ Improved performance
- ✅ Bug fixes

---

## 📱 After Installation

### Test OTA Updates

Once installed, you can receive instant updates without reinstalling!

**How it works**:
1. Updates check happens 2 seconds after app launch
2. If available, you'll see a beautiful update dialog
3. Click "Update Now" → wait ~10 seconds → app reloads with new features!

**No more APK downloads!** 🎊

---

## Need Help?

If installation fails:
1. Check you've uninstalled the old version
2. Enable unknown sources
3. Try restarting your phone
4. Use ADB method if available

---

**APK Details**:
- Filename: `assignflow-v1.0.4-INSTALL.apk`
- Version: 1.0.4 (build 22)
- Size: 6.9 MB
- Signed: ✅ Yes
- Package: com.assignflow.app
