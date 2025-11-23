/**
 * Skeleton Component Tests
 */

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonCard, SkeletonText } from '../skeleton';

describe('Skeleton Components', () => {
  it('should render Skeleton with correct variant', () => {
    const { container } = render(<Skeleton variant="rectangular" width={200} height={40} />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toBeTruthy();
    expect(skeleton.className).toContain('rounded');
  });

  it('should render SkeletonCard', () => {
    const { container } = render(<SkeletonCard />);
    const card = container.firstChild as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.className).toContain('rounded-xl');
  });

  it('should render SkeletonText with correct number of lines', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const lines = container.querySelectorAll('.bg-slate-800');
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('should have aria-busy attribute during loading', () => {
    const { container } = render(<Skeleton variant="rectangular" />);
    const skeleton = container.firstChild as HTMLElement;
    // Skeleton should indicate loading state for screen readers
    expect(skeleton.getAttribute('aria-busy')).toBe('true');
  });
});
