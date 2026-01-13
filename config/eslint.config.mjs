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
      'dist-redix/**',
      'tauri-migration/dist/**',
      'node_modules/**',
      'stubs/**',
      '.github/**',
      '**/*.cjs',
      'scripts/**',
      'tools/**',
      'src/plugins/examples/**',
      'tests/**',
      'tauri-migration/src-tauri/target/**',
      'src-tauri/target/**',
      'storybook-static/**',
      '**/storybook-static/**',
      'coverage/**',
      '*.min.js',
      '*.bundle.js',
      'playwright-report/**',
      'test-results/**',
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
      'no-self-assign': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // Service worker files
    files: ['**/*.sw.js', '**/sw.js', '**/service-worker.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        Cache: 'readonly',
        CacheStorage: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  {
    // Node.js files (CommonJS and ESM)
    files: ['**/*.js', '**/*.mjs', 'server/**/*', 'scripts/**/*', '.eslintrc*.js', 'lint-staged.config.js', 'tools/**/*.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  {
    // Storybook files
    files: ['.storybook/**/*.ts', '.storybook/**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        projectService: false,
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
);

