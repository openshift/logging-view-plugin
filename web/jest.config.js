/* eslint-disable no-undef */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '\\.[jt]sx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!(@openshift-console|@patternfly))'],
  coverageDirectory: '<rootDir>/coverage/cov-jest',
};
