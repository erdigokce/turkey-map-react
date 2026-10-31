module.exports = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Only files explicitly named as tests are collected. This keeps fixtures
  // and helpers next to the tests without Jest treating them as test suites.
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  // Artifact tests run separately after a build, with jest.artifact.config.js.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/artifact/'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/test-fixtures/**',
  ],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 95,
      functions: 100,
      lines: 100,
    },
  },
};
