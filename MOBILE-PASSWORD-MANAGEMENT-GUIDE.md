# Mobile Password Management Features - User Guide

## Overview
The mobile app now supports two password management features:
1. **Forgot Password** - Reset password via email link
2. **Change Password** - Change password while logged in

Both features work seamlessly with intelligent deep-linking that detects whether the reset request originated from the mobile app or web browser.

## Feature 1: Forgot Password

### For End Users

1. **Open the app and go to the login screen**
2. **Tap "Forgot your password?"** below the login button
3. **Enter your email address** and tap "Send Reset Link"
4. **Check your email** for a password reset link
5. **Tap the link** in the email - it will open in the mobile app (or web browser depending on your device)
6. **Enter a new password** (minimum 6 characters) and confirm it
7. **Tap "Reset Password"** to complete

### Technical Details

**Mobile App Flow:**
```
Login Screen → "Forgot password?" link 
  → Forgot Password Screen (email input)
  → Backend: POST /api/request_reset_password?email=user@example.com&origin=mobile
  → Backend detects mobile origin and generates mobile deep-link
  → Email sent with link: trackeats://reset_password?token=ABC123...
  → User taps link in email
  → Reset Password Screen automatically opens with token
  → User enters new password
  → Backend: POST /api/reset_password?token=ABC123...&password=newpass
  → Login Screen (user can now log in with new password)
```

**Web App Flow (comparison):**
```
Email contains link: https://trackeats.app/reset_password?token=ABC123...
→ Opens in web browser
→ Web app handles reset
```

### Configuration

The backend automatically detects whether to send a mobile or web link based on:
1. Explicit `origin=mobile` parameter (sent by mobile app)
2. User-Agent header detection (auto-detects Expo/React Native)
3. Environment variables as fallback:
   - `MOBILE_DEEP_LINK_BASE_URL` - Mobile deep-link prefix (e.g., `trackeats://`)
   - `FRONTEND_BASE_URL` - Web URL (e.g., `https://trackeats.app`)

## Feature 2: Change Password

### For End Users

1. **Make sure you're logged in** - you should be on the home screen
2. **Tap "Change Password"** (green button below the title)
3. **Enter your current password** (for verification)
4. **Enter your new password** (minimum 6 characters)
5. **Confirm the new password** (must match the new password field)
6. **Tap "Change Password"**
7. **Success message** appears - you're still logged in and can continue using the app

### Technical Details

**Change Password Flow:**
```
Home Screen → "Change Password" button
  → Change Password Screen (3 fields: current, new, confirm)
  → User enters passwords
  → Backend: POST /api/change_password?old_password=current&new_password=new
  → Request includes JWT token in Authorization header
  → Backend verifies current password
  → Backend sets new password
  → Success message
  → Return to Home Screen
```

## Deep-Linking: How It Works

The mobile app can receive password reset links from emails in two ways:

### Method 1: Custom Deep-Link Scheme (Recommended)
**URL Format:** `trackeats://reset_password?token=TOKEN`

- Android: Automatically opens the mobile app
- iOS: Automatically opens the mobile app
- Handled by the app's deep-link interceptor

### Method 2: Web URL with App Association
**URL Format:** `https://trackeats.app/reset_password?token=TOKEN`

- Android: Can open in the app if the domain is configured (Universal Links)
- iOS: Can open in the app if the domain is configured (Deep Linking)
- Falls back to opening in a web browser if app association not configured

## API Endpoints (For Developers)

### Request Password Reset
```
POST /api/request_reset_password
Query Parameters:
  - email (required): User's email address
  - origin (optional): 'mobile' or 'web' (auto-detected if omitted)

Response:
  {
    "msg": "Check your inbox. If that email address is registered..."
  }
```

### Reset Password with Token
```
POST /api/reset_password
Query Parameters:
  - token (required): Reset token from email
  - password (required): New password (min 6 chars)

Response:
  {
    "msg": "Your password has been reset."
  }
```

### Change Password (Authenticated)
```
POST /api/change_password
Headers:
  - Authorization: Bearer JWT_TOKEN (required)
Query Parameters:
  - old_password (required): Current password for verification
  - new_password (required): New password (min 6 chars)

Response:
  {
    "msg": "Your password has been updated."
  }
```

## Troubleshooting

### Problem: Email not received
- **Check spam/junk folder** - emails might be filtered
- **Verify email address** - make sure it's spelled correctly
- **Check backend logs** - verify email service is configured (SMTP credentials)
- **Request another reset** - you can submit the form multiple times

### Problem: Reset link expired
- **Links expire after 15 minutes** - request a new password reset
- **Still on forgot-password screen** - tap "Send Reset Link" again
- **Already opened the link** - the token is single-use, request another reset

### Problem: Reset link doesn't open the app
- **Mobile deep-linking not configured** - link opens in web browser instead
  - Check `MOBILE_DEEP_LINK_BASE_URL` environment variable
  - Verify Android intent filters in `app.json`
- **First time accessing the app from link** - iOS might ask for permission
  - Tap "Open" when prompted

### Problem: Password change fails
- **Wrong current password** - verify you entered the correct password
- **Password too short** - minimum 6 characters required
- **Passwords don't match** - confirm password must exactly match new password
- **Same as current password** - new password must be different from current
- **Session expired** - you've been logged out, please log in again

## Security Notes

1. **Tokens expire in 15 minutes** - don't delay clicking reset links
2. **Tokens are single-use** - once used, you need to request another reset
3. **Password is case-sensitive** - `Password123` ≠ `password123`
4. **No email enumeration** - forgot password doesn't confirm whether email exists
5. **Current password verified** - change password requires you know the current password
6. **SSL/TLS required** - all password transmission is encrypted in production

## Environment Setup

### Required Backend Environment Variables
```bash
# Email sending configuration (for password reset emails)
SMTP_HOSTNAME=your-smtp-server.com
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-app-password

# URL configuration (for password reset links)
FRONTEND_BASE_URL=https://trackeats.app
MOBILE_DEEP_LINK_BASE_URL=trackeats://

# Token expiration (optional, default 900 seconds = 15 minutes)
RESET_TOKEN_EXPIRATION_SECONDS=900
```

### Mobile App Configuration
No additional configuration needed - uses existing API_BASE_URL from environment.

## Testing Locally

### Option 1: Use Frontend (Web URL)
```bash
# Backend with web URL
FRONTEND_BASE_URL=http://localhost:3000
MOBILE_DEEP_LINK_BASE_URL=trackeats://

# Request password reset from mobile app
# Backend will use: http://localhost:3000/reset_password?token=...
# Click the link in the email to test web reset flow
```

### Option 2: Use Mobile Deep-Link
```bash
# Backend configuration
MOBILE_DEEP_LINK_BASE_URL=trackeats://
FRONTEND_BASE_URL=http://localhost:3000

# Request password reset from mobile app
# Backend detects origin=mobile and uses: trackeats://reset_password?token=...
# Deep-link opens mobile app automatically
```

### Option 3: Mock Email Service
During local development, you might not have SMTP configured. The app will:
1. Still attempt to send the email
2. Log errors to console but not crash
3. Allow testing the API contract without actual email delivery

To test password reset locally:
```bash
# Get the token manually from logs
# Then construct the deep-link: trackeats://reset_password?token=XXXX
# Paste in device/simulator URL bar or use adb shell

adb shell am start -W -a android.intent.action.VIEW -d "trackeats://reset_password?token=XXXX" com.anonymous.mobile
```

## Related Documentation
- [Backend Implementation](../backend/README.md)
- [Mobile App Architecture](./mobile/README.md)
- [API Documentation](../docs/design.md)
