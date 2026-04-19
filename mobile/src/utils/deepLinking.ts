/**
 * Deep-linking utilities for handling email verification URLs
 * Supports both deep-link (trackeats://verify?token=...) and web URLs
 */

import { useEffect } from 'react';
import * as Linking from 'expo-linking';

/**
 * Parse a URL and extract the verification token if present
 * Handles both web URLs (https://domain/verify?token=...) and deep-links (trackeats://verify?token=...)
 * @param url URL string to parse
 * @returns Token string if this is a verify/confirm URL, null otherwise
 */
export function parseVerifyToken(url: string | null): string | null {
  if (!url) return null;

  try {
    let pathname = '';
    let searchParams: URLSearchParams;

    // Handle custom schemes (trackeats://verify?...) by converting to http://localhost/verify?...
    // This preserves the path while allowing standard URL parsing
    const normalizedUrl = url.startsWith('trackeats://')
      ? url.replace(/^trackeats:/, 'http://localhost')
      : url;

    const parsed = new URL(normalizedUrl);
    pathname = parsed.pathname || '';
    searchParams = parsed.searchParams;

    // Check if path matches verify or confirm (handling with and without trailing slash)
    const isVerifyUrl =
      pathname.includes('/verify') ||
      pathname.includes('/confirm') ||
      pathname === '/verify' ||
      pathname === '/confirm';

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
 * Hook to handle deep-link URLs for email verification
 * Calls onToken(token) when a verify URL is detected
 * @param onToken Callback to invoke with extracted token
 */
export function useDeepLink(onToken: (token: string) => void): void {
  useEffect(() => {
    // Handle initial URL when app is launched from a deep-link
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

    // Handle deep-links when app is already open
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
