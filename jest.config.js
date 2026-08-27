export default {
  // Test environment
  testEnvironment: "node",

  // Stop running tests after failures
  bail: true,

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "./tests/coverage",

  // Coverage reporters
  coverageReporters: ["text", "lcov", "json-summary"],

  // Test match patterns
  testMatch: ["**/tests/**/*.test.js", "**/?(*.)+(spec|test).js"],

  // Babel-transform our code and ESM @dwtechs deps (hashitaka → checkard)
  transform: {
    "^.+\\.js$": "babel-jest",
  },

  // Transform ES modules from node_modules
  transformIgnorePatterns: ["/node_modules/(?!(@dwtechs)/)"],

  // Coverage settings
  collectCoverageFrom: ["src/**/*.js", "!src/app.js", "!**/node_modules/**"],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,
};
