/* eslint-disable no-undef */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(@openshift-console|@patternfly))'],
  coverageDirectory: '<rootDir>/coverage/cov-jest',
};
