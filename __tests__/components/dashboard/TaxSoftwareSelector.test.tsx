/**
 * Tests for TaxSoftwareSelector component (P1)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaxSoftwareSelector } from '@/components/dashboard/TaxSoftwareSelector';

describe('TaxSoftwareSelector', () => {
  it('renders all 4 format options in dropdown', async () => {
    const onDownload = jest.fn();
    render(<TaxSoftwareSelector onDownload={onDownload} isDownloading={false} />);

    expect(screen.getByText(/Choose your tax software/i)).toBeInTheDocument();
    expect(screen.getByText('TurboTax')).toBeInTheDocument();

    const dropdownTrigger = screen.getAllByRole('button').find((b) => b.textContent?.includes('TurboTax') && !b.textContent?.includes('Download'));
    fireEvent.click(dropdownTrigger!);
    expect(screen.getByText('Koinly')).toBeInTheDocument();
    expect(screen.getByText('CoinLedger')).toBeInTheDocument();
    expect(screen.getByText('ZenLedger')).toBeInTheDocument();
  });

  it('shows format descriptions', () => {
    render(<TaxSoftwareSelector onDownload={jest.fn()} isDownloading={false} />);
    expect(screen.getByText(/Formatted for TurboTax import. Includes Date Sold/i)).toBeInTheDocument();
  });

  it('calls onDownload with selected format when download clicked', () => {
    const onDownload = jest.fn();
    render(<TaxSoftwareSelector onDownload={onDownload} isDownloading={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Download for TurboTax/i }));
    expect(onDownload).toHaveBeenCalledWith('turbotax');
  });

  it('does not call onDownload when isDownloading', () => {
    const onDownload = jest.fn();
    render(<TaxSoftwareSelector onDownload={onDownload} isDownloading={true} />);
    const btn = screen.getByRole('button', { name: /Preparing download|Download/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onDownload).not.toHaveBeenCalled();
  });

  it('shows loading state during download', () => {
    render(<TaxSoftwareSelector onDownload={jest.fn()} isDownloading={true} />);
    expect(screen.getByText(/Preparing download/i)).toBeInTheDocument();
  });

  it('handles format selection change', () => {
    const onDownload = jest.fn();
    render(<TaxSoftwareSelector onDownload={onDownload} isDownloading={false} />);
    const trigger = screen.getAllByRole('button').find((b) => b.textContent?.includes('TurboTax') && !b.textContent?.includes('Download'));
    fireEvent.click(trigger!);
    fireEvent.click(screen.getByText('Koinly'));
    fireEvent.click(screen.getByRole('button', { name: /Download for Koinly/i }));
    expect(onDownload).toHaveBeenCalledWith('koinly');
  });
});
