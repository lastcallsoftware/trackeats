/**
 * Smoke test to verify TypeScript path alias and test harness work end-to-end
 */

describe('Smoke Test: TypeScript path alias and test harness', () => {
  it('should resolve @/ path alias correctly', () => {
    // The module exists and can be imported at the path
    const authTypes = require('@/types/auth');
    expect(authTypes).toBeDefined();
  });

  it('should have auth module available', () => {
    // Verify the module loads without errors
    const authModule = require('@/types/auth');
    // TypeScript interfaces don't exist at runtime, but the module should load
    expect(typeof authModule).toBe('object');
  });

  it('test framework works', () => {
    expect(1 + 1).toBe(2);
  });
});
