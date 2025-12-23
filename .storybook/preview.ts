import type { Preview } from '@storybook/react';
import '../src/styles/globals.css';
import '../src/styles/mode-themes.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#020617',
        },
        {
          name: 'light',
          value: '#ffffff',
        },
      ],
    },
    layout: 'fullscreen',
  },
};

export default preview;
