// Jest setup file
import '@testing-library/react-native/extend-expect';

// Mock react-native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Expo modules
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
