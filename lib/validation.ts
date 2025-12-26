import { z } from 'zod';

/**
 * Input validation and sanitization utilities
 * Use these to validate and sanitize user input before processing
 */

// Email validation schema
export const emailSchema = z.string().email().toLowerCase().trim();

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// Name validation schema
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

// URL validation schema
export const urlSchema = z.string().url().trim();

// File upload validation schema
export const fileUploadSchema = z.object({
  name: z.string().max(255),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
  type: z.enum(['text/csv', 'application/csv', 'text/plain']),
});

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all HTML tags and dangerous characters
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize string input
 * Removes control characters and excessive whitespace
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): { success: boolean; data?: string; error?: string } {
  try {
    const sanitized = sanitizeString(email);
    const validated = emailSchema.parse(sanitized);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors?.[0];
      return { success: false, error: firstError?.message || 'Invalid email' };
    }
    return { success: false, error: 'Invalid email' };
  }
}

/**
 * Validate password
 */
export function validatePassword(password: string): { success: boolean; error?: string } {
  try {
    passwordSchema.parse(password);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors?.[0];
      return { success: false, error: firstError?.message || 'Invalid password' };
    }
    return { success: false, error: 'Invalid password' };
  }
}

/**
 * Validate and sanitize name
 */
export function validateName(name: string): { success: boolean; data?: string; error?: string } {
  try {
    const sanitized = sanitizeString(name);
    const validated = nameSchema.parse(sanitized);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors?.[0];
      return { success: false, error: firstError?.message || 'Invalid name' };
    }
    return { success: false, error: 'Invalid name' };
  }
}

/**
 * Check for SQL injection patterns
 * Returns true if suspicious patterns are detected
 */
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\*|;|'|"|\\)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for XSS patterns
 * Returns true if suspicious patterns are detected
 */
export function detectXss(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: {
  name: string;
  size: number;
  type: string;
}): { success: boolean; error?: string } {
  try {
    fileUploadSchema.parse(file);

    // Additional checks
    if (file.name.includes('..')) {
      return { success: false, error: 'Invalid file name' };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors?.[0];
      return { success: false, error: firstError?.message || 'Invalid file' };
    }
    return { success: false, error: 'Invalid file' };
  }
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (token.length !== expectedToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }

  return result === 0;
}
