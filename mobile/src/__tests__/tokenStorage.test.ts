/**
 * Tests for tokenStorage.ts
 * Mocks expo-secure-store and tests all token operations
 */

import * as tokenStorage from '@/services/tokenStorage';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('tokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setToken', () => {
    it('should store token in SecureStore', async () => {
      mockSecureStore.setItemAsync.mockResolvedValueOnce(undefined);

      await tokenStorage.setToken('test-token-123');

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'test-token-123');
    });

    it('should throw descriptive error when SecureStore fails', async () => {
      const originalError = new Error('SecureStore not available');
      mockSecureStore.setItemAsync.mockRejectedValueOnce(originalError);

      await expect(tokenStorage.setToken('test-token')).rejects.toThrow(
        'Failed to store token: SecureStore not available'
      );
    });
  });

  describe('getToken', () => {
    it('should retrieve token from SecureStore', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('stored-token-456');

      const token = await tokenStorage.getToken();

      expect(token).toBe('stored-token-456');
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
    });

    it('should return null when no token is stored', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const token = await tokenStorage.getToken();

      expect(token).toBeNull();
    });

    it('should throw descriptive error when retrieval fails', async () => {
      const originalError = new Error('Storage access denied');
      mockSecureStore.getItemAsync.mockRejectedValueOnce(originalError);

      await expect(tokenStorage.getToken()).rejects.toThrow(
        'Failed to retrieve token: Storage access denied'
      );
    });
  });

  describe('clearToken', () => {
    it('should clear token from SecureStore', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValueOnce(undefined);

      await tokenStorage.clearToken();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
    });

    it('should throw descriptive error when deletion fails', async () => {
      const originalError = new Error('Cannot delete');
      mockSecureStore.deleteItemAsync.mockRejectedValueOnce(originalError);

      await expect(tokenStorage.clearToken()).rejects.toThrow(
        'Failed to clear token: Cannot delete'
      );
    });
  });
});
