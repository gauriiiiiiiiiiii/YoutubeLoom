import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WebcamPreview from '@/components/WebcamPreview';

describe('WebcamPreview', () => {
  it('renders position buttons for all 4 corners', () => {
    render(
      <WebcamPreview
        position="bottom-right"
        size={20}
        onPositionChange={vi.fn()}
        onSizeChange={vi.fn()}
      />
    );
    expect(screen.getByTitle('Top Left')).toBeInTheDocument();
    expect(screen.getByTitle('Top Right')).toBeInTheDocument();
    expect(screen.getByTitle('Bottom Left')).toBeInTheDocument();
    expect(screen.getByTitle('Bottom Right')).toBeInTheDocument();
  });

  it('highlights the active position button', () => {
    render(
      <WebcamPreview
        position="top-left"
        size={20}
        onPositionChange={vi.fn()}
        onSizeChange={vi.fn()}
      />
    );
    const activeBtn = screen.getByTitle('Top Left');
    expect(activeBtn.className).toContain('blue');
  });

  it('calls onPositionChange when a corner is clicked', async () => {
    const onPositionChange = vi.fn();
    render(
      <WebcamPreview
        position="bottom-right"
        size={20}
        onPositionChange={onPositionChange}
        onSizeChange={vi.fn()}
      />
    );
    await userEvent.click(screen.getByTitle('Top Left'));
    expect(onPositionChange).toHaveBeenCalledWith('top-left');
  });

  it('displays the current size percentage', () => {
    render(
      <WebcamPreview
        position="bottom-right"
        size={25}
        onPositionChange={vi.fn()}
        onSizeChange={vi.fn()}
      />
    );
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('shows the label for the active position', () => {
    render(
      <WebcamPreview
        position="bottom-left"
        size={20}
        onPositionChange={vi.fn()}
        onSizeChange={vi.fn()}
      />
    );
    expect(screen.getByText('Bottom Left')).toBeInTheDocument();
  });
});
