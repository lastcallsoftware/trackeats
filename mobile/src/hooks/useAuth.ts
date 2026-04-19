/**
 * useAuth hook - provides access to auth state and actions
 * Thin wrapper over the Zustand store
 */

import authStore, { AuthStoreState, AuthStoreActions } from '@/store/authStore';

export function useAuth(): AuthStoreState & AuthStoreActions {
  return authStore();
}
