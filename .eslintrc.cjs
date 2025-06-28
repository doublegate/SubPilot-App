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
  overrides: [
    {
      files: [
        '**/__tests__/**/*',
        '**/*.test.*',
        '**/test-utils.ts',
        '**/subscription-detector.ts',
        '**/middleware/performance.ts',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-base-to-string': 'off',
        '@typescript-eslint/no-redundant-type-constituents': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/unbound-method': 'off',
        '@typescript-eslint/no-empty-function': 'off',
      },
    },
  ],
};

module.exports = config;
