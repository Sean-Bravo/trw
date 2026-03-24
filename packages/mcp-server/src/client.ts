import type { ParseResponse, SourcesResponse, UsageResponse } from './types.js';

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

export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export class TaxFormatterClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(apiKey: string, options?: ClientOptions) {
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl || process.env['TAXFORMATTER_API_URL'] || 'https://api.taxformatter.com';
    this.timeout = options?.timeout || 30_000;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          ...init?.headers,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new TaxFormatterError(
          data.code || 'unknown_error',
          data.message || `Request failed with status ${res.status}`,
          res.status,
          data.suggestion,
        );
      }

      return data as T;
    } catch (err) {
      if (err instanceof TaxFormatterError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new TaxFormatterError('timeout', `Request timed out after ${this.timeout}ms`, 408);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async parse(
    fileContent: Buffer,
    filename: string,
    options?: {
      exchange?: string;
      bank?: string;
      output_format?: string;
    },
  ): Promise<ParseResponse> {
    const body: Record<string, string> = {
      file_content: fileContent.toString('base64'),
      filename,
    };

    if (options?.exchange) body['exchange'] = options.exchange;
    if (options?.bank) body['bank'] = options.bank;
    if (options?.output_format) body['output_format'] = options.output_format;

    return this.request<ParseResponse>('/v1/parse', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listSources(): Promise<SourcesResponse> {
    return this.request<SourcesResponse>('/v1/sources');
  }

  async getUsage(): Promise<UsageResponse> {
    return this.request<UsageResponse>('/v1/usage');
  }
}
