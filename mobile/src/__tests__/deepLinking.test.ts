/**
 * Tests for deep-linking utilities
 */

import { parseVerifyToken } from '../utils/deepLinking';

describe('deepLinking', () => {
  describe('parseVerifyToken', () => {
    it('should extract token from trackeats://verify?token=abc123', () => {
      const token = parseVerifyToken('trackeats://verify?token=abc123');
      expect(token).toBe('abc123');
    });

    it('should extract token from https://trackeats.app/confirm?token=xyz', () => {
      const token = parseVerifyToken('https://trackeats.app/confirm?token=xyz');
      expect(token).toBe('xyz');
    });

    it('should return null for non-verify URLs like trackeats://home', () => {
      const token = parseVerifyToken('trackeats://home');
      expect(token).toBeNull();
    });

    it('should return null when URL is null', () => {
      const token = parseVerifyToken(null);
      expect(token).toBeNull();
    });

    it('should return null when URL has no token parameter', () => {
      const token = parseVerifyToken('trackeats://verify');
      expect(token).toBeNull();
    });

    it('should handle verify path with trailing slash', () => {
      const token = parseVerifyToken('trackeats://verify/?token=test123');
      expect(token).toBe('test123');
    });

    it('should handle complex token values with special characters', () => {
      const token = parseVerifyToken('trackeats://verify?token=abc123_xyz-DEF');
      expect(token).toBe('abc123_xyz-DEF');
    });
  });
});
