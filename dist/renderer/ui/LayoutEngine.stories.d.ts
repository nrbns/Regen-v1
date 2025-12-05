import type { Meta, StoryObj } from '@storybook/react';
import { LayoutEngine } from './layout-engine';
declare const meta: Meta<typeof LayoutEngine>;
export default meta;
type Story = StoryObj<typeof LayoutEngine>;
export declare const Default: Story;
export declare const WithRightPanel: Story;
export declare const WithSkeleton: Story;
export declare const ResponsiveGrid: Story;
