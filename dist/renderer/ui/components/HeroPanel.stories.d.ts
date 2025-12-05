/**
 * Storybook stories for HeroPanel component
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HeroPanel } from './HeroPanel';
declare const meta: Meta<typeof HeroPanel>;
export default meta;
type Story = StoryObj<typeof HeroPanel>;
export declare const Default: Story;
export declare const Compact: Story;
export declare const WithQuickAction: Story;
