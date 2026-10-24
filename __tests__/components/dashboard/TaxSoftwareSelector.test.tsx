/**
 * Tests for TaxSoftwareSelector component (P1)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaxSoftwareSelector } from '@/components/dashboard/TaxSoftwareSelector';

describe('TaxSoftwareSelector', () => {
  it('offers all 4 formats in a labelled select', () => {
    render(<TaxSoftwareSelector onDownload={jest.fn()} isDownloading={false} />);

    const select = screen.getByLabelText('Export for') as HTMLSelectElement;
    expect(select.value).toBe('turbotax');
    expect([...select.options].map((o) => o.textContent)).toEqual(['TurboTax', 'Koinly', 'CoinLedger', 'ZenLedger']);
  });

  it('never claims the TurboTax export includes cost basis', () => {
    // The converter leaves Date Acquired and Cost Basis blank.
    render(<TaxSoftwareSelector onDownload={jest.fn()} isDownloading={false} />);
    expect(screen.queryByText(/Cost Basis/i)).not.toBeInTheDocument();
  });

  it('calls onDownload with selected format when download clicked', () => {
    const onDownload = jest.fn();
    render(<TaxSoftwareSelector onDownload={onDownload} isDownloading={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV for TurboTax/i }));
    expect(onDownload).toHaveBeenCalledWith('turbotax');
  });

  it('does not call onDownload when isDownloading', () => {
    const onDownload = jest.fn();
    render(<TaxSoftwareSelector onDownload={onDownload} isDownloading={true} />);
    const btn = screen.getByRole('button', { name: /Preparing download/i });
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
    fireEvent.change(screen.getByLabelText('Export for'), { target: { value: 'koinly' } });
    fireEvent.click(screen.getByRole('button', { name: /Download CSV for Koinly/i }));
    expect(onDownload).toHaveBeenCalledWith('koinly');
  });
});
