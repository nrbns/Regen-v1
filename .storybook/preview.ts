import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/styles/globals.css';
import '../src/styles/theme.css';
import '../src/styles/design-system.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
  decorators: [
    (Story: React.ComponentType) => {
      return React.createElement(
        'div',
        { style: { padding: '2rem', minHeight: '100vh', background: 'var(--surface-root)' } },
        React.createElement(Story)
      );
    },
  ],
};

export default preview;
