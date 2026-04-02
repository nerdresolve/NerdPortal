'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/env.setup.js'],
  testTimeout: 15000,
  collectCoverageFrom: [
    'middlewares/**/*.js',
    'controllers/**/*.js',
    'routes/**/*.js',
    'services/**/*.js',
    'dal/**/*.js',
    '!dal/db.js',
  ],
  coverageReporters: ['text', 'lcov'],
};
