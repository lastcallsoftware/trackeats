/**
 * Zustand auth store - manages authentication state and actions
 * Token is not stored in state - it lives only in SecureStore + api.ts module variable
 */

import { create } from 'zustand';
import * as tokenStorage from '@/services/tokenStorage';
import { setApiToken } from '@/services/api';
import * as authService from '@/services/authService';

export interface AuthError {
  message: string;
  code: string;
}

export interface AuthStoreState {
  isLoggedIn: boolean;
  username: string | null;
  error: AuthError | null;
  isLoading: boolean;
  pendingVerification: boolean;
}

export interface AuthStoreActions {
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocialToken: (appToken: string) => Promise<void>;
  register: (username: string, password: string, email: string) => Promise<void>;
  confirm: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  handleSessionExpired: () => void;
  clearError: () => void;
}

const initialState: AuthStoreState = {
  isLoggedIn: false,
  username: null,
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
      const token = await tokenStorage.getToken();

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
        // Username would need to be stored separately or extracted from JWT
        // For now, we'll set it during login
        username: decoded?.sub || null,
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
      const token = await authService.login(email, password);

      // Store token securely
      await tokenStorage.setToken(token);

      // Update API client
      setApiToken(token);

      // Extract email from JWT token for display (using email as the subject)
      // The JWT identity is now the email address
      const decoded = decodeJWT(token);
      const displayEmail = decoded?.sub || email;

      // Update state
      set({
        isLoggedIn: true,
        username: displayEmail,  // Store email in username field for now (state field name kept for compatibility)
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
  loginWithSocialToken: async (appToken: string) => {
    set({ isLoading: true, error: null });
    try {
      await tokenStorage.setToken(appToken);
      setApiToken(appToken);
      const decoded = decodeJWT(appToken);
      const displayName = decoded?.sub ?? null;
      set({ isLoggedIn: true, username: displayName, error: null, isLoading: false });
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
      await tokenStorage.clearToken();
      setApiToken(null);

      set({
        isLoggedIn: false,
        username: null,
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
      setApiToken(null);

      set({
        isLoggedIn: false,
        username: null,
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
