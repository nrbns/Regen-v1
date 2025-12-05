/**
 * Storybook stories for ModeTabs component
 */
import type { Meta, StoryObj } from '@storybook/react';
import { ModeTabs } from './ModeTabs';
declare const meta: Meta<typeof ModeTabs>;
export default meta;
type Story = StoryObj<typeof ModeTabs>;
export declare const Default: Story;
export declare const Compact: Story;
export declare const WithModeChange: Story;
