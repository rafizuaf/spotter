module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.js'],
  transform: {},
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
  ],
};
