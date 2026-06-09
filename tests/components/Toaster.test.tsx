import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '@/components/Toaster';

// Helper component that fires toasts
function FireToast({ message, kind }: { message: string; kind?: 'success' | 'error' | 'info' }) {
  const { toast } = useToast();
  return <button onClick={() => toast(message, kind)}>Fire</button>;
}

function Wrapper({ message, kind }: { message: string; kind?: 'success' | 'error' | 'info' }) {
  return (
    <ToastProvider>
      <FireToast message={message} kind={kind} />
    </ToastProvider>
  );
}

describe('Toaster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a toast message after firing', async () => {
    const { getByRole } = render(<Wrapper message="Hello toast" kind="info" />);
    await act(async () => { getByRole('button').click(); });
    expect(screen.getByText('Hello toast')).toBeInTheDocument();
  });

  it('removes toast after 4 seconds', async () => {
    const { getByRole } = render(<Wrapper message="Auto dismiss" kind="info" />);
    await act(async () => { getByRole('button').click(); });
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(4100); });
    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
  });

  it('applies success styling', async () => {
    const { getByRole, container } = render(<Wrapper message="Done" kind="success" />);
    await act(async () => { getByRole('button').click(); });
    // The toast element should have green styling class
    const toastEl = screen.getByText('Done').closest('div');
    expect(toastEl?.className).toContain('green');
  });

  it('applies error styling', async () => {
    const { getByRole } = render(<Wrapper message="Oops" kind="error" />);
    await act(async () => { getByRole('button').click(); });
    const toastEl = screen.getByText('Oops').closest('div');
    expect(toastEl?.className).toContain('red');
  });

  it('renders multiple toasts simultaneously', async () => {
    function MultiFire() {
      const { toast } = useToast();
      return (
        <>
          <button onClick={() => toast('First', 'info')}>A</button>
          <button onClick={() => toast('Second', 'success')}>B</button>
        </>
      );
    }
    const { getByText } = render(
      <ToastProvider>
        <MultiFire />
      </ToastProvider>
    );
    await act(async () => { getByText('A').click(); });
    await act(async () => { getByText('B').click(); });

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
