import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';
import { Mail, Lock } from 'lucide-react';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('renders input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter email" />);
      expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Input label="Email Address" />);
      expect(screen.getByText('Email Address')).toBeInTheDocument();
    });

    it('associates label with input via htmlFor', () => {
      render(<Input label="Email" id="email-input" />);
      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');
      expect(label).toHaveAttribute('for', 'email-input');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('generates unique id when not provided', () => {
      render(<Input label="Test" />);
      const input = screen.getByRole('textbox');
      expect(input.id).toBeTruthy();
      expect(input.id.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('displays error message', () => {
      render(<Input error="Invalid email" />);
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
    });

    it('applies error styles', () => {
      render(<Input error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-[#ef4444]');
    });

    it('sets aria-invalid when error exists', () => {
      render(<Input error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('sets aria-describedby to error id', () => {
      render(<Input error="Error message" id="test-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
    });

    it('shows error icon', () => {
      render(<Input error="Error" />);
      const errorIcon = document.querySelector('[aria-hidden="true"]');
      expect(errorIcon).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('displays success message', () => {
      render(<Input success="Email verified" />);
      expect(screen.getByText('Email verified')).toBeInTheDocument();
    });

    it('applies success styles', () => {
      render(<Input success="Success" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-[#059669]');
    });

    it('prioritizes error over success', () => {
      render(<Input error="Error" success="Success" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });

    it('shows success icon', () => {
      render(<Input success="Valid" />);
      const icons = document.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Helper Text', () => {
    it('displays helper text', () => {
      render(<Input helperText="We'll never share your email" />);
      expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
    });

    it('hides helper text when error is present', () => {
      render(<Input helperText="Helper" error="Error" />);
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });

    it('hides helper text when success is present', () => {
      render(<Input helperText="Helper" success="Success" />);
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });
  });

  describe('Icon Support', () => {
    it('renders icon on the left by default', () => {
      render(<Input icon={Mail} />);
      const iconContainer = document.querySelector('.left-3');
      expect(iconContainer).toBeInTheDocument();
    });

    it('renders icon on the right when specified', () => {
      render(<Input icon={Lock} iconPosition="right" />);
      const iconContainer = document.querySelector('.right-3');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies left padding when icon is on left', () => {
      render(<Input icon={Mail} iconPosition="left" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('pl-11');
    });

    it('applies right padding when icon is on right', () => {
      render(<Input icon={Mail} iconPosition="right" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('pr-11');
    });
  });

  describe('Event Handlers', () => {
    it('calls onChange when value changes', async () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test');
      expect(handleChange).toHaveBeenCalled();
    });

    it('calls onBlur when input loses focus', () => {
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');
      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('calls onFocus when input gains focus', () => {
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} />);
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });
  });

  describe('Input Types', () => {
    it('renders as text input by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      // HTML inputs without explicit type attribute default to text
      expect(input.tagName).toBe('INPUT');
    });

    it('renders as email input', () => {
      render(<Input type="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders as password input', () => {
      render(<Input type="password" />);
      // Password inputs don't have textbox role
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('renders as number input', () => {
      render(<Input type="number" />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });
  });

  describe('Disabled State', () => {
    it('applies disabled attribute', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('applies disabled styles', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('disabled:bg-[#f3f4f6]');
      expect(input.className).toContain('disabled:cursor-not-allowed');
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className to wrapper', () => {
      render(<Input className="custom-wrapper" />);
      const wrapper = document.querySelector('.custom-wrapper');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Forwarded Props', () => {
    it('forwards name prop', () => {
      render(<Input name="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'email');
    });

    it('forwards required prop', () => {
      render(<Input required />);
      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('forwards maxLength prop', () => {
      render(<Input maxLength={50} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxLength', '50');
    });

    it('forwards autoComplete prop', () => {
      render(<Input autoComplete="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-describedby for helper text', () => {
      render(<Input helperText="Helper" id="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-helper');
    });

    it('has proper aria-describedby for success', () => {
      render(<Input success="Success" id="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-success');
    });

    it('label click focuses input', async () => {
      render(<Input label="Email" id="email" />);
      const label = screen.getByText('Email');
      await userEvent.click(label);
      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });
  });
});
