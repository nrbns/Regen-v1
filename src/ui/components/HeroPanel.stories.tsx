/**
 * Storybook stories for HeroPanel component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { HeroPanel } from './HeroPanel';

const meta: Meta<typeof HeroPanel> = {
  title: 'UI/HeroPanel',
  component: HeroPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof HeroPanel>;

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

export const WithQuickAction: Story = {
  args: {
    onQuickAction: (action: string) => {
      console.log('Quick action:', action);
    },
  },
};
