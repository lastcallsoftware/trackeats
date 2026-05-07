/**
 * Secure token storage using expo-secure-store
 * Handles all token persistence with proper error handling
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USERNAME_KEY = 'auth_username';
const SOCIAL_SEED_PROMPT_SEEN_KEY = 'social_seed_prompt_seen';

/**
 * Stores a token securely in SecureStore
 * @throws Error with descriptive message if storage fails
 */
export async function setToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    const originalError = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to store token: ${originalError}`);
  }
}

/**
 * Retrieves the stored token from SecureStore
 * @returns Token string or null if no token stored
 * @throws Error with descriptive message if retrieval fails
 */
export async function getToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token ?? null;
  } catch (error) {
    const originalError = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve token: ${originalError}`);
  }
}

/**
 * Clears the stored token from SecureStore
 * @throws Error with descriptive message if deletion fails
 */
export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    const originalError = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clear token: ${originalError}`);
  }
}

/**
 * Stores a username in SecureStore
 */
export async function setUsername(username: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(USERNAME_KEY, username);
  } catch (error) {
    const originalError = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to store username: ${originalError}`);
  }
}

/**
 * Retrieves the stored username from SecureStore
 */
export async function getUsername(): Promise<string | null> {
  try {
    const username = await SecureStore.getItemAsync(USERNAME_KEY);
    return username ?? null;
  } catch (error) {
    const originalError = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve username: ${originalError}`);
  }
}

/**
 * Clears the stored username from SecureStore
 */
export async function clearUsername(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(USERNAME_KEY);
  } catch (error) {
    const originalError = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clear username: ${originalError}`);
  }
}

/**
 * Tracks whether the user has already been asked the one-time social seed prompt.
 */
export async function getSocialSeedPromptSeen(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(SOCIAL_SEED_PROMPT_SEEN_KEY);
    return value === 'true';
  } catch (error) {
    const originalError = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve social seed prompt state: ${originalError}`);
  }
}

/**
 * Persists whether the one-time social seed prompt has already been shown.
 */
export async function setSocialSeedPromptSeen(value: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(SOCIAL_SEED_PROMPT_SEEN_KEY, value ? 'true' : 'false');
  } catch (error) {
    const originalError = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to store social seed prompt state: ${originalError}`);
  }
}
