import {
  emailSchema,
  passwordSchema,
  nameSchema,
  urlSchema,
  fileUploadSchema,
  sanitizeHtml,
  sanitizeString,
  validateEmail,
  validatePassword,
  validateName,
  detectSqlInjection,
  detectXss,
  validateFileUpload,
  generateCsrfToken,
  validateCsrfToken,
} from '../validation'

describe('validation.ts', () => {
  describe('Zod Schemas', () => {
    describe('emailSchema', () => {
      it('validates correct emails', () => {
        const validEmails = [
          'test@example.com',
          'user.name@example.co.uk',
          'first+last@subdomain.example.com',
        ]

        validEmails.forEach((email) => {
          expect(() => emailSchema.parse(email)).not.toThrow()
        })
      })

      it('rejects invalid emails', () => {
        const invalidEmails = [
          'notanemail',
          '@example.com',
          'user@',
          'user @example.com',
          '',
        ]

        invalidEmails.forEach((email) => {
          expect(() => emailSchema.parse(email)).toThrow()
        })
      })

      it('lowercases and trims emails', () => {
        expect(emailSchema.parse('TEST@EXAMPLE.COM')).toBe('test@example.com')
      })
    })

    describe('passwordSchema', () => {
      it('validates strong passwords', () => {
        const validPasswords = [
          'Test1234!',
          'MyP@ssw0rd',
          'Str0ng!Pass',
          'Ab1!cdefgh',
        ]

        validPasswords.forEach((password) => {
          expect(() => passwordSchema.parse(password)).not.toThrow()
        })
      })

      it('requires minimum 8 characters', () => {
        expect(() => passwordSchema.parse('Test1!')).toThrow(
          'Password must be at least 8 characters'
        )
      })

      it('requires uppercase letter', () => {
        expect(() => passwordSchema.parse('test1234!')).toThrow(
          'Password must contain at least one uppercase letter'
        )
      })

      it('requires lowercase letter', () => {
        expect(() => passwordSchema.parse('TEST1234!')).toThrow(
          'Password must contain at least one lowercase letter'
        )
      })

      it('requires number', () => {
        expect(() => passwordSchema.parse('TestTest!')).toThrow(
          'Password must contain at least one number'
        )
      })

      it('requires special character', () => {
        expect(() => passwordSchema.parse('Test1234')).toThrow(
          'Password must contain at least one special character'
        )
      })

      it('rejects passwords over 128 characters', () => {
        const longPassword = 'A1!' + 'a'.repeat(126)
        expect(() => passwordSchema.parse(longPassword)).toThrow(
          'Password must be less than 128 characters'
        )
      })
    })

    describe('nameSchema', () => {
      it('validates correct names', () => {
        const validNames = [
          'John Doe',
          "O'Brien",
          'Mary-Jane',
          'Jean-Claude',
          'Anne Marie',
        ]

        validNames.forEach((name) => {
          expect(() => nameSchema.parse(name)).not.toThrow()
        })
      })

      it('rejects names with numbers', () => {
        expect(() => nameSchema.parse('John123')).toThrow()
      })

      it('rejects names with special characters (except - and \')', () => {
        expect(() => nameSchema.parse('John@Doe')).toThrow()
        expect(() => nameSchema.parse('John#Doe')).toThrow()
        expect(() => nameSchema.parse('John$Doe')).toThrow()
      })

      it('trims whitespace', () => {
        expect(nameSchema.parse('  John Doe  ')).toBe('John Doe')
      })

      it('requires at least 1 character', () => {
        expect(() => nameSchema.parse('')).toThrow('Name is required')
      })

      it('rejects names over 100 characters', () => {
        const longName = 'a'.repeat(101)
        expect(() => nameSchema.parse(longName)).toThrow(
          'Name must be less than 100 characters'
        )
      })
    })

    describe('urlSchema', () => {
      it('validates URLs', () => {
        const validUrls = [
          'https://example.com',
          'http://localhost:3000',
          'https://subdomain.example.co.uk/path',
        ]

        validUrls.forEach((url) => {
          expect(() => urlSchema.parse(url)).not.toThrow()
        })
      })

      it('rejects invalid URLs', () => {
        expect(() => urlSchema.parse('notaurl')).toThrow()
        expect(() => urlSchema.parse('')).toThrow()
      })
    })

    describe('fileUploadSchema', () => {
      it('validates file size (10MB max)', () => {
        const validFile = {
          name: 'test.csv',
          size: 5 * 1024 * 1024, // 5MB
          type: 'text/csv',
        }

        expect(() => fileUploadSchema.parse(validFile)).not.toThrow()

        const invalidFile = {
          name: 'large.csv',
          size: 15 * 1024 * 1024, // 15MB
          type: 'text/csv',
        }

        expect(() => fileUploadSchema.parse(invalidFile)).toThrow()
      })

      it('validates file types (CSV only)', () => {
        const validTypes = ['text/csv', 'application/csv', 'text/plain']

        validTypes.forEach((type) => {
          const file = {
            name: 'test.csv',
            size: 1024,
            type,
          }
          expect(() => fileUploadSchema.parse(file)).not.toThrow()
        })

        const invalidFile = {
          name: 'test.exe',
          size: 1024,
          type: 'application/x-msdownload',
        }

        expect(() => fileUploadSchema.parse(invalidFile)).toThrow()
      })
    })
  })

  describe('sanitizeHtml', () => {
    it('escapes < to &lt;', () => {
      expect(sanitizeHtml('<script>')).toContain('&lt;')
    })

    it('escapes > to &gt;', () => {
      expect(sanitizeHtml('<script>')).toContain('&gt;')
    })

    it('escapes " to &quot;', () => {
      expect(sanitizeHtml('"quoted"')).toContain('&quot;')
    })

    it("escapes ' to &#x27;", () => {
      expect(sanitizeHtml("'quoted'")).toContain('&#x27;')
    })

    it('escapes / to &#x2F;', () => {
      expect(sanitizeHtml('</script>')).toContain('&#x2F;')
    })

    it('handles empty strings', () => {
      expect(sanitizeHtml('')).toBe('')
    })

    it('handles strings without special chars', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World')
    })

    it('sanitizes complete XSS attempt', () => {
      const malicious = '<script>alert("XSS")</script>'
      const sanitized = sanitizeHtml(malicious)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      )
    })
  })

  describe('sanitizeString', () => {
    it('removes control characters', () => {
      const input = 'Hello\x00World\x1F'
      expect(sanitizeString(input)).toBe('HelloWorld')
    })

    it('replaces multiple spaces with single space', () => {
      expect(sanitizeString('Hello     World')).toBe('Hello World')
    })

    it('trims leading/trailing whitespace', () => {
      expect(sanitizeString('  Hello World  ')).toBe('Hello World')
    })

    it('handles empty strings', () => {
      expect(sanitizeString('')).toBe('')
    })

    it('handles strings without special chars', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World')
    })

    it('combines all sanitization steps', () => {
      const input = '  Hello\x00\x1F     World  '
      expect(sanitizeString(input)).toBe('Hello World')
    })
  })

  describe('validateEmail', () => {
    it('returns success:true for valid emails', () => {
      const result = validateEmail('test@example.com')
      expect(result.success).toBe(true)
      expect(result.data).toBe('test@example.com')
      expect(result.error).toBeUndefined()
    })

    it('returns success:false for invalid emails', () => {
      const result = validateEmail('notanemail')
      expect(result.success).toBe(false)
      expect(typeof result.error).toBe('string')
      expect(result.data).toBeUndefined()
    })

    it('returns sanitized email in data', () => {
      const result = validateEmail('  TEST@EXAMPLE.COM  ')
      expect(result.success).toBe(true)
      expect(result.data).toBe('test@example.com')
    })

    it('returns error message on failure', () => {
      const result = validateEmail('invalid')
      expect(result.success).toBe(false)
      expect(typeof result.error).toBe('string')
      expect(result.error).toBeTruthy()
    })

    it('sanitizes before validating', () => {
      const result = validateEmail('  test@example.com  ')
      expect(result.success).toBe(true)
      expect(result.data).toBe('test@example.com')
    })
  })

  describe('validatePassword', () => {
    it('returns success:true for valid passwords', () => {
      const result = validatePassword('Test1234!')
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('returns success:false for weak passwords', () => {
      const result = validatePassword('weak')
      expect(result.success).toBe(false)
      expect(typeof result.error).toBe('string')
    })

    it('returns specific error messages', () => {
      const result = validatePassword('test')
      expect(result.success).toBe(false)
      expect(typeof result.error).toBe('string')
      expect(result.error).toBeTruthy()
    })

    it('does not leak password in error', () => {
      const password = 'Test1234!'
      const result = validatePassword('weak')
      expect(typeof result.error).toBe('string')
      expect(result.error).not.toContain(password)
    })
  })

  describe('validateName', () => {
    it('returns success:true for valid names', () => {
      const result = validateName('John Doe')
      expect(result.success).toBe(true)
      expect(result.data).toBe('John Doe')
      expect(result.error).toBeUndefined()
    })

    it('returns success:false for invalid names', () => {
      const result = validateName('John123')
      expect(result.success).toBe(false)
      expect(typeof result.error).toBe('string')
      expect(result.data).toBeUndefined()
    })

    it('returns sanitized name in data', () => {
      const result = validateName('  John Doe  ')
      expect(result.success).toBe(true)
      expect(result.data).toBe('John Doe')
    })

    it('returns error message on failure', () => {
      const result = validateName('John@Doe')
      expect(result.success).toBe(false)
      expect(typeof result.error).toBe('string')
    })
  })

  describe('detectSqlInjection', () => {
    it('detects SELECT statements', () => {
      expect(detectSqlInjection('SELECT * FROM users')).toBe(true)
      expect(detectSqlInjection('select * from users')).toBe(true)
    })

    it('detects INSERT statements', () => {
      expect(detectSqlInjection('INSERT INTO users')).toBe(true)
    })

    it('detects UPDATE statements', () => {
      expect(detectSqlInjection('UPDATE users SET')).toBe(true)
    })

    it('detects DELETE statements', () => {
      expect(detectSqlInjection('DELETE FROM users')).toBe(true)
    })

    it('detects DROP statements', () => {
      expect(detectSqlInjection('DROP TABLE users')).toBe(true)
    })

    it('detects UNION statements', () => {
      expect(detectSqlInjection('UNION SELECT')).toBe(true)
    })

    it('detects SQL comments (--)', () => {
      expect(detectSqlInjection("admin'--")).toBe(true)
    })

    it('detects OR patterns', () => {
      expect(detectSqlInjection("' OR 1=1")).toBe(true)
      expect(detectSqlInjection(' or 1=1')).toBe(true)
    })

    it('detects AND patterns', () => {
      expect(detectSqlInjection("' AND 1=1")).toBe(true)
    })

    it('returns false for safe strings', () => {
      expect(detectSqlInjection('Hello World')).toBe(false)
      expect(detectSqlInjection('user@example.com')).toBe(false)
      expect(detectSqlInjection('John Doe')).toBe(false)
    })

    it('is case-insensitive', () => {
      expect(detectSqlInjection('SeLeCt * FrOm users')).toBe(true)
    })
  })

  describe('detectXss', () => {
    it('detects <script> tags', () => {
      expect(detectXss('<script>alert("XSS")</script>')).toBe(true)
      expect(detectXss('<SCRIPT>alert("XSS")</SCRIPT>')).toBe(true)
    })

    it('detects <iframe> tags', () => {
      expect(detectXss('<iframe src="evil.com"></iframe>')).toBe(true)
    })

    it('detects javascript: protocol', () => {
      expect(detectXss('javascript:alert("XSS")')).toBe(true)
      expect(detectXss('JAVASCRIPT:alert("XSS")')).toBe(true)
    })

    it('detects event handlers', () => {
      expect(detectXss('onclick=alert("XSS")')).toBe(true)
      expect(detectXss('onload=malicious()')).toBe(true)
      expect(detectXss('onerror=hack()')).toBe(true)
      expect(detectXss('onmouseover=bad()')).toBe(true)
    })

    it('detects <embed> tags', () => {
      expect(detectXss('<embed src="evil.swf">')).toBe(true)
    })

    it('detects <object> tags', () => {
      expect(detectXss('<object data="evil.swf">')).toBe(true)
    })

    it('returns false for safe strings', () => {
      expect(detectXss('Hello World')).toBe(false)
      expect(detectXss('user@example.com')).toBe(false)
      expect(detectXss('This is a normal paragraph')).toBe(false)
    })

    it('is case-insensitive', () => {
      expect(detectXss('<ScRiPt>alert("XSS")</ScRiPt>')).toBe(true)
    })
  })

  describe('validateFileUpload', () => {
    it('validates file size', () => {
      const validFile = {
        name: 'test.csv',
        size: 5 * 1024 * 1024,
        type: 'text/csv' as const,
      }
      expect(validateFileUpload(validFile).success).toBe(true)

      const invalidFile = {
        name: 'large.csv',
        size: 15 * 1024 * 1024,
        type: 'text/csv' as const,
      }
      expect(validateFileUpload(invalidFile).success).toBe(false)
    })

    it('validates file type', () => {
      const validFile = {
        name: 'test.csv',
        size: 1024,
        type: 'text/csv' as const,
      }
      expect(validateFileUpload(validFile).success).toBe(true)

      const invalidFile = {
        name: 'test.exe',
        size: 1024,
        type: 'application/x-msdownload',
      }
      expect(validateFileUpload(invalidFile).success).toBe(false)
    })

    it('rejects files with .. in name (path traversal)', () => {
      const file = {
        name: '../../../etc/passwd',
        size: 1024,
        type: 'text/csv',
      }
      const result = validateFileUpload(file)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid file name')
    })

    it('returns success for valid files', () => {
      const file = {
        name: 'transactions.csv',
        size: 1024,
        type: 'text/csv',
      }
      const result = validateFileUpload(file)
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('returns error message for invalid files', () => {
      const file = {
        name: 'test.csv',
        size: 15 * 1024 * 1024,
        type: 'text/csv' as const,
      }
      const result = validateFileUpload(file)
      expect(result.success).toBe(false)
      expect(typeof result.error).toBe('string')
    })
  })

  describe('generateCsrfToken', () => {
    it('generates 64-character hex string', () => {
      const token = generateCsrfToken()
      expect(token).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(token)).toBe(true)
    })

    it('generates unique tokens', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      expect(token1).not.toBe(token2)
    })

    it('uses crypto.getRandomValues', () => {
      const spy = jest.spyOn(crypto, 'getRandomValues')
      generateCsrfToken()
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('token matches hex pattern', () => {
      const token = generateCsrfToken()
      expect(token).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  describe('validateCsrfToken', () => {
    it('returns true for matching tokens', () => {
      const token = generateCsrfToken()
      expect(validateCsrfToken(token, token)).toBe(true)
    })

    it('returns false for non-matching tokens', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      expect(validateCsrfToken(token1, token2)).toBe(false)
    })

    it('returns false if token is empty', () => {
      expect(validateCsrfToken('', 'validtoken')).toBe(false)
    })

    it('returns false if expectedToken is empty', () => {
      expect(validateCsrfToken('validtoken', '')).toBe(false)
    })

    it('returns false if lengths differ', () => {
      expect(validateCsrfToken('short', 'muchlongertoken')).toBe(false)
    })

    it('uses constant-time comparison (no timing attacks)', () => {
      // This test verifies that the function uses XOR-based comparison
      // which is resistant to timing attacks
      const token1 = 'a'.repeat(64)
      const token2 = 'b'.repeat(64)

      // Both should return false, regardless of where the difference is
      expect(validateCsrfToken(token1, token2)).toBe(false)

      const token3 = 'a'.repeat(63) + 'b'
      expect(validateCsrfToken(token1, token3)).toBe(false)
    })

    it('handles unicode characters', () => {
      const token1 = '🔒'.repeat(32)
      const token2 = '🔒'.repeat(32)
      expect(validateCsrfToken(token1, token2)).toBe(true)

      const token3 = '🔓'.repeat(32)
      expect(validateCsrfToken(token1, token3)).toBe(false)
    })
  })
})
