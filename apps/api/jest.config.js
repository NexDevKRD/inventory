module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/test/**/*.test.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
};
