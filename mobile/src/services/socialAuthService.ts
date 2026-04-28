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

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import api from './api';
import { AuthError } from '@/types/auth';

// Required so that Expo's auth session redirect works on web
WebBrowser.maybeCompleteAuthSession();

// ─────────────────────────────────────────────────────────────────────────────
// Config — set these in your .env / app.config.js
// ─────────────────────────────────────────────────────────────────────────────
// These are the *client-side* IDs used for the OAuth PKCE flow. They are safe
// to ship in the app bundle.  The client secret (if any) stays on the server.
const GOOGLE_EXPO_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';

// ─────────────────────────────────────────────────────────────────────────────
// Backend exchange
// ─────────────────────────────────────────────────────────────────────────────
async function exchangeWithBackend(
  provider: 'google' | 'facebook' | 'apple',
  token: string,
  extra?: { name?: string },
): Promise<string> {
  try {
    const response = await api.post('/api/social_login', {
      provider,
      token,
      ...(extra ?? {}),
    });
    const appToken = response.data?.access_token;
    if (!appToken) {
      throw new AuthError('No token returned from server', 'NO_TOKEN');
    }
    return appToken;
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
export function useGoogleAuthRequest() {
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

  // Pick the right client ID for the platform
  const clientId = (() => {
    if (GOOGLE_EXPO_CLIENT_ID) return GOOGLE_EXPO_CLIENT_ID; // Expo Go / web
    if (GOOGLE_ANDROID_CLIENT_ID) return GOOGLE_ANDROID_CLIENT_ID;
    return GOOGLE_IOS_CLIENT_ID;
  })();

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'trackeats' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
    },
    discovery,
  );

  async function loginWithGoogle(): Promise<string> {
    if (!clientId) {
      throw new AuthError(
        'Google client ID is not configured. Set EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID.',
        'CONFIG_ERROR',
      );
    }
    const result = await promptAsync();
    if (result.type === 'success') {
      const idToken = result.params.id_token;
      if (!idToken) {
        throw new AuthError('Google did not return an id_token', 'NO_TOKEN');
      }
      return exchangeWithBackend('google', idToken);
    }
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new AuthError('Sign-in was cancelled', 'CANCELLED');
    }
    throw new AuthError('Google sign-in failed', 'SOCIAL_LOGIN_FAILED');
  }

  return { request, response, promptAsync: loginWithGoogle };
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

  async function loginWithFacebook(): Promise<string> {
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
export async function loginWithApple(): Promise<string> {
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
