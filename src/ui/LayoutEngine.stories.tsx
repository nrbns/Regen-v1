import type { Meta, StoryObj } from '@storybook/react';
import {
  LayoutEngine,
  LayoutHeader,
  LayoutBody,
  LayoutFooter,
  LayoutSection,
  LayoutGrid,
} from './layout-engine';
import { SkeletonCard, SkeletonList } from './skeleton';

const meta: Meta<typeof LayoutEngine> = {
  title: 'Layout/LayoutEngine',
  component: LayoutEngine,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof LayoutEngine>;

export const Default: Story = {
  render: () => (
    <LayoutEngine sidebarWidth={240} navHeight={64} data-testid="layout-engine-root">
      <LayoutHeader>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <h2>Header</h2>
        </div>
      </LayoutHeader>
      <LayoutBody sidebar={<div style={{ padding: '1rem' }}>Sidebar</div>}>
        <LayoutSection spacing="md" padded>
          <h1>Main Content</h1>
          <p>This is the main content area with consistent spacing and padding.</p>
        </LayoutSection>
      </LayoutBody>
      <LayoutFooter>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--surface-border)' }}>Footer</div>
      </LayoutFooter>
    </LayoutEngine>
  ),
};

export const WithRightPanel: Story = {
  render: () => (
    <LayoutEngine sidebarWidth={240} navHeight={64} rightPanelWidth={320}>
      <LayoutHeader>
        <div style={{ padding: '1rem' }}>Header</div>
      </LayoutHeader>
      <LayoutBody
        sidebar={<div style={{ padding: '1rem' }}>Left Sidebar</div>}
        rightPanel={<div style={{ padding: '1rem' }}>Right Panel</div>}
      >
        <LayoutSection spacing="md" padded>
          <h1>Main Content</h1>
          <p>Content with both sidebars.</p>
        </LayoutSection>
      </LayoutBody>
    </LayoutEngine>
  ),
};

export const WithSkeleton: Story = {
  render: () => (
    <LayoutEngine sidebarWidth={240} navHeight={64}>
      <LayoutHeader>
        <div style={{ padding: '1rem' }}>Header</div>
      </LayoutHeader>
      <LayoutBody sidebar={<SkeletonList items={5} />}>
        <LayoutSection spacing="md" padded>
          <h1>Loading Content</h1>
          <LayoutGrid cols={3} gap="md">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </LayoutGrid>
        </LayoutSection>
      </LayoutBody>
    </LayoutEngine>
  ),
};

export const ResponsiveGrid: Story = {
  render: () => (
    <LayoutEngine sidebarWidth={240} navHeight={64}>
      <LayoutHeader>
        <div style={{ padding: '1rem' }}>Header</div>
      </LayoutHeader>
      <LayoutBody>
        <LayoutSection spacing="lg" padded>
          <h1>Responsive Grid</h1>
          <LayoutGrid cols={3} gap="md">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  padding: '1rem',
                  background: 'var(--surface-panel)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                Card {i + 1}
              </div>
            ))}
          </LayoutGrid>
        </LayoutSection>
      </LayoutBody>
    </LayoutEngine>
  ),
};
