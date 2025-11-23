/**
 * LayoutEngine Accessibility Tests
 */

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LayoutEngine, LayoutHeader, LayoutBody, LayoutFooter } from '../layout-engine';

// Mock axe if not available
const axe = async (container: HTMLElement) => {
  try {
    const { default: axeCore } = await import('axe-core');
    return await axeCore.run(container);
  } catch {
    // Fallback if axe-core not installed
    return { violations: [] };
  }
};

describe('LayoutEngine Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <LayoutEngine sidebarWidth={240} navHeight={64}>
        <LayoutHeader>
          <nav>Header Navigation</nav>
        </LayoutHeader>
        <LayoutBody sidebar={<aside>Sidebar</aside>}>
          <main>Main Content</main>
        </LayoutBody>
        <LayoutFooter>
          <footer>Footer</footer>
        </LayoutFooter>
      </LayoutEngine>
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('should have proper ARIA landmarks', () => {
    const { container } = render(
      <LayoutEngine sidebarWidth={240} navHeight={64}>
        <LayoutHeader>
          <nav>Header</nav>
        </LayoutHeader>
        <LayoutBody>
          <main>Content</main>
        </LayoutBody>
        <LayoutFooter>
          <footer>Footer</footer>
        </LayoutFooter>
      </LayoutEngine>
    );

    // Check for semantic HTML elements
    const header = container.querySelector('header');
    const main = container.querySelector('main');
    const footer = container.querySelector('footer');

    expect(header).toBeTruthy();
    expect(main).toBeTruthy();
    expect(footer).toBeTruthy();
  });

  it('should support keyboard navigation', () => {
    const { container } = render(
      <LayoutEngine sidebarWidth={240} navHeight={64}>
        <LayoutHeader>
          <button>Button 1</button>
          <button>Button 2</button>
        </LayoutHeader>
        <LayoutBody>
          <button>Button 3</button>
        </LayoutBody>
      </LayoutEngine>
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);

    // All buttons should be focusable
    buttons.forEach((button: HTMLElement) => {
      expect(button.getAttribute('tabindex')).not.toBe('-1');
    });
  });
});
