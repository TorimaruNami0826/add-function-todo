/** @type {import('jest').Config} */
const config = {
  coverageReporters: ['lcov', 'text'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/db/pool.js',
  ],
  projects: [
    {
      displayName: 'backend123',
      testEnvironment: 'mode',
      testMatch: ['<rootDir>/tests/backend/**/*.test.js', '<rootDir>/tests/routes/**/*.test.js'],
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/frontend/**/*.test.js'],
      setupFiles: ['<rootDir>/tests/frontend/setup.js'],
    },
  ],
};

module.exports = config;
