/**
 * Axios instance with JWT interceptor and session expiry handling
 * All API calls should use this instance
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Module-level token storage - updated via setApiToken()
let currentToken: string | null = null;

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000',
  timeout: 10000,
});

/**
 * Set the current token for API requests
 * Called by auth store after login/logout
 */
export function setApiToken(token: string | null): void {
  currentToken = token;
}

/**
 * Request interceptor: inject Authorization header with current token
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: handle 401 session expiry
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 session expired
    if (error?.response?.status === 401) {
      console.warn('[AUTH] 401 received — triggering session expiry');

      // Clear the current token
      currentToken = null;

      // Lazily import authStore to avoid circular dependency
      // Call handleSessionExpired on the store
      try {
        const { default: authStore } = require('@/store/authStore');
        authStore.getState().handleSessionExpired();
      } catch (e) {
        console.error('[AUTH] Failed to call handleSessionExpired:', e);
      }

      // Reject with SESSION_EXPIRED error
      return Promise.reject({
        code: 'SESSION_EXPIRED',
        message: 'Your session has expired. Please log in again.',
      });
    }

    return Promise.reject(error);
  }
);

export default api;
