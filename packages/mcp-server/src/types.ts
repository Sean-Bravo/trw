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
