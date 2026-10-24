import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IdleTimeoutSettings } from '@/components/dashboard/IdleTimeoutSettings';
import { useSession } from 'next-auth/react';

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));

const mockUpdate = jest.fn();
const mockFetch = jest.fn();

function respond(status: number, body: unknown) {
  mockFetch.mockResolvedValueOnce({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

describe('IdleTimeoutSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({ update: mockUpdate });
    mockUpdate.mockResolvedValue(undefined);
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('offers the five choices with 30 minutes as the default', () => {
    render(<IdleTimeoutSettings initialMinutes={30} />);
    const select = screen.getByLabelText('Sign me out after');
    expect(select).toHaveValue('30');
    expect(screen.getByRole('option', { name: '30 minutes (default)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Never (not recommended)' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  it('saves a new limit and refreshes the session from the server', async () => {
    respond(200, { minutes: 15 });
    render(<IdleTimeoutSettings initialMinutes={30} />);
    fireEvent.change(screen.getByLabelText('Sign me out after'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ idleTimeoutChanged: true }));
    expect(mockFetch).toHaveBeenCalledWith('/api/user/idle-timeout', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ minutes: 15 }) }));
    expect(screen.getByText(/signed out after 15 minutes of inactivity/)).toBeInTheDocument();
  });

  it('warns before turning it off, and does nothing if kept on', () => {
    render(<IdleTimeoutSettings initialMinutes={30} />);
    fireEvent.change(screen.getByLabelText('Sign me out after'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/Anyone with access to this device can open your uploads/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it on' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends the user to sign in again when the server asks for it', async () => {
    respond(403, { code: 'reauth_required' });
    render(<IdleTimeoutSettings initialMinutes={30} />);
    fireEvent.change(screen.getByLabelText('Sign me out after'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn it off' }));

    const links = await screen.findAllByRole('link', { name: /sign in again/i });
    expect(links[0]).toHaveAttribute('href', '/login?next=%2Fdashboard%2Fsettings&reason=reauth');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('turns it off after confirmation and says the 7-day limit still applies', async () => {
    respond(200, { minutes: 0 });
    render(<IdleTimeoutSettings initialMinutes={30} />);
    fireEvent.change(screen.getByLabelText('Sign me out after'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn it off' }));

    expect(await screen.findByText(/You’ll still be signed out after 7 days/)).toBeInTheDocument();
    expect(screen.getByText(/Sessions still end after 7 days/)).toBeInTheDocument();
  });
});
