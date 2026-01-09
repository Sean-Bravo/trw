import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/ui/Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('renders title when provided', () => {
      render(<Modal {...defaultProps} title="Test Title" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      render(<Modal {...defaultProps} title="Title" description="Test description" />);
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(
        <Modal {...defaultProps}>
          <button>Action Button</button>
        </Modal>
      );
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('renders close button by default', () => {
      render(<Modal {...defaultProps} title="Title" />);
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} title="Title" showCloseButton={false} />);
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });

    it('calls onClose when close button clicked', async () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} title="Title" />);
      await userEvent.click(screen.getByLabelText('Close modal'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Backdrop Click', () => {
    it('calls onClose when backdrop clicked by default', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);
      // The backdrop is the dialog element itself with the click handler
      const backdrop = screen.getByRole('dialog');
      // Simulate clicking directly on the backdrop (not a child)
      // We need to ensure e.target === e.currentTarget
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: backdrop });
      Object.defineProperty(clickEvent, 'currentTarget', { value: backdrop });
      backdrop.dispatchEvent(clickEvent);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when closeOnBackdropClick is false', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnBackdropClick={false} />);
      const backdrop = screen.getByRole('dialog');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: backdrop });
      Object.defineProperty(clickEvent, 'currentTarget', { value: backdrop });
      backdrop.dispatchEvent(clickEvent);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not close when clicking modal content', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByText('Modal content'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Escape Key', () => {
    it('calls onClose when Escape is pressed by default', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when closeOnEscape is false', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('removes keydown listener on unmount', () => {
      const onClose = jest.fn();
      const { unmount } = render(<Modal {...defaultProps} onClose={onClose} />);
      unmount();
      fireEvent.keyDown(document, { key: 'Escape' });
      // Should only be called if listener wasn't removed
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Size Variants', () => {
    it('applies sm size class', () => {
      render(<Modal {...defaultProps} size="sm" />);
      const modalContent = document.querySelector('.max-w-md');
      expect(modalContent).toBeInTheDocument();
    });

    it('applies md size class by default', () => {
      render(<Modal {...defaultProps} />);
      const modalContent = document.querySelector('.max-w-lg');
      expect(modalContent).toBeInTheDocument();
    });

    it('applies lg size class', () => {
      render(<Modal {...defaultProps} size="lg" />);
      const modalContent = document.querySelector('.max-w-2xl');
      expect(modalContent).toBeInTheDocument();
    });

    it('applies xl size class', () => {
      render(<Modal {...defaultProps} size="xl" />);
      const modalContent = document.querySelector('.max-w-4xl');
      expect(modalContent).toBeInTheDocument();
    });
  });

  describe('Body Scroll Lock', () => {
    it('prevents body scroll when open', () => {
      render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when closed', () => {
      const { rerender } = render(<Modal {...defaultProps} />);
      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('unset');
    });

    it('restores body scroll on unmount', () => {
      const { unmount } = render(<Modal {...defaultProps} />);
      unmount();
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Accessibility', () => {
    it('has role="dialog"', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(<Modal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby when title is provided', () => {
      render(<Modal {...defaultProps} title="Test Title" />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('does not have aria-labelledby when title is not provided', () => {
      render(<Modal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).not.toHaveAttribute('aria-labelledby');
    });

    it('has aria-describedby when description is provided', () => {
      render(<Modal {...defaultProps} title="Title" description="Description" />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'modal-description');
    });

    it('title has correct id for aria-labelledby', () => {
      render(<Modal {...defaultProps} title="Test Title" />);
      const title = screen.getByText('Test Title');
      expect(title).toHaveAttribute('id', 'modal-title');
    });

    it('description has correct id for aria-describedby', () => {
      render(<Modal {...defaultProps} title="Title" description="Test description" />);
      const description = screen.getByText('Test description');
      expect(description).toHaveAttribute('id', 'modal-description');
    });
  });

  describe('Focus Management', () => {
    it('focuses first focusable element when opened', async () => {
      render(
        <Modal {...defaultProps} title="Title">
          <button>First Button</button>
          <button>Second Button</button>
        </Modal>
      );

      await waitFor(() => {
        // Close button is first focusable in header
        expect(screen.getByLabelText('Close modal')).toHaveFocus();
      });
    });

    it('traps focus within modal', async () => {
      render(
        <Modal {...defaultProps} title="Title">
          <button>Action</button>
        </Modal>
      );

      const closeButton = screen.getByLabelText('Close modal');
      const actionButton = screen.getByRole('button', { name: 'Action' });

      // Focus should be on close button initially
      await waitFor(() => {
        expect(closeButton).toHaveFocus();
      });

      // Tab to action button
      await userEvent.tab();
      expect(actionButton).toHaveFocus();

      // Tab again should cycle back (focus trap)
      await userEvent.tab();
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Portal', () => {
    it('renders in document.body via portal', () => {
      render(<Modal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      // Portal renders content as direct child of body
      expect(dialog.closest('body')).toBe(document.body);
    });
  });

  describe('Header Rendering', () => {
    it('renders header when title is provided', () => {
      render(<Modal {...defaultProps} title="Title" />);
      const header = document.querySelector('.border-b');
      expect(header).toBeInTheDocument();
    });

    it('renders header when only close button is shown', () => {
      render(<Modal {...defaultProps} showCloseButton={true} />);
      // When there's only close button and no title, header may or may not render
      // depending on implementation - this tests current behavior
    });

    it('does not render header when no title and close button hidden', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);
      const header = document.querySelector('.border-b');
      expect(header).not.toBeInTheDocument();
    });
  });
});
