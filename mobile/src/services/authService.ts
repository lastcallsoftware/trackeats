/**
 * Auth service - communicates with backend auth endpoints
 * Handles all auth API calls and error mapping
 */

import api from './api';
import { AuthError } from '@/types/auth';

/**
 * Register a new user
 * @throws AuthError with backend message on failure
 */
export async function register(
  username: string,
  password: string,
  email: string,
  seedRequested?: boolean
): Promise<void> {
  try {
    await api.post('/api/register', {
      username,
      password,
      email,
      seed_requested: seedRequested ?? false,
    });
  } catch (error: any) {
    const message = error?.response?.data?.msg || error?.message || 'Registration failed';
    const code = mapStatusToCode(error?.response?.status ?? 0);
    throw new AuthError(message, code);
  }
}

/**
 * Confirm user email with verification token
 * @returns Object with username
 * @throws AuthError with mapped status code on failure
 */
export async function confirm(token: string): Promise<{ username: string }> {
  try {
    const response = await api.get('/api/confirm', {
      params: { token },
    });
    return {
      username: response.data.username,
    };
  } catch (error: any) {
    const status = error?.response?.status ?? 0;
    const message = error?.response?.data?.msg || error?.message || 'Confirmation failed';

    // Map specific status codes to meaningful error codes
    let code = 'UNKNOWN';
    if (status === 401) {
      code = 'INVALID_TOKEN';
    } else if (status === 403) {
      code = 'EXPIRED_TOKEN';
    } else if (status === 400) {
      code = 'MISSING_TOKEN';
    }

    throw new AuthError(message, code);
  }
}

/**
 * Log in user with credentials
 * @returns Access token string
 * @throws AuthError on failure
 */
export async function login(username: string, password: string): Promise<string> {
  try {
    const response = await api.post('/api/login', {
      username,
      password,
    });

    const token = response.data.access_token;
    if (!token) {
      throw new AuthError('No token received from server', 'NO_TOKEN');
    }

    return token;
  } catch (error: any) {
    // If it's already an AuthError, re-throw it
    if (error instanceof AuthError) {
      throw error;
    }

    const status = error?.response?.status ?? 0;
    const message = error?.response?.data?.msg || error?.message || 'Login failed';
    const code = mapStatusToCode(status);

    throw new AuthError(message, code);
  }
}

/**
 * Map HTTP status codes to AuthError codes
 */
function mapStatusToCode(status: number): string {
  switch (status) {
    case 401:
      return 'INVALID_CREDENTIALS';
    case 403:
      return 'FORBIDDEN';
    case 422:
      return 'VALIDATION_ERROR';
    case 0:
      return 'NETWORK_ERROR';
    default:
      return 'UNKNOWN';
  }
}


