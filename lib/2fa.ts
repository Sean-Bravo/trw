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
 *
 * M-8: bumped from 32 bits (8 hex chars, ~4.3B per code) to 48 bits
 * (12 hex chars, ~280T per code). 32 bits is theoretically crackable
 * with modern hardware under unlimited attempts; 48 bits is comfortably
 * above brute-force feasibility even without rate limits.
 *
 * Existing backup codes already issued to users keep working — they
 * were stored as SHA-256 hashes so the on-disk format is unchanged.
 * Users only get new-format codes when they regenerate.
 *
 * SECURITY_AUDIT.md §M-8
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 6 random bytes = 12 hex chars = 48 bits of entropy.
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    // Format as XXXX-XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`);
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
