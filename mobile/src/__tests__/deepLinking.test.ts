/**
 * Tests for deep-linking utilities
 */

import { parseVerifyToken } from '../utils/deepLinking';

describe('deepLinking', () => {
  describe('parseVerifyToken', () => {
    it('should extract token from https://trackeats.com/api/confirm?token=abc123', () => {
      const token = parseVerifyToken('https://trackeats.com/api/confirm?token=abc123');
      expect(token).toBe('abc123');
    });

    it('should extract token from https://trackeats.app/api/confirm?token=xyz', () => {
      const token = parseVerifyToken('https://trackeats.app/api/confirm?token=xyz');
      expect(token).toBe('xyz');
    });

    it('should extract token from backend URL path /api/confirm', () => {
      const token = parseVerifyToken('https://api.trackeats.app/api/confirm?token=xyz');
      expect(token).toBe('xyz');
    });

    it('should return null for non-verify URLs like https://trackeats.com/home', () => {
      const token = parseVerifyToken('https://trackeats.com/home');
      expect(token).toBeNull();
    });

    it('should return null when URL is null', () => {
      const token = parseVerifyToken(null);
      expect(token).toBeNull();
    });

    it('should return null when URL has no token parameter', () => {
      const token = parseVerifyToken('https://trackeats.com/api/confirm');
      expect(token).toBeNull();
    });

    it('should handle /api/confirm path with trailing slash', () => {
      const token = parseVerifyToken('https://trackeats.com/api/confirm/?token=test123');
      expect(token).toBe('test123');
    });

    it('should handle complex token values with special characters', () => {
      const token = parseVerifyToken('https://trackeats.com/api/confirm?token=abc123_xyz-DEF');
      expect(token).toBe('abc123_xyz-DEF');
    });

  });
});
