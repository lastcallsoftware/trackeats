# Integration Testing Manual

This document describes the manual testing procedures for validating the complete Trackeats application lifecycle end-to-end, complementing the automated integration test suite in `src/__tests__/integration-scenarios.test.tsx`.

## Overview

The Trackeats mobile application follows a complete user journey:
1. **Auth Flow**: User signup → email verification → login
2. **Food Discovery**: Browse foods and recipes with filters
3. **Daily Logging**: Log meals and track nutrition
4. **Persistence**: Session survives app restart

Automated integration tests verify cross-slice wiring with mocks. Manual tests validate the actual user experience with real backend interactions.

## Simulator Setup

### Prerequisites

- Xcode 15+ (for iOS simulator) or Android Studio (for Android emulator)
- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- Backend API running on `http://localhost:5000` (or update `EXPO_PUBLIC_BACKEND_BASE_URL` in `.env`)

### Starting the Dev Environment

```bash
# Terminal 1: Start the backend API
cd ../backend
npm install
npm run dev

# Terminal 2: Start Expo dev server
cd mobile
npm install
npm start

# Terminal 3: Launch iOS simulator
# Press 'i' in the Expo terminal, or run:
npx expo run:ios

# OR for Android emulator
# Press 'a' in the Expo terminal, or run:
npx expo run:android
```

## Signup to Daily Log Workflow

This is the primary user journey that exercises all major slices:

### Step 1: Signup (Auth Slice)

1. Launch the app → you see the Auth stack (AuthScreen, RegisterScreen)
2. Tap "Register" button
3. Enter username: `testuser-$(date +%s)`
4. Enter email: `testuser-$(date +%s)@example.com`
5. Enter password: `TestPassword123!`
6. Tap "Register" → you should see:
   - `[AUTH] Registering user...` in console
   - Loading spinner for 1-2 seconds
   - Success message: "Check your email for verification link"
   - Navigation to VerifyEmailScreen

**Expected observability:**
- `[AUTH] User registered successfully` in console logs

### Step 2: Email Verification

**Option A: Deep-link (trackeats:// scheme)**

1. Get the verification token from backend logs or email (if configured)
2. In iOS Simulator: Drag-and-drop a URL like `trackeats://verify?token=ACTUAL_TOKEN`
3. App should navigate to LoginScreen with email field pre-filled

**Option B: Manual token entry**

1. Copy verification token from email or backend logs
2. Paste into "Verification Token" text field
3. Tap "Verify Email"
4. You should see:
   - `[AUTH] Email verified successfully` in console
   - Navigation back to LoginScreen

**Expected observability:**
- `[DEEP-LINK] Initial URL: trackeats://verify?token=...` (if using deep-link)
- `[AUTH] Email verified successfully`

### Step 3: Login (Auth Slice → App Navigation)

1. From LoginScreen, enter:
   - Username: the username from signup
   - Password: the password from signup
2. Tap "Login"
3. You should see:
   - `[AUTH] Logging in user...` in console
   - Loading spinner
   - Token stored in SecureStore (invisible)
   - Navigation changes from AuthStack to Tabs (HomeTab, FoodListTab, RecipesTab, AccountTab)

**Expected observability:**
- `[AUTH] Login successful` in console
- Authorization header `Bearer TOKEN` attached to subsequent API calls (network tab)

**Conditional Navigation Verification:**
- Before login: UI shows Auth stack
- After login: UI shows Tabs (home, food, recipes, account)
- authStore.isLoggedIn switches from false → true

### Step 4: Browse Foods (Foods Slice)

1. Tap "Foods" tab → FoodListScreen
2. You should see:
   - `[FOODS] Fetching food list` in console
   - List of foods appears after 1-2 seconds
   - Each food shows: name, group, vendor, nutrition summary

3. Test filtering:
   - Enter search term in search box (e.g., "apple") → list filters in real-time
   - Select a food group from dropdown (e.g., "beverages")
   - Should apply AND logic: search=apple AND group=beverages

4. Scroll down → more foods load (pagination or scroll handling)

**Expected observability:**
- `[FOODS] Fetching food list` on first load
- `[FOODS] Loaded N foods` (showing count)
- Second navigation to FoodListTab should NOT log "Fetching" again (React Query cache hit)

**Cache Hit Verification:**
1. Navigate to Foods tab → logs show `[FOODS] Fetching food list`
2. Navigate to other tab
3. Return to Foods tab → should NOT see `[FOODS] Fetching food list` again (cache hit)
4. Wait 5+ minutes (staleTime expires) → return to Foods → should see `[FOODS] Fetching food list` again

### Step 5: Browse Recipes (Recipes Slice)

1. Tap "Recipes" tab → RecipeListScreen
2. You should see:
   - `[RECIPES] Fetching recipe list` in console
   - List of recipes appears
   - Each recipe shows: name, cuisine, ingredients count, nutrition summary

3. Test filtering:
   - Search for recipe name (e.g., "pasta")
   - Filter by cuisine dropdown (e.g., "Italian")
   - Should apply AND logic: search=pasta AND cuisine=Italian

**Expected observability:**
- `[RECIPES] Fetching recipe list` on first load
- `[RECIPES] Loaded N recipes` (showing count)

### Step 6: Log Daily Consumption (Daily Log Slice)

1. Tap "Home" tab → DailyLogScreen (shows today's date)
2. You should see:
   - `[DAILY_LOG] Fetching daily log for YYYY-MM-DD` in console
   - Empty list (no entries yet) or existing entries

3. Tap "Add Entry" button → AddDailyLogEntrySheet modal appears
4. Search for a food (e.g., "Apple") → food appears in list
5. Tap the food → select servings (default 1)
6. Tap "Add" → you should see:
   - `[DAILY_LOG] Adding entry for YYYY-MM-DD` in console
   - Loading indicator
   - Modal closes
   - Entry appears in list with nutrition data

7. View daily totals:
   - DailyLogTotalsView displays aggregated calories, protein, etc.
   - Should sum all entries' nutrition (verify aggregateNutrition call)

**Expected observability:**
- `[DAILY_LOG] Adding entry for YYYY-MM-DD`
- `[DAILY_LOG] Entry N added`
- Subsequent reads of same date use cache (queryKey=['daily-log', date])

**Cache Invalidation Verification:**
1. Add an entry → entry appears immediately (mutation success + cache invalidation)
2. Check console → should see `invalidateQueries(['daily-log', YYYY-MM-DD])`
3. No refetch UI flicker → indicates query client cache was properly cleared

### Step 7: Edit and Delete Entries

1. Tap an entry in the daily log list → EditDailyLogEntrySheet modal opens
2. Modify servings → tap "Update"
3. Entry updates in list (cache invalidation)

4. Swipe or tap "Delete" on an entry → ConfirmDeleteSheet
5. Confirm → entry removed from list (cache invalidation)

**Expected observability:**
- `[DAILY_LOG] Editing entry N`
- `[DAILY_LOG] Deleting entry N`

### Step 8: Session Persistence (Auth Slice)

1. After completing daily log workflow, close the app entirely
2. Reopen the app
3. You should:
   - See Tabs immediately (NOT AuthStack)
   - Same daily log entries visible
   - No re-login required

**Expected observability:**
- `[AUTH] Token found, expiry: YYYY-MM-DD...` in console (during initialize)
- App transitions directly to home screen

### Step 9: Token Expiry Handling (Auth + API Integration)

**Simulating Expired Token:**

1. Use backend to manually expire the user's token (or wait for natural expiry)
2. Try to add a new daily log entry
3. You should see:
   - `[AUTH] 401 received — triggering session expiry` in console
   - Entry creation fails with error dialog
   - Navigation redirects to LoginScreen
   - Error message: "Your session has expired. Please log in again."

**Expected observability:**
- `[AUTH] 401 received` from API interceptor
- authStore.handleSessionExpired() called
- authStore.error.code = 'SESSION_EXPIRED'

## Offline Scenario

### Testing without backend connectivity

1. Start the app normally (connected)
2. Add a daily log entry → succeeds
3. Disconnect network (airplane mode)
4. Try to add another entry → should see error:
   - Network error message displayed
   - Entry is NOT added to list
   - Error banner with retry option

5. Reconnect network
6. Tap "Retry" → entry creation succeeds
7. Cache invalidation fires → daily log refreshes

**Expected observability:**
- `[DAILY_LOG] Mutation error: Network error` in console
- Subsequent successful request logs `[DAILY_LOG] Entry N added`

## Session Persistence Verification

### Verify JWT is stored securely

1. Login successfully
2. Open browser DevTools → Storage → Cookies/LocalStorage
3. Token should NOT appear (it's in Secure Enclave / KeyStore, not accessible)
4. Close app completely
5. Reopen app → still logged in without re-entering credentials

### Verify token is sent with requests

1. Login successfully
2. Open DevTools Network tab
3. Add a daily log entry
4. Check the POST request to `/api/dailylogitem`
5. In request headers, verify: `Authorization: Bearer TOKEN`

## Known Limitations

### 1. Deep-link Token Parsing

- **Limitation**: Web link format (`https://trackeats.app/confirm?token=X`) requires proper domain routing and SSL certificate
- **Workaround**: Use native deep-link format (`trackeats://verify?token=X`) for testing
- **Expected in Production**: Web links routed through Firebase Dynamic Links or similar

### 2. Email Delivery

- **Limitation**: Development backend may not actually send emails
- **Workaround**: Check backend logs for verification token, or manually insert token into `/confirm` endpoint
- **Expected in Production**: Integration with SendGrid, AWS SES, or similar

### 3. Session Expiry Simulation

- **Limitation**: Manually expiring tokens requires backend access
- **Workaround**: Modify backend to accept `?expire_token=true` query param for testing
- **Expected in Production**: Natural token expiry after 24 hours (or configured TTL)

### 4. Network Interruption

- **Limitation**: Graceful retry requires explicit UI button (not automatic retry)
- **Workaround**: Toggle airplane mode, tap "Retry" button
- **Expected in Production**: Automatic exponential backoff + user-initiated retry

## Observability Checklist

After completing the full workflow, verify these log prefixes appear:

- [ ] `[AUTH]` - Login, register, confirm, initialize, session expiry
- [ ] `[APP]` - Navigation stack changes
- [ ] `[FOODS]` - Food list fetch, filtering
- [ ] `[RECIPES]` - Recipe list fetch, filtering
- [ ] `[DAILY_LOG]` - Daily log fetch, add/edit/delete entries, cache invalidation

## Automated Testing

The automated integration test suite (`src/__tests__/integration-scenarios.test.tsx`) covers:

1. Auth state machine → conditional navigation (render Auth stack vs Tabs)
2. 401 response interceptor → handleSessionExpired error
3. React Query cache hit (useFoods returns cached data without new fetch)
4. Full daily log workflow (fetch → aggregate → render)
5. Cache invalidation after mutations (addEntry → invalidateQueries)
6. Combined filter logic (search AND group/cuisine)
7. Deep-link token parsing (trackeats:// and https:// URLs)
8. Token expiry detection on startup (expired JWT clears token)

Run the integration tests:

```bash
cd mobile
npx jest --testPathPatterns='integration-scenarios'
npx jest --no-coverage  # Run full suite (212+ tests)
```

## Summary

The integration manual tests verify the complete user journey while automated tests verify the internal wiring. Together they ensure:

- **Auth flows** work end-to-end
- **Cross-slice boundaries** integrate correctly
- **Observability** surfaces are emitted as expected
- **Error handling** gracefully manages network failures
- **Session persistence** survives app restarts
- **Cache invalidation** prevents stale data

For CI/CD, the automated integration test suite provides fast, deterministic verification without manual simulator interaction.
