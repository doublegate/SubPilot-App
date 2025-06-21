/** @type {import("eslint").Linter.Config} */
const config = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
  ],
  rules: {
    // TypeScript rules
    '@typescript-eslint/array-type': 'off',
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      },
    ],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: { attributes: false },
      },
    ],
    // React rules
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    // Next.js specific
    '@next/next/no-html-link-for-pages': 'off',
  },
  ignorePatterns: [
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
    '.eslintrc.cjs',
    'env.js',
  ],
};

module.exports = config;
