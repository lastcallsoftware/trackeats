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
 * Resend confirmation email using an expired confirmation token
 * @throws AuthError with backend message on failure
 */
export async function resendConfirmation(token: string): Promise<void> {
  try {
    await api.post('/api/resend_confirmation', { token });
  } catch (error: any) {
    const status = error?.response?.status ?? 0;
    const message = error?.response?.data?.msg || error?.message || 'Failed to resend confirmation email';
    let code = mapStatusToCode(status);
    if (status === 404) {
      code = 'INVALID_TOKEN';
    } else if (status === 409) {
      code = 'ALREADY_CONFIRMED';
    } else if (status === 503) {
      code = 'EMAIL_UNAVAILABLE';
    }

    throw new AuthError(message, code);
  }
}

/**
 * Log in user with credentials
 * @returns Access token and username
 * @throws AuthError on failure
 */
export async function login(email: string, password: string): Promise<{ accessToken: string; username: string }> {
  try {
    const response = await api.post('/api/login', {
      email,
      password,
    });

    const token = response.data.access_token;
    const username = response.data.username;
    if (!token) {
      throw new AuthError('No token received from server', 'NO_TOKEN');
    }
    if (!username) {
      throw new AuthError('No username received from server', 'NO_USERNAME');
    }

    return { accessToken: token, username };
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
 * Request a password reset email
 * @throws AuthError on failure
 */
export async function requestResetPassword(email: string): Promise<void> {
  try {
    // Pass origin='mobile' to hint that the request came from the mobile app
    // The backend will use this to send the appropriate deep-link URL
    await api.post('/api/request_reset_password', {}, {
      params: { email, origin: 'mobile' },
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    // If it's already an AuthError, re-throw it
    if (error instanceof AuthError) {
      throw error;
    }

    const status = error?.response?.status ?? 0;
    const message = error?.response?.data?.msg || error?.message || 'Failed to request password reset';
    const code = mapStatusToCode(status);

    throw new AuthError(message, code);
  }
}

/**
 * Reset password with reset token
 * @throws AuthError on failure
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  try {
    await api.post('/api/reset_password', {}, {
      params: { token, password: newPassword },
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    // If it's already an AuthError, re-throw it
    if (error instanceof AuthError) {
      throw error;
    }

    const status = error?.response?.status ?? 0;
    const message = error?.response?.data?.msg || error?.message || 'Failed to reset password';

    let code = 'UNKNOWN';
    if (status === 400) {
      // Check if it's a token expiry error
      if (message.toLowerCase().includes('expired')) {
        code = 'EXPIRED_TOKEN';
      } else if (message.toLowerCase().includes('invalid')) {
        code = 'INVALID_TOKEN';
      } else {
        code = 'INVALID_REQUEST';
      }
    } else {
      code = mapStatusToCode(status);
    }

    throw new AuthError(message, code);
  }
}

/**
 * Change password for the currently authenticated user
 * @throws AuthError on failure
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    await api.post('/api/change_password', {}, {
      params: {
        old_password: currentPassword,
        new_password: newPassword,
      },
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      throw error;
    }

    const status = error?.response?.status ?? 0;
    const message = error?.response?.data?.msg || error?.message || 'Failed to change password';
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
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    case 0:
      return 'NETWORK_ERROR';
    default:
      return 'UNKNOWN';
  }
}


