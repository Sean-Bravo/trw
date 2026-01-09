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
 * Send password reset email
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

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${siteName}</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1a365d; margin: 0 0 16px; font-size: 20px;">Reset Your Password</h2>
      <p style="color: #64748b; margin: 0 0 24px; line-height: 1.6;">
        ${name ? `Hi ${name},` : 'Hi there,'}<br><br>
        We received a request to reset your password. Click the button below to create a new password:
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
      </div>
      <p style="color: #94a3b8; font-size: 14px; margin: 0 0 16px; line-height: 1.5;">
        This link expires in 1 hour.<br>
        If you didn't request a password reset, you can safely ignore this email.
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5; word-break: break-all;">
        Or copy this link: ${resetUrl}
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
${siteName} - Reset Your Password

${name ? `Hi ${name},` : 'Hi there,'}

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link expires in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} ${siteName}
    `.trim();

    await transporter.sendMail({
      from: `"${siteName}" <${fromEmail}>`,
      to: email,
      subject: `Reset your ${siteName} password`,
      text: textContent,
      html: htmlContent,
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

/**
 * Send welcome email after successful registration
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const fromEmail = process.env['EMAIL_FROM'] || 'noreply@taxformatter.com';
    const siteName = process.env['NEXT_PUBLIC_SITE_NAME'] || 'TaxFormatter';
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://taxformatter.com';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${siteName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${siteName}</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1a365d; margin: 0 0 16px; font-size: 20px;">Welcome aboard! 🎉</h2>
      <p style="color: #64748b; margin: 0 0 24px; line-height: 1.6;">
        ${name ? `Hi ${name},` : 'Hi there,'}<br><br>
        Thanks for joining ${siteName}! You're all set to start formatting your crypto tax documents.
      </p>
      <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
        <p style="color: #1e40af; margin: 0; font-weight: 600; font-size: 14px;">Here's what you can do:</p>
        <ul style="color: #64748b; margin: 12px 0 0; padding-left: 20px; line-height: 1.8;">
          <li>Upload CSV exports from 13+ exchanges</li>
          <li>Auto-detect and fix formatting issues</li>
          <li>Export to Koinly, TurboTax, CoinLedger & more</li>
        </ul>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${appUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
      </div>
      <p style="color: #94a3b8; font-size: 14px; margin: 0; line-height: 1.5;">
        Questions? Reply to this email and we'll help you out.
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
${siteName} - Welcome aboard!

${name ? `Hi ${name},` : 'Hi there,'}

Thanks for joining ${siteName}! You're all set to start formatting your crypto tax documents.

Here's what you can do:
- Upload CSV exports from 13+ exchanges
- Auto-detect and fix formatting issues
- Export to Koinly, TurboTax, CoinLedger & more

Go to your dashboard: ${appUrl}/dashboard

Questions? Reply to this email and we'll help you out.

© ${new Date().getFullYear()} ${siteName}
    `.trim();

    await transporter.sendMail({
      from: `"${siteName}" <${fromEmail}>`,
      to: email,
      subject: `Welcome to ${siteName}!`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error('[Email] Failed to send welcome email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send subscription upgrade confirmation email
 */
export async function sendSubscriptionEmail(
  email: string,
  plan: 'pro' | 'premium',
  name?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const fromEmail = process.env['EMAIL_FROM'] || 'noreply@taxformatter.com';
    const siteName = process.env['NEXT_PUBLIC_SITE_NAME'] || 'TaxFormatter';
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://taxformatter.com';

    const planName = plan === 'premium' ? 'Premium' : 'Pro';
    const features = plan === 'premium'
      ? ['Unlimited CSV uploads', 'All export formats', 'Claude Opus AI categorization', 'Priority support', 'Audit-ready tax notes']
      : ['Unlimited CSV uploads', 'All export formats', 'Claude Haiku AI categorization', 'Email support'];

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${siteName}</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1a365d; margin: 0 0 16px; font-size: 20px;">You're on ${planName}! 🚀</h2>
      <p style="color: #64748b; margin: 0 0 24px; line-height: 1.6;">
        ${name ? `Hi ${name},` : 'Hi there,'}<br><br>
        Your ${planName} subscription is now active. Here's what's unlocked:
      </p>
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
        <ul style="color: #166534; margin: 0; padding-left: 20px; line-height: 1.8;">
          ${features.map(f => `<li>${f}</li>`).join('\n          ')}
        </ul>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${appUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Start Using ${planName}</a>
      </div>
      <p style="color: #94a3b8; font-size: 14px; margin: 0; line-height: 1.5;">
        Manage your subscription anytime from your account settings.
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
${siteName} - You're on ${planName}!

${name ? `Hi ${name},` : 'Hi there,'}

Your ${planName} subscription is now active. Here's what's unlocked:

${features.map(f => `- ${f}`).join('\n')}

Start using ${planName}: ${appUrl}/dashboard

Manage your subscription anytime from your account settings.

© ${new Date().getFullYear()} ${siteName}
    `.trim();

    await transporter.sendMail({
      from: `"${siteName}" <${fromEmail}>`,
      to: email,
      subject: `You're now on ${siteName} ${planName}!`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error('[Email] Failed to send subscription email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
