import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton, SkeletonText, SkeletonCard, SkeletonList, SkeletonTable } from './skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  render: () => <Skeleton variant="rectangular" width={200} height={40} />,
};

export const Text: Story = {
  render: () => <SkeletonText lines={3} />,
};

export const Circular: Story = {
  render: () => <Skeleton variant="circular" width={40} height={40} />,
};

export const Card: Story = {
  render: () => <SkeletonCard data-testid="skeleton-card" />,
};

export const List: Story = {
  render: () => <SkeletonList items={5} />,
};

export const Table: Story = {
  render: () => <SkeletonTable rows={5} cols={4} />,
};

export const MultipleCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  ),
};
