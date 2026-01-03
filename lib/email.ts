import nodemailer from 'nodemailer';

// Create reusable transporter using SMTP
function getTransporter() {
  const host = process.env['SMTP_HOST'];
  const port = parseInt(process.env['SMTP_PORT'] || '587', 10);
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASSWORD'];

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration missing. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification email with 6-digit code
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const fromEmail = process.env['EMAIL_FROM'] || 'noreply@taxformatter.com';
    const siteName = process.env['NEXT_PUBLIC_SITE_NAME'] || 'TaxFormatter';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${siteName}</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1a365d; margin: 0 0 16px; font-size: 20px;">Verify Your Email</h2>
      <p style="color: #64748b; margin: 0 0 24px; line-height: 1.6;">
        ${name ? `Hi ${name},` : 'Hi there,'}<br><br>
        Enter this verification code to complete your registration:
      </p>
      <div style="background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #3b82f6;">${code}</span>
      </div>
      <p style="color: #94a3b8; font-size: 14px; margin: 0; line-height: 1.5;">
        This code expires in 15 minutes.<br>
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
    <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        &copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
${siteName} - Verify Your Email

${name ? `Hi ${name},` : 'Hi there,'}

Enter this verification code to complete your registration:

${code}

This code expires in 15 minutes.

If you didn't create an account, you can safely ignore this email.

© ${new Date().getFullYear()} ${siteName}
    `.trim();

    await transporter.sendMail({
      from: `"${siteName}" <${fromEmail}>`,
      to: email,
      subject: `${code} is your ${siteName} verification code`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error('[Email] Failed to send verification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send password reset email (for future use)
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const fromEmail = process.env['EMAIL_FROM'] || 'noreply@taxformatter.com';
    const siteName = process.env['NEXT_PUBLIC_SITE_NAME'] || 'TaxFormatter';

    await transporter.sendMail({
      from: `"${siteName}" <${fromEmail}>`,
      to: email,
      subject: `Reset your ${siteName} password`,
      text: `Hi ${name || 'there'},\n\nClick here to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request a password reset, you can safely ignore this email.`,
      html: `<p>Hi ${name || 'there'},</p><p>Click <a href="${resetUrl}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p>`,
    });

    return { success: true };
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
