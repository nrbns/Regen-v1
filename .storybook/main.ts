import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: [
    '../tauri-migration/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    builder: '@storybook/builder-vite',
  },
  async viteFinal(config) {
    // Merge with project Vite config
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@': new URL('../tauri-migration/src', import.meta.url).pathname,
          '@components': new URL('../tauri-migration/src/components', import.meta.url).pathname,
          '@lib': new URL('../tauri-migration/src/lib', import.meta.url).pathname,
          '@state': new URL('../tauri-migration/src/state', import.meta.url).pathname,
          '@modes': new URL('../tauri-migration/src/modes', import.meta.url).pathname,
        },
      },
    });
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
