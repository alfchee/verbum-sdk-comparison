module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off', // Disable for build
    '@typescript-eslint/no-unused-vars': 'warn',
  },
};