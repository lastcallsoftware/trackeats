/**
 * Social authentication service
 *
 * Handles provider-specific OAuth flows for Google, Facebook, and Apple,
 * then exchanges the resulting token with the Trackeats backend for an
 * app JWT.
 *
 * Usage (from a screen or store):
 *   const token = await socialAuthService.loginWithGoogle();
 *   // token is the app JWT — store it with tokenStorage and call setApiToken()
 */

import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import api from './api';
import { AuthError } from '@/types/auth';

export type SocialLoginResult = {
  accessToken: string;
  username: string;
};

// Required so that expo-auth-session redirect flows (Facebook) work on web.
WebBrowser.maybeCompleteAuthSession();

// ─────────────────────────────────────────────────────────────────────────────
// Config — set these in your .env / app.config.js
// ─────────────────────────────────────────────────────────────────────────────
// These are the *client-side* IDs used for social login flows. They are safe
// to ship in the app bundle.  The client secret (if any) stays on the server.

// Google — webClientId is required on Android to obtain an idToken.
// iosClientId is required on iOS (if omitted the web client is used, which
// may not work for all configurations).
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';

// ─────────────────────────────────────────────────────────────────────────────
// Google Sign-In — one-time SDK configuration
// ─────────────────────────────────────────────────────────────────────────────
// Configure is called once at module load.  It is safe to call multiple times;
// subsequent calls simply update the config.
GoogleSignin.configure({
  // webClientId causes Google to include an idToken in the sign-in result,
  // which the backend uses to verify the identity of the user.
  webClientId: GOOGLE_WEB_CLIENT_ID,
  // iosClientId is required so the native iOS picker opens the correct app.
  // Passing undefined when not set lets the SDK fall back to the web client.
  iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  scopes: ['profile', 'email'],
});

// ─────────────────────────────────────────────────────────────────────────────
// Backend exchange
// ─────────────────────────────────────────────────────────────────────────────
async function exchangeWithBackend(
  provider: 'google' | 'facebook' | 'apple',
  token: string,
  extra?: { name?: string; platform?: string },
): Promise<SocialLoginResult> {
  try {
    const response = await api.post('/api/social_login', {
      provider,
      token,
      ...(extra ?? {}),
    });
    const appToken = response.data?.access_token;
    const username = response.data?.username;
    if (!appToken) {
      throw new AuthError('No token returned from server', 'NO_TOKEN');
    }
    if (!username) {
      throw new AuthError('No username returned from server', 'NO_USERNAME');
    }
    return { accessToken: appToken, username };
  } catch (error: any) {
    if (error instanceof AuthError) throw error;
    const message = error?.response?.data?.msg ?? error?.message ?? 'Social login failed';
    const status = error?.response?.status ?? 0;
    let code = 'SOCIAL_LOGIN_FAILED';
    if (status === 401) code = 'INVALID_CREDENTIALS';
    throw new AuthError(message, code);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Google
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sign in with Google using the native Google Sign-In SDK.
 *
 * This is a plain async function (not a React hook), so it can be called from
 * any event handler without the rules-of-hooks restrictions.
 *
 * Flow:
 *   1. Confirm Google Play Services are available (Android only; no-op on iOS).
 *   2. Present the native Google account picker.
 *   3. Extract the idToken from the result.
 *   4. Exchange the idToken with the Trackeats backend for an app JWT.
 */
export async function signInWithGoogle(): Promise<SocialLoginResult> {
  // Fail fast rather than letting the sign-in dialog open with a broken config.
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new AuthError(
      'Google client ID is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.',
      'CONFIG_ERROR',
    );
  }

  try {
    // Ensures Google Play Services are up to date on Android.  On iOS this is
    // a no-op.  showPlayServicesUpdateDialog prompts the user to update if needed.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Opens the native Google account picker and returns the signed-in user.
    const response = await GoogleSignin.signIn();

    // The idToken is a signed JWT that the backend verifies with Google's
    // public keys to confirm the user's identity.
    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new AuthError('Google did not return an id_token', 'NO_TOKEN');
    }

    // Exchange with the backend — platform label lets the server select the
    // correct Google client ID when verifying the token.
    return exchangeWithBackend('google', idToken, { platform: Platform.OS });
  } catch (error: any) {
    if (error instanceof AuthError) throw error;

    // Map Google Sign-In SDK status codes to AuthError codes so callers can
    // handle cancel/dismiss without showing a generic error message.
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new AuthError('Sign-in was cancelled', 'CANCELLED');
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new AuthError('Sign-in already in progress', 'IN_PROGRESS');
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new AuthError('Google Play Services not available', 'PLAY_SERVICES_NOT_AVAILABLE');
      }
    }

    throw new AuthError(error?.message ?? 'Google sign-in failed', 'SOCIAL_LOGIN_FAILED');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Facebook
// ─────────────────────────────────────────────────────────────────────────────
export function useFacebookAuthRequest() {
  const discovery: AuthSession.DiscoveryDocument = {
    authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
  };

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'trackeats' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: FACEBOOK_APP_ID,
      redirectUri,
      scopes: ['public_profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
    },
    discovery,
  );

  async function loginWithFacebook(): Promise<SocialLoginResult> {
    if (!FACEBOOK_APP_ID) {
      throw new AuthError(
        'Facebook App ID is not configured. Set EXPO_PUBLIC_FACEBOOK_APP_ID.',
        'CONFIG_ERROR',
      );
    }
    const result = await promptAsync();
    if (result.type === 'success') {
      const accessToken = result.params.access_token;
      if (!accessToken) {
        throw new AuthError('Facebook did not return an access_token', 'NO_TOKEN');
      }
      return exchangeWithBackend('facebook', accessToken);
    }
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new AuthError('Sign-in was cancelled', 'CANCELLED');
    }
    throw new AuthError('Facebook sign-in failed', 'SOCIAL_LOGIN_FAILED');
  }

  return { request, response, promptAsync: loginWithFacebook };
}

// ─────────────────────────────────────────────────────────────────────────────
// Apple  (iOS only — expo-apple-authentication)
// ─────────────────────────────────────────────────────────────────────────────
export async function loginWithApple(): Promise<SocialLoginResult> {
  // Dynamically imported so the module doesn't crash on Android / web where
  // expo-apple-authentication is not available
  const AppleAuthentication = await import('expo-apple-authentication').catch(() => null);
  if (!AppleAuthentication) {
    throw new AuthError('Apple Sign-In is not available on this platform', 'UNSUPPORTED');
  }

  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new AuthError('Apple Sign-In is not available on this device', 'UNSUPPORTED');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const identityToken = credential.identityToken;
    if (!identityToken) {
      throw new AuthError('Apple did not return an identity token', 'NO_TOKEN');
    }

    // Apple only sends the name on the very first sign-in; capture it and
    // forward it to the backend so it can set the display name.
    const fullName = credential.fullName;
    const name =
      fullName?.givenName || fullName?.familyName
        ? [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ')
        : undefined;

    return exchangeWithBackend('apple', identityToken, { name });
  } catch (error: any) {
    if (error instanceof AuthError) throw error;
    if (error?.code === 'ERR_REQUEST_CANCELED') {
      throw new AuthError('Sign-in was cancelled', 'CANCELLED');
    }
    throw new AuthError(error?.message ?? 'Apple sign-in failed', 'SOCIAL_LOGIN_FAILED');
  }
}
