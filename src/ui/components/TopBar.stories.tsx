/**
 * Storybook stories for TopBar component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { TopBar } from './TopBar';

const meta: Meta<typeof TopBar> = {
  title: 'UI/TopBar',
  component: TopBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TopBar>;

export const Default: Story = {
  args: {
    showAddressBar: true,
    showQuickActions: true,
  },
};

export const Compact: Story = {
  args: {
    compact: true,
    showAddressBar: true,
    showQuickActions: true,
  },
};

export const WithoutAddressBar: Story = {
  args: {
    showAddressBar: false,
    showQuickActions: true,
  },
};

export const Minimal: Story = {
  args: {
    showAddressBar: false,
    showQuickActions: false,
    compact: true,
  },
};
