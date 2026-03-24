export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ParseOptions {
  exchange?: string;
  bank?: string;
  outputFormat?: string;
}

export interface ParseResponse {
  status: 'success' | 'error';
  summary?: string;
  detected_source?: string;
  source_type?: string;
  output_format?: string;
  transactions?: Record<string, unknown>[];
  warnings?: string[];
  metadata?: {
    transaction_count?: number;
    processing_time_ms?: number;
    api_version?: string;
    [key: string]: unknown;
  };
  code?: string;
  message?: string;
  suggestion?: string;
}

export interface SourcesResponse {
  crypto_exchanges: Array<{ id: string; name: string }>;
  banks: Array<{ id: string; name: string }>;
  output_formats: {
    crypto: string[];
    bank: string[];
  };
}

export interface UsageResponse {
  usage: Array<{
    key_id: string;
    key_name: string;
    tier: string;
    monthly_quota: number;
    current_month: {
      file_count: number;
      request_count: number;
    };
  }>;
}

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
}
