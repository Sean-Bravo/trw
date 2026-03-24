export class TaxFormatterError extends Error {
  code: string;
  statusCode: number;
  suggestion?: string;

  constructor(code: string, message: string, statusCode: number, suggestion?: string) {
    super(message);
    this.name = 'TaxFormatterError';
    this.code = code;
    this.statusCode = statusCode;
    this.suggestion = suggestion;
  }
}

export class AuthenticationError extends TaxFormatterError {
  constructor(message: string = 'Invalid or missing API key') {
    super('authentication_error', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends TaxFormatterError {
  retryAfterSeconds?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super('rate_limited', message, 429, 'Wait and retry. Upgrade your tier for higher limits.');
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfter;
  }
}

export class ParseError extends TaxFormatterError {
  constructor(code: string, message: string, suggestion?: string) {
    super(code, message, 422, suggestion);
    this.name = 'ParseError';
  }
}
