import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SystemBar } from './SystemBar';

const meta: Meta<typeof SystemBar> = {
  title: 'Components/SystemBar',
  component: SystemBar,
};

export default meta;
type Story = StoryObj<typeof SystemBar>;

export const Default: Story = {
  render: () => <div style={{ padding: 16, background: '#0F1115' }}><SystemBar /></div>,
};
