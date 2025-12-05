/**
 * Storybook stories for TopBar component
 */
import type { Meta, StoryObj } from '@storybook/react';
import { TopBar } from './TopBar';
declare const meta: Meta<typeof TopBar>;
export default meta;
type Story = StoryObj<typeof TopBar>;
export declare const Default: Story;
export declare const Compact: Story;
export declare const WithoutAddressBar: Story;
export declare const Minimal: Story;
