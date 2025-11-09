import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-web/**',
      'dist-electron/**',
      'dist-release/**',
      'node_modules/**',
      'stubs/**',
      '.github/**',
      '**/*.cjs',
      'scripts/**',
      'src/plugins/examples/**',
      'tests/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        projectService: false,
      },
    },
    plugins: {
      react,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      'no-undef': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'no-constant-condition': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'prefer-const': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
);

