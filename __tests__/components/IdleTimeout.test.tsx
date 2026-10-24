import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { IdleTimeout } from '@/components/auth/IdleTimeout';
import { useSession, signOut } from 'next-auth/react';
import { useIdleHold } from '@/lib/idle-hold';

jest.mock('next-auth/react', () => ({ useSession: jest.fn(), signOut: jest.fn() }));

const mockUseSession = useSession as jest.Mock;
const mockSignOut = signOut as jest.Mock;
const mockUpdate = jest.fn();
const MIN = 60 * 1000;

function withSession(overrides: Record<string, unknown> = {}) {
  mockUseSession.mockReturnValue({
    status: 'authenticated',
    update: mockUpdate,
    data: { user: { id: 'u1' }, idleTimeoutMin: 15, ...overrides },
  });
}

function Holder({ active }: { active: boolean }) {
  useIdleHold(active);
  return null;
}

describe('IdleTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    window.localStorage.clear();
    mockUpdate.mockResolvedValue(undefined);
    withSession();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

  it('stamps the server clock when a dashboard page opens', () => {
    render(<IdleTimeout />);
    expect(mockUpdate).toHaveBeenCalledWith({ activity: true });
  });

  it('warns 2 minutes before the limit, then signs out at it', () => {
    render(<IdleTimeout />);
    advance(12 * MIN + 59_000);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    advance(2_000);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Still there?')).toBeInTheDocument();

    advance(2 * MIN);
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/login?reason=idle' });
  });

  it('"Stay signed in" resets the timer and pings the server', () => {
    render(<IdleTimeout />);
    advance(13 * MIN + 5_000);
    mockUpdate.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockUpdate).toHaveBeenCalledWith({ activity: true });

    advance(12 * MIN);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('real input resets the clock; pings are throttled to once a minute', () => {
    render(<IdleTimeout />);
    mockUpdate.mockClear();
    advance(10 * MIN);
    fireEvent.keyDown(window);
    fireEvent.keyDown(window);
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    advance(10 * MIN);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('activity in another tab keeps this one signed in', () => {
    render(<IdleTimeout />);
    advance(14 * MIN);
    act(() => {
      window.localStorage.setItem('tf-last-activity', String(Date.now()));
    });
    advance(5 * MIN);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('an upload in progress holds the timer', () => {
    render(
      <>
        <IdleTimeout />
        <Holder active />
      </>
    );
    advance(30 * MIN);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('does nothing when automatic sign-out is off', () => {
    withSession({ idleTimeoutMin: 0 });
    render(<IdleTimeout />);
    advance(10 * 60 * MIN);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('signs out at once when the server already expired the session', () => {
    withSession({ idleExpired: true, user: undefined });
    render(<IdleTimeout />);
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/login?reason=idle' });
  });
});
