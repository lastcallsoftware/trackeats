/**
 * Zustand auth store - manages authentication state and actions
 * Token is not stored in state - it lives only in SecureStore + api.ts module variable
 */

import { create } from 'zustand';
import * as tokenStorage from '@/services/tokenStorage';
import { setApiToken } from '@/services/api';
import * as authService from '@/services/authService';
import type { AuthMethod } from '@/services/tokenStorage';

export interface AuthError {
  message: string;
  code: string;
}

export interface AuthUser {
  username: string;
}

export interface AuthStoreState {
  isLoggedIn: boolean;
  username: string | null;
  authMethod: AuthMethod | null;
  currentUser: AuthUser | null;
  error: AuthError | null;
  isLoading: boolean;
  pendingVerification: boolean;
}

export interface AuthStoreActions {
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocialToken: (authData: { accessToken: string; username: string; authMethod: 'google' | 'facebook' | 'apple' }) => Promise<void>;
  register: (username: string, password: string, email: string) => Promise<void>;
  confirm: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  handleSessionExpired: () => void;
  clearError: () => void;
}

const initialState: AuthStoreState = {
  isLoggedIn: false,
  username: null,
  authMethod: null,
  currentUser: null,
  error: null,
  isLoading: false,
  pendingVerification: false,
};

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  return decodeURIComponent(
    Array.from(atob(padded), (character) =>
      `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`
    ).join('')
  );
}

/**
 * Decode JWT payload without verification (valid for client-side expiry check)
 * Returns { exp: number, ... } or null if invalid
 */
function decodeJWT(token: string): { exp?: number; [key: string]: any } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64 decode the payload (second part)
    const payload = parts[1];
    const decoded = decodeBase64Url(payload);
    return JSON.parse(decoded);
  } catch (e) {
    console.error('[AUTH] Failed to decode JWT:', e);
    return null;
  }
}

/**
 * Check if JWT is expired
 */
function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true; // Assume expired if we can't decode
  }

  // exp is in seconds, Date.now() is in milliseconds
  const now = Math.floor(Date.now() / 1000);
  return now >= decoded.exp;
}

const authStore = create<AuthStoreState & AuthStoreActions>((set, get) => ({
  ...initialState,

  /**
   * Initialize auth state from stored token
   * Called on app startup
   */
  initialize: async () => {
    try {
      const [token, username, authMethod] = await Promise.all([
        tokenStorage.getToken(),
        tokenStorage.getUsername(),
        tokenStorage.getAuthMethod(),
      ]);

      if (!token) {
        console.debug('[AUTH] No stored token found');
        return;
      }

      // Check if token is expired
      if (isTokenExpired(token)) {
        console.debug('[AUTH] Token expired — logging out');
        await get().logout();
        return;
      }

      // Token is valid - restore session
      const decoded = decodeJWT(token);
      const expiryDate = decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : 'unknown';
      console.debug(`[AUTH] Token found, expiry: ${expiryDate}`);

      setApiToken(token);
      set({
        isLoggedIn: true,
        username,
        authMethod: authMethod ?? 'email',
        currentUser: username ? { username } : null,
      });
    } catch (error) {
      console.error('[AUTH] Initialize failed:', error);
      await get().logout();
    }
  },

  /**
   * Login with email and password
   */
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const { accessToken, username } = await authService.login(email, password);

      // Store auth payload securely
      await Promise.all([
        tokenStorage.setToken(accessToken),
        tokenStorage.setUsername(username),
        tokenStorage.setAuthMethod('email'),
      ]);

      // Update API client
      setApiToken(accessToken);

      // Update state
      set({
        isLoggedIn: true,
        username,
        authMethod: 'email',
        currentUser: { username },
        error: null,
        isLoading: false,
      });
    } catch (error: any) {
      // Handle both AuthError instances and regular errors
      const errorMsg = error?.message || (error instanceof Error ? error.message : String(error));
      const errorCode = error?.code || 'UNKNOWN';

      set({
        isLoggedIn: false,
        error: {
          message: errorMsg,
          code: errorCode,
        },
        isLoading: false,
      });
    }
  },

  /**
   * Complete login using an already-exchanged app JWT from social auth.
   * Call this after the social provider flow succeeds and the backend has
   * returned an access_token via /api/social_login.
   */
  loginWithSocialToken: async (authData: { accessToken: string; username: string; authMethod: 'google' | 'facebook' | 'apple' }) => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        tokenStorage.setToken(authData.accessToken),
        tokenStorage.setUsername(authData.username),
        tokenStorage.setAuthMethod(authData.authMethod),
      ]);
      setApiToken(authData.accessToken);
      set({
        isLoggedIn: true,
        username: authData.username,
        authMethod: authData.authMethod,
        currentUser: { username: authData.username },
        error: null,
        isLoading: false,
      });
    } catch (error: any) {
      const errorMsg = error?.message ?? String(error);
      set({
        isLoggedIn: false,
        error: { message: errorMsg, code: 'SOCIAL_LOGIN_FAILED' },
        isLoading: false,
      });
    }
  },

  /**
   * Register a new user
   */
  register: async (username: string, password: string, email: string) => {
    set({ isLoading: true, error: null });

    try {
      await authService.register(username, password, email);

      set({
        pendingVerification: true,
        error: null,
        isLoading: false,
      });
    } catch (error: any) {
      // Handle both AuthError instances and regular errors
      const errorMsg = error?.message || (error instanceof Error ? error.message : String(error));
      const errorCode = error?.code || 'UNKNOWN';

      set({
        pendingVerification: false,
        error: {
          message: errorMsg,
          code: errorCode,
        },
        isLoading: false,
      });
    }
  },

  /**
   * Confirm user email with verification token
   */
  confirm: async (token: string) => {
    set({ isLoading: true, error: null });

    try {
      await authService.confirm(token);

      set({
        pendingVerification: false,
        error: null,
        isLoading: false,
      });
    } catch (error: any) {
      // Handle both AuthError instances and regular errors
      const errorMsg = error?.message || (error instanceof Error ? error.message : String(error));
      const errorCode = error?.code || 'UNKNOWN';

      set({
        error: {
          message: errorMsg,
          code: errorCode,
        },
        isLoading: false,
      });
    }
  },

  /**
   * Logout - clear token and reset state
   */
  logout: async () => {
    try {
      await Promise.all([
        tokenStorage.clearToken(),
        tokenStorage.clearUsername(),
        tokenStorage.clearAuthMethod(),
      ]);
      setApiToken(null);

      set({
        isLoggedIn: false,
        username: null,
        authMethod: null,
        currentUser: null,
        error: null,
        isLoading: false,
        pendingVerification: false,
      });
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
      // Force clear state even if storage fails
      set({
        isLoggedIn: false,
        username: null,
        authMethod: null,
        currentUser: null,
        error: null,
        isLoading: false,
        pendingVerification: false,
      });
    }
  },

  /**
   * Handle session expiry - set error and logout
   */
  handleSessionExpired: () => {
    // Set error and clear token/session
    try {
      tokenStorage.clearToken();
      tokenStorage.clearUsername();
      tokenStorage.clearAuthMethod();
      setApiToken(null);

      set({
        isLoggedIn: false,
        username: null,
        authMethod: null,
        currentUser: null,
        error: {
          message: 'Your session has expired. Please log in again.',
          code: 'SESSION_EXPIRED',
        },
        isLoading: false,
        pendingVerification: false,
      });
    } catch (error) {
      console.error('[AUTH] Failed to handle session expiry:', error);
      // Still set the error even if cleanup fails
      set({
        error: {
          message: 'Your session has expired. Please log in again.',
          code: 'SESSION_EXPIRED',
        },
      });
    }
  },

  /**
   * Clear the current error
   */
  clearError: () => {
    set({ error: null });
  },
}));

export default authStore;
