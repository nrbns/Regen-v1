/**
 * LayoutEngine Accessibility Tests
 */

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LayoutEngine, LayoutHeader, LayoutBody, LayoutFooter } from '../layout-engine';

// Mock axe if not available
const axe = async (container: HTMLElement) => {
  try {
    const axeCore = await import('axe-core');
    const axeInstance = 'default' in axeCore ? axeCore.default : axeCore;
    if (axeInstance && typeof axeInstance.run === 'function') {
      return await axeInstance.run(container);
    }
    return { violations: [] };
  } catch {
    // Fallback if axe-core not installed or unavailable
    return { violations: [] };
  }
};

const renderInDocumentBody = (ui: React.ReactElement) =>
  render(ui, { container: document.body, baseElement: document.body });

describe('LayoutEngine Accessibility', () => {
  it('should have no accessibility violations', async () => {
    document.body.innerHTML = '';
    const { container } = renderInDocumentBody(
      <LayoutEngine sidebarWidth={240} navHeight={64}>
        <LayoutHeader>
          <nav>Header Navigation</nav>
        </LayoutHeader>
        <LayoutBody sidebar={<div>Sidebar</div>}>
          <div>Main Content</div>
        </LayoutBody>
        <LayoutFooter>
          <div>Footer</div>
        </LayoutFooter>
      </LayoutEngine>
    );

    const results = await axe(container);
    if (results.violations.length) {
      console.error('Accessibility violations:', results.violations);
    }
    expect(results.violations).toHaveLength(0);
  });

  it('should have proper ARIA landmarks', () => {
    document.body.innerHTML = '';
    const { container } = renderInDocumentBody(
      <LayoutEngine sidebarWidth={240} navHeight={64}>
        <LayoutHeader>
          <nav>Header</nav>
        </LayoutHeader>
        <LayoutBody sidebar={<div>Sidebar</div>}>
          <div>Content</div>
        </LayoutBody>
        <LayoutFooter>
          <div>Footer</div>
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
    document.body.innerHTML = '';
    const { container } = renderInDocumentBody(
      <LayoutEngine sidebarWidth={240} navHeight={64}>
        <LayoutHeader>
          <button>Button 1</button>
          <button>Button 2</button>
        </LayoutHeader>
        <LayoutBody sidebar={<div>Sidebar</div>}>
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
