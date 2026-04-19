/**
 * Mock for expo-secure-store module
 */

const storage: Record<string, string> = {};

export const setItemAsync = jest.fn().mockImplementation((key: string, value: string) => {
  storage[key] = value;
  return Promise.resolve();
});

export const getItemAsync = jest.fn().mockImplementation((key: string) => {
  return Promise.resolve(storage[key] || null);
});

export const deleteItemAsync = jest.fn().mockImplementation((key: string) => {
  delete storage[key];
  return Promise.resolve();
});
