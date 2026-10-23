import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProcessingTerminal, eventsFor } from '@/components/dashboard/ProcessingTerminal';

describe('ProcessingTerminal', () => {
  it('never shows the old sample warnings', () => {
    // These were replayed as if found in every user's file.
    render(<ProcessingTerminal jobId="j1" stage="complete" exchange="Coinbase" transactionCount={20} insightsReady />);
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/Row 42|Row 105|Row 312|Duplicate Transaction ID|Inferred "USD"/);
    expect(screen.queryByText(/\[WARN\]/)).not.toBeInTheDocument();
  });

  it('logs only what was observed for a finished job', () => {
    render(<ProcessingTerminal jobId="j1" stage="complete" exchange="Coinbase" transactionCount={20} insightsReady />);
    expect(screen.getByText('Detected exchange: Coinbase')).toBeInTheDocument();
    expect(screen.getByText('Converted 20 transactions')).toBeInTheDocument();
    expect(screen.getByText('AI insights ready')).toBeInTheDocument();
    expect(screen.queryByText(/Upload received/)).not.toBeInTheDocument();
  });

  it('adds lines as the job moves through its stages', () => {
    const { rerender } = render(<ProcessingTerminal jobId="j1" stage="detecting" />);
    expect(screen.getByText('Upload received, queued for processing')).toBeInTheDocument();

    rerender(<ProcessingTerminal jobId="j1" stage="analyzing" />);
    rerender(<ProcessingTerminal jobId="j1" stage="complete" exchange="Coinbase" transactionCount={6} />);

    expect(screen.getByText('Upload received, queued for processing')).toBeInTheDocument();
    expect(screen.getByText('Scanning and parsing file...')).toBeInTheDocument();
    expect(screen.getByText('Converted 6 transactions')).toBeInTheDocument();
  });

  it('starts a fresh log for a different job', () => {
    const { rerender } = render(<ProcessingTerminal jobId="j1" stage="complete" exchange="Coinbase" transactionCount={6} />);
    rerender(<ProcessingTerminal jobId="j2" stage="complete" exchange="Coinbase" transactionCount={6} />);
    expect(screen.getAllByText('Converted 6 transactions')).toHaveLength(1);
  });

  it('logs a failure and an insights problem', () => {
    expect(eventsFor({ stage: 'error', error: 'Could not auto-detect exchange format' }).map((e) => e.message))
      .toEqual(['Processing failed: Could not auto-detect exchange format']);
    expect(eventsFor({ stage: 'complete', insightsError: 'the analysis service did not respond' }).map((e) => e.level))
      .toEqual(['SUCCESS', 'WARN']);
  });

  it('renders nothing before there is anything to log', () => {
    const { container } = render(<ProcessingTerminal stage="idle" />);
    expect(container).toBeEmptyDOMElement();
  });
});
