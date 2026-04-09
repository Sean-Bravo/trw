/**
 * Tests for safeRedirect (H-15 open-redirect fix).
 */
import { safeRedirect } from '../safe-redirect';

const BASE = 'https://taxformatter.com';

describe('safeRedirect (H-15)', () => {
  describe('legitimate same-origin URLs', () => {
    it('allows a simple relative path', () => {
      expect(safeRedirect('/dashboard', BASE)).toBe(`${BASE}/dashboard`);
    });

    it('allows a relative path with query string', () => {
      expect(safeRedirect('/dashboard/developer?upgraded=true', BASE)).toBe(
        `${BASE}/dashboard/developer?upgraded=true`,
      );
    });

    it('allows a same-origin absolute URL', () => {
      expect(safeRedirect(`${BASE}/profile`, BASE)).toBe(`${BASE}/profile`);
    });
  });

  describe('open-redirect attack vectors (must reject)', () => {
    it('rejects protocol-relative URL //attacker.com', () => {
      // The historical bug: url.startsWith('/') was true, so the old
      // callback prepended baseUrl and the browser resolved to evil.
      expect(safeRedirect('//evil.com/login', BASE)).toBe(BASE);
    });

    it('rejects backslash-prefixed protocol-relative URL', () => {
      // Some browsers normalize backslash to slash; defensive.
      expect(safeRedirect('/\\evil.com', BASE)).toBe(BASE);
    });

    it('rejects an absolute URL on a different origin', () => {
      expect(safeRedirect('https://evil.com/phish', BASE)).toBe(BASE);
    });

    it('rejects an http downgrade of the same hostname', () => {
      expect(safeRedirect('http://taxformatter.com/dashboard', BASE)).toBe(BASE);
    });

    it('rejects a different subdomain', () => {
      expect(safeRedirect('https://app.taxformatter.com/dashboard', BASE)).toBe(BASE);
    });

    it('rejects a malformed URL', () => {
      expect(safeRedirect('javascript:alert(1)', BASE)).toBe(BASE);
    });
  });
});
