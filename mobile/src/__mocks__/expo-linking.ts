/**
 * Mock for expo-linking module
 */

export const getInitialURL = jest.fn().mockResolvedValue(null);

export const addEventListener = jest.fn().mockReturnValue({
  remove: jest.fn(),
});

export const openURL = jest.fn().mockResolvedValue(true);

export const canOpenURL = jest.fn().mockResolvedValue(true);
