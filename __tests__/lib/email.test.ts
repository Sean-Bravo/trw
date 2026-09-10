/**
 * Guards the nodemailer API surface lib/email.ts depends on.
 *
 * Every other email test mocks '@/lib/email' wholesale, so nothing exercised
 * the nodemailer calls themselves. When nodemailer went 7.x -> 10.x (a major
 * bump, taken to clear 10 advisories including SMTP command injection), a
 * signature change in createTransport or sendMail would have broken account
 * verification and password reset silently, with a green suite.
 */
import nodemailer from 'nodemailer';
import {
  generateVerificationCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '@/lib/email';

jest.mock('nodemailer');

const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
const createTransport = nodemailer.createTransport as unknown as jest.Mock;

describe('lib/email nodemailer integration', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    createTransport.mockReturnValue({ sendMail });
    process.env = {
      ...OLD_ENV,
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: '587',
      SMTP_USER: 'user',
      SMTP_PASSWORD: 'pass',
      EMAIL_FROM: 'noreply@taxformatter.com',
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('builds an SMTP transport with the options nodemailer still expects', async () => {
    await sendVerificationEmail('someone@example.test', '123456');

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.test',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'pass' },
      }),
    );
  });

  it('uses implicit TLS on port 465', async () => {
    process.env['SMTP_PORT'] = '465';
    await sendVerificationEmail('someone@example.test', '123456');

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true }),
    );
  });

  it('sends a verification message with the fields sendMail requires', async () => {
    await sendVerificationEmail('someone@example.test', '123456');

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0]![0];
    expect(message).toEqual(
      expect.objectContaining({
        to: 'someone@example.test',
        from: expect.stringContaining('noreply@taxformatter.com'),
        subject: expect.any(String),
      }),
    );
    expect(message.html ?? message.text).toEqual(expect.stringContaining('123456'));
  });

  it('sends a password reset message', async () => {
    await sendPasswordResetEmail('someone@example.test', 'reset-token-abc');

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0]![0];
    expect(message.to).toBe('someone@example.test');
    expect(message.html ?? message.text).toEqual(
      expect.stringContaining('reset-token-abc'),
    );
  });

  it('reports failure rather than silently succeeding when SMTP is unconfigured', async () => {
    delete process.env['SMTP_HOST'];
    // These helpers resolve with a result object instead of throwing, so a
    // caller must check `success` — an unconfigured environment must never
    // look like a delivered email.
    await expect(
      sendVerificationEmail('someone@example.test', '123456'),
    ).resolves.toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('SMTP configuration missing'),
      }),
    );
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('generates a 6-digit numeric verification code', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateVerificationCode()).toMatch(/^\d{6}$/);
    }
  });
});
