/**
 * Shared authentication TypeScript interfaces
 */

export class AuthError extends Error {
  code: string;
  message: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.message = message;
    this.code = code;
  }
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  error: AuthError | null;
  loading: boolean;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface ConfirmRequest {
  email: string;
  token: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}
