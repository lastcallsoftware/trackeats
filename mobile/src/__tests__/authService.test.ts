jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import api from '@/services/api';
import * as authService from '@/services/authService';

const mockApi = api as jest.Mocked<typeof api>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resendConfirmation', () => {
    it('posts the expired token to the resend confirmation endpoint', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { msg: 'sent' } } as never);

      await authService.resendConfirmation('expired-token-123');

      expect(mockApi.post).toHaveBeenCalledWith('/api/resend_confirmation', { token: 'expired-token-123' });
    });

    it('maps a 404 response to INVALID_TOKEN', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { msg: 'Invalid confirmation token' },
        },
      });

      await expect(authService.resendConfirmation('bad-token')).rejects.toMatchObject({
        message: 'Invalid confirmation token',
        code: 'INVALID_TOKEN',
      });
    });

    it('maps a 409 response to ALREADY_CONFIRMED', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 409,
          data: { msg: "User 'user1' has already been confirmed" },
        },
      });

      await expect(authService.resendConfirmation('confirmed-token')).rejects.toMatchObject({
        message: "User 'user1' has already been confirmed",
        code: 'ALREADY_CONFIRMED',
      });
    });
  });
});