import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopBar } from '../TopBar';
import { useTabsStore } from '../../../state/tabsStore';
import { ipc } from '../../../lib/ipc-typed';

describe('TopBar', () => {
  beforeEach(() => {
    // Reset tabs store before each test
    useTabsStore.setState({ tabs: [], activeId: null });
  });

  test('renders accent bar, notifications and profile', () => {
    render(<TopBar />);
    expect(screen.queryByTitle('Notifications')).toBeInTheDocument();
    expect(screen.queryByTitle('Profile')).toBeInTheDocument();
    // accent bar is hidden on small screens but present in DOM
    const accent = document.querySelector('.h-1.w-24');
    expect(accent).toBeTruthy();
  });

  test('submitting a URL with an active tab calls ipc.tabs.navigate', async () => {
    useTabsStore.setState({
      tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
      activeId: 'tab-1',
    });

    const navigateSpy = vi.spyOn(ipc.tabs, 'navigate').mockImplementation(async () => ({}) as any);

    render(<TopBar />);

    const input = screen.getByLabelText('Address bar') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'example.org' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(navigateSpy).toHaveBeenCalled());
    expect(navigateSpy).toHaveBeenCalledWith('tab-1', 'https://example.org');

    navigateSpy.mockRestore();
  });

  test('submitting a URL without an active tab calls ipc.tabs.create', async () => {
    useTabsStore.setState({ tabs: [], activeId: null });

    const createSpy = vi
      .spyOn(ipc.tabs, 'create')
      .mockImplementation(async () => ({ id: 'new' }) as any);

    render(<TopBar />);

    const input = screen.getByLabelText('Address bar') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://foo.com' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    expect(createSpy).toHaveBeenCalledWith('https://foo.com');

    createSpy.mockRestore();
  });

  test('submitting a search query opens search URL when no active tab', async () => {
    useTabsStore.setState({ tabs: [], activeId: null });

    const createSpy = vi
      .spyOn(ipc.tabs, 'create')
      .mockImplementation(async () => ({ id: 'new' }) as any);

    render(<TopBar />);

    const input = screen.getByLabelText('Address bar') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello world' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    expect(createSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://www.google.com/search?q=hello%20world')
    );

    createSpy.mockRestore();
  });
});
