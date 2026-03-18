import type { ParseResponse, SourcesResponse } from './types.js';

const API_BASE = 'https://api.taxformatter.com';

export class TaxFormatterClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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

    const res = await fetch(`${API_BASE}/v1/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    return (await res.json()) as ParseResponse;
  }

  async listSources(): Promise<SourcesResponse> {
    const res = await fetch(`${API_BASE}/v1/sources`);
    return (await res.json()) as SourcesResponse;
  }
}
