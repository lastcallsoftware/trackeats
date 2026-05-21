/**
 * URL-link utilities for handling email verification URLs
 * Supports app/web URLs such as https://trackeats.com/api/confirm?token=...
 */

import { useEffect } from 'react';
import * as Linking from 'expo-linking';

/**
 * Parse a URL and extract the verification token if present
 * Handles app/web URLs (https://domain/api/confirm?token=...)
 * @param url URL string to parse
 * @returns Token string if this is a verify/confirm URL, null otherwise
 */
export function parseVerifyToken(url: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname || '';
    const searchParams = parsed.searchParams;

    // Accept only the canonical backend confirmation path.
    const isVerifyUrl =
      pathname === '/api/confirm' ||
      pathname === '/api/confirm/';

    // Extract token from query params
    const token = searchParams.get('token');

    if (isVerifyUrl && token) {
      return token;
    }

    return null;
  } catch (e) {
    console.debug('[DEEP-LINK] Failed to parse URL:', url, e);
    return null;
  }
}

/**
 * Hook to handle incoming URL events for email verification
 * Calls onToken(token) when a verify URL is detected
 * @param onToken Callback to invoke with extracted token
 */
export function useDeepLink(onToken: (token: string) => void): void {
  useEffect(() => {
    // Handle initial URL when app is launched from a link
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl != null) {
        console.debug('[DEEP-LINK] Initial URL:', initialUrl);
        const token = parseVerifyToken(initialUrl);
        if (token) {
          console.debug('[DEEP-LINK] Token extracted:', token);
          onToken(token);
        }
      }
    };

    handleInitialURL();

    // Handle URL events when app is already open
    const unsubscribe = Linking.addEventListener('url', ({ url }) => {
      console.debug('[DEEP-LINK] URL received while app is open:', url);
      const token = parseVerifyToken(url);
      if (token) {
        console.debug('[DEEP-LINK] Token extracted:', token);
        onToken(token);
      }
    });

    return () => {
      unsubscribe.remove();
    };
  }, [onToken]);
}
