/* eslint-disable no-undef */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(@openshift-console|@patternfly))'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/styleMock.js',
  },
  coverageDirectory: '<rootDir>/coverage/cov-jest',
};
