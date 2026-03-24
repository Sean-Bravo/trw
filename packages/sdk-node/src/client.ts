import { readFile } from 'fs/promises';
import { basename } from 'path';
import { TaxFormatterError, AuthenticationError, RateLimitError, ParseError } from './errors';
import type { ClientOptions, ParseOptions, ParseResponse, SourcesResponse, UsageResponse, HealthResponse } from './types';

const DEFAULT_BASE_URL = 'https://api.taxformatter.com';
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 3;

export class TaxFormatter {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(apiKey: string, options?: ClientOptions) {
    if (!apiKey) throw new Error('API key is required');
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl || DEFAULT_BASE_URL;
    this.timeout = options?.timeout || DEFAULT_TIMEOUT;
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  private async request<T>(method: string, path: string, body?: unknown, attempt = 1): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const data = await res.json() as any;

      if (res.ok) return data as T;

      // Auto-retry on 429
      if (res.status === 429 && attempt < this.maxRetries) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10) || Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        return this.request<T>(method, path, body, attempt + 1);
      }

      // Throw typed errors
      if (res.status === 401) {
        throw new AuthenticationError(data.message);
      }
      if (res.status === 429) {
        throw new RateLimitError(data.message, data.metadata?.retry_after_seconds);
      }
      if (res.status === 422) {
        throw new ParseError(data.code || 'parse_error', data.message, data.suggestion);
      }

      throw new TaxFormatterError(
        data.code || 'unknown_error',
        data.message || `Request failed with status ${res.status}`,
        res.status,
        data.suggestion,
      );
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

  async parse(input: string | Buffer, filenameOrOptions?: string | ParseOptions, options?: ParseOptions): Promise<ParseResponse> {
    let fileBuffer: Buffer;
    let filename: string;
    let opts: ParseOptions | undefined;

    if (typeof input === 'string') {
      // File path
      fileBuffer = await readFile(input);
      filename = basename(input);
      opts = typeof filenameOrOptions === 'object' ? filenameOrOptions : options;
    } else {
      // Buffer
      filename = typeof filenameOrOptions === 'string' ? filenameOrOptions : 'file';
      fileBuffer = input;
      opts = typeof filenameOrOptions === 'object' ? filenameOrOptions : options;
    }

    const body: Record<string, string> = {
      file_content: fileBuffer.toString('base64'),
      filename,
    };

    if (opts?.exchange) body['exchange'] = opts.exchange;
    if (opts?.bank) body['bank'] = opts.bank;
    if (opts?.outputFormat) body['output_format'] = opts.outputFormat;

    return this.request<ParseResponse>('POST', '/v1/parse', body);
  }

  async listSources(): Promise<SourcesResponse> {
    return this.request<SourcesResponse>('GET', '/v1/sources');
  }

  async getUsage(): Promise<UsageResponse> {
    return this.request<UsageResponse>('GET', '/v1/usage');
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('GET', '/v1/health');
  }
}
