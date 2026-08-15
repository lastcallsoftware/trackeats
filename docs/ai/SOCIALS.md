# Social Login — Setup Guide

This document describes the social login feature added to TrackEats and the
credentials you need to obtain and configure before it will work.

---

## What Was Built

### Backend (`backend/`)

| File | What changed |
|---|---|
| `migrations/versions/d1a2b3c4d5e6_add_oauth_fields_to_user.py` | New Alembic migration — adds `oauth_provider` and `oauth_id` columns to the `user` table; makes `password_hash` nullable for social-only accounts |
| `src/models.py` | `User` model extended with `oauth_provider`, `oauth_id`, `get_by_oauth()`, and `get_or_create_oauth_user()` |
| `src/routes.py` | New `POST /api/social_login` endpoint; token verification helpers for Google, Facebook, and Apple |

### Frontend web (`frontend/`)

| File | What changed |
|---|---|
| `src/main.tsx` | Wrapped app in `<GoogleOAuthProvider>` |
| `src/components/SocialLoginButtons.tsx` | New component — Google, Facebook, and Apple buttons with "or continue with" divider; each provider button is hidden unless its config exists |
| `src/components/LoginPage.tsx` | `<SocialLoginButtons>` added below the email/password form |
| `.env` | Placeholder social login env vars added |

### Mobile (`mobile/`)

| File | What changed |
|---|---|
| `src/services/socialAuthService.ts` | New service — `useGoogleAuthRequest()`, `useFacebookAuthRequest()`, `loginWithApple()` |
| `src/store/authStore.ts` | New `loginWithSocialToken(appToken)` action |
| `app/(auth)/login.tsx` | Google, Facebook, and Apple buttons added to the login screen; buttons are hidden unless each provider is configured |
| `app.json` | `expo-apple-authentication` added to plugins |
| `.env` | Placeholder social login env vars added |

### New packages installed

| Package | Where |
|---|---|
| `@react-oauth/google` | `frontend/` |
| `expo-apple-authentication` | `mobile/` |
| `expo-auth-session` | `mobile/` |
| `expo-crypto` | `mobile/` |
| `expo-web-browser` | `mobile/` |

---

## Activation: Credentials You Need

### Step 1 — Apply the database migration

```bash
cd backend
flask db upgrade
```

This adds `oauth_provider` and `oauth_id` columns to the `user` table.

---

### Step 2 — Google

**Where to get credentials:** https://console.cloud.google.com  
→ APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID

You need **multiple client IDs** — one per platform:

| Client type | Used by | Env var |
|---|---|---|
| Web application | Backend token verification + frontend web app | `GOOGLE_WEB_CLIENT_ID` (backend), `VITE_GOOGLE_CLIENT_ID` (frontend) |
| Android | Mobile app on Android | `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (mobile) |
| iOS | Mobile app on iOS | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (mobile) |
| Web (Expo proxy) | Expo Go during development | `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID` (mobile) |

**Authorized redirect URIs** to add to the Web client:
- `http://localhost:5173/login` (local dev)
- `https://your-production-domain/login` (production)
- `https://auth.expo.io/@your-expo-username/mobile` (Expo Go)

**Files to update:**

`backend/.env`:
```
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

`frontend/.env`:
```
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

`mobile/.env`:
```
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

---

### Step 3 — Facebook

**Where to get credentials:** https://developers.facebook.com  
→ My Apps → Create App → Consumer → Settings → Basic

You need one App ID (public, safe to ship in the browser/app bundle) and one
App Secret (server-side only, never exposed to clients).

**Required Facebook app configuration:**
- Add the **Facebook Login** product to your app
- Under Facebook Login → Settings, add these to **Valid OAuth Redirect URIs**:
  - `http://localhost:5173/login`
  - `https://your-production-domain/login`
  - `https://auth.expo.io/@your-expo-username/mobile`
- Set **App Domains** to your production domain

**Files to update:**

`backend/.env`:
```
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

`frontend/.env`:
```
VITE_FACEBOOK_APP_ID=your-facebook-app-id
```

`mobile/.env`:
```
EXPO_PUBLIC_FACEBOOK_APP_ID=your-facebook-app-id
```

> **Note:** The Facebook App Secret goes in the backend `.env` only.
> It is never sent to the browser or bundled into the mobile app.

---

### Step 4 — Apple

Apple Sign-In requires an active **Apple Developer Program** membership ($99/year).

**Where to get credentials:** https://developer.apple.com  

#### For the iOS mobile app

1. Go to **Certificates, Identifiers & Profiles** → **Identifiers**
2. Select your App ID (e.g. `com.example.trackeats`)
3. Enable **Sign In with Apple**
4. Note your **Bundle ID** — this is what goes in `APPLE_BUNDLE_ID`

`backend/.env`:
```
APPLE_BUNDLE_ID=com.example.trackeats
```

`mobile/.env`:
```
EXPO_PUBLIC_ENABLE_APPLE_LOGIN=true
```

Apple login on mobile is intentionally opt-in. Keep this unset (or set it to any
value other than `true`) to hide the Apple button until your Apple setup is ready.

#### For the web app

Apple requires a separate **Services ID** for web sign-in:

1. Go to **Identifiers** → **+** → **Services IDs**
2. Create a new Services ID (e.g. `com.example.trackeats.web`)
3. Enable **Sign In with Apple**, click **Configure**
4. Add your domain and these **Return URLs**:
   - `http://localhost:5173/login` (local dev — Apple may reject non-HTTPS; use ngrok if needed)
   - `https://your-production-domain/login`
5. Note the **Services ID identifier** — this is your `VITE_APPLE_CLIENT_ID`

`frontend/.env`:
```
VITE_APPLE_CLIENT_ID=com.example.trackeats.web
VITE_APPLE_REDIRECT_URI=https://your-production-domain/login
```

`backend/.env` (use the Services ID for web, or the Bundle ID for mobile — both need to match what was registered):
```
APPLE_BUNDLE_ID=com.example.trackeats.web
```

> **Note:** Apple Sign-In only appears on iOS devices in the mobile app
> (`Platform.OS === 'ios'` guard) and only when
> `EXPO_PUBLIC_ENABLE_APPLE_LOGIN=true` is set. It appears on web only when
> Apple web env vars are configured.

---

## Complete Credential Checklist

### `backend/.env`

```
GOOGLE_WEB_CLIENT_ID=              # Web OAuth client ID from Google Cloud Console
GOOGLE_ANDROID_CLIENT_ID=          # Android OAuth client ID from Google Cloud Console
GOOGLE_IOS_CLIENT_ID=              # iOS OAuth client ID from Google Cloud Console
FACEBOOK_APP_ID=                   # App ID from Facebook Developer portal
FACEBOOK_APP_SECRET=               # App Secret from Facebook Developer portal (server only)
APPLE_BUNDLE_ID=                   # Bundle ID (mobile) or Services ID (web)
```

### `frontend/.env`

```
VITE_GOOGLE_CLIENT_ID=             # Same value as GOOGLE_WEB_CLIENT_ID above
VITE_FACEBOOK_APP_ID=              # Same App ID as FACEBOOK_APP_ID above
VITE_APPLE_CLIENT_ID=              # Services ID (e.g. com.example.trackeats.web)
VITE_APPLE_REDIRECT_URI=           # Must match return URL registered with Apple
```

### `mobile/.env`

```
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=     # Web client ID for Expo Go development
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=  # Android OAuth client ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=      # iOS OAuth client ID
EXPO_PUBLIC_FACEBOOK_APP_ID=           # Same App ID as FACEBOOK_APP_ID above
EXPO_PUBLIC_ENABLE_APPLE_LOGIN=        # Set to true to show Apple login on iOS
```

---

## Provider Visibility Behavior

Social buttons are now hidden unless that provider is configured.

- **Web:**
  - Google button appears only if `VITE_GOOGLE_CLIENT_ID` is set
  - Facebook button appears only if `VITE_FACEBOOK_APP_ID` is set
  - Apple button appears only if `VITE_APPLE_CLIENT_ID` is set
  - If none are configured, the entire social-login section is hidden

- **Mobile:**
  - Google button appears only if at least one Google mobile client ID is set
  - Facebook button appears only if `EXPO_PUBLIC_FACEBOOK_APP_ID` is set
  - Apple button appears only on iOS **and** `EXPO_PUBLIC_ENABLE_APPLE_LOGIN=true`
  - If none are configured, the entire social-login section is hidden

---

## How It Works (Flow Summary)

1. User taps a social login button
2. The provider's SDK opens a consent screen (popup on web, system browser on mobile)
3. The user approves — the provider returns a token to the app
4. The app sends `{ provider, token }` to `POST /api/social_login`
5. The backend **verifies the token directly with the provider** (Google tokeninfo API, Facebook graph API, Apple JWKS) — the app never trusts the token client-side
6. The backend finds or creates a `User` record (linking by `oauth_provider` + `oauth_id`, or by matching email to an existing account)
7. The backend issues a standard TrackEats JWT and returns it
8. The app stores the JWT and proceeds exactly as it does after email/password login

If a user's email matches an existing TrackEats account, the social provider is
automatically linked to that account — the user does not need to create a new one.

---

## Notes and Caveats

- **No passwords for social accounts.** Users who sign up via social login have
  `password_hash = NULL`. They cannot use the "forgot password" flow. If you want
  to support password linking later, add a "set password" screen.

- **Apple email privacy.** Apple may provide a relay email address
  (`xyz@privaterelay.appleid.com`) instead of the user's real address. This is
  normal. The backend stores whatever Apple provides.

- **Apple web sign-in requires HTTPS.** Apple will reject `localhost` redirect
  URIs. Use [ngrok](https://ngrok.com) or similar to test locally:
  `ngrok http 5173` and register the resulting HTTPS URL with Apple.

- **Facebook app review.** The `email` permission requires Facebook app review
  before it works for users who are not app admins/testers. Submit for review
  before launch.

- **Expo Go vs standalone builds.** Google Sign-In via `expo-auth-session` works
  in Expo Go using the Expo OAuth proxy. Standalone builds use the platform
  client IDs directly and require the redirect URI to use the `trackeats://`
  custom scheme (already configured in `app.json`).
