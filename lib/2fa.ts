import { authenticator, totp } from 'otplib';
import { createDigest, createRandomBytes } from '@otplib/plugin-crypto';
import { keyDecoder, keyEncoder } from '@otplib/plugin-base32-enc-dec';
import * as QRCode from 'qrcode';
import crypto from 'crypto';

// Configure authenticator with modern plugins to avoid Buffer() deprecation
authenticator.options = {
  window: 1, // Allow 1 step before/after for clock skew
  createDigest,
  createRandomBytes,
  keyDecoder,
  keyEncoder,
};

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate QR code data URL for authenticator app
 */
export async function generateQRCode(email: string, secret: string): Promise<string> {
  const serviceName = 'TaxFormatter';
  const otpauthUrl = authenticator.keyuri(email, serviceName, secret);
  return QRCode.toDataURL(otpauthUrl);
}

/**
 * Verify a TOTP token
 */
export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Hash backup codes for storage
 */
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(code =>
    crypto.createHash('sha256').update(code).digest('hex')
  );
}

/**
 * Verify a backup code
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): { valid: boolean; index: number } {
  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const formattedCode = normalizedCode.length === 8
    ? `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`
    : code;

  const hashedInput = crypto.createHash('sha256').update(formattedCode).digest('hex');
  const index = hashedCodes.findIndex(hashed => hashed === hashedInput);

  return { valid: index !== -1, index };
}
