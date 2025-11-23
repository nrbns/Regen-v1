/**
 * Storybook stories for ModeTabs component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ModeTabs } from './ModeTabs';

const meta: Meta<typeof ModeTabs> = {
  title: 'UI/ModeTabs',
  component: ModeTabs,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ModeTabs>;

export const Default: Story = {
  args: {
    compact: false,
  },
};

export const Compact: Story = {
  args: {
    compact: true,
  },
};

export const WithModeChange: Story = {
  args: {
    onModeChange: (mode: string) => {
      console.log('Mode changed to:', mode);
    },
  },
};
