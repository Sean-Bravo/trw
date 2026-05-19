import { NextRequest, NextResponse } from 'next/server';
import {
  PlaygroundError,
  UPSTREAM_BASE_URL,
  assertDemoKeyQuota,
  isPlaygroundKilled,
  selectApiKey,
  validateBase64Size,
  validateOutputFormat,
  type PlaygroundParseRequest,
} from '@/lib/playground-proxy';
import { applyRateLimit, rateLimiters } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM_TIMEOUT_MS = 15_000;

export async function POST(request: NextRequest) {
  if (isPlaygroundKilled()) {
    return NextResponse.json(
      {
        status: 'error',
        code: 'playground_disabled',
        message: 'The playground is temporarily unavailable.',
      },
      { status: 503 },
    );
  }

  const rateLimitResponse = await applyRateLimit(request, rateLimiters.playground);
  if (rateLimitResponse) return rateLimitResponse;

  let body: PlaygroundParseRequest;
  try {
    body = (await request.json()) as PlaygroundParseRequest;
  } catch {
    return NextResponse.json(
      { status: 'error', code: 'invalid_json', message: 'Request body must be JSON.' },
      { status: 400 },
    );
  }

  if (!body.file_content || typeof body.file_content !== 'string') {
    return NextResponse.json(
      {
        status: 'error',
        code: 'missing_file_content',
        message: '`file_content` (base64) is required.',
      },
      { status: 400 },
    );
  }
  if (!body.filename || typeof body.filename !== 'string') {
    return NextResponse.json(
      { status: 'error', code: 'missing_filename', message: '`filename` is required.' },
      { status: 400 },
    );
  }

  let selected: ReturnType<typeof selectApiKey>;
  try {
    validateBase64Size(body.file_content);
    validateOutputFormat(body.output_format);
    selected = selectApiKey(body);
    await assertDemoKeyQuota(selected.source);
  } catch (err) {
    if (err instanceof PlaygroundError) {
      return NextResponse.json(
        { status: 'error', code: err.code, message: err.message },
        { status: err.httpStatus },
      );
    }
    throw err;
  }

  // Strip api_key before forwarding — upstream auth uses the header.
  const { api_key: _stripped, ...upstreamPayload } = body;
  void _stripped;

  let upstream: Response;
  try {
    upstream = await fetch(`${UPSTREAM_BASE_URL}/parse`, {
      method: 'POST',
      headers: {
        'X-API-Key': selected.key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upstreamPayload),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return NextResponse.json(
      {
        status: 'error',
        code: isTimeout ? 'upstream_timeout' : 'upstream_unreachable',
        message: isTimeout
          ? 'The upstream API did not respond within 15 seconds. Please try again.'
          : 'Could not reach the upstream API.',
      },
      { status: 504 },
    );
  }

  // Forward upstream response unchanged — users should see real API behavior.
  const text = await upstream.text();
  try {
    const json: unknown = JSON.parse(text);
    return NextResponse.json(json, { status: upstream.status });
  } catch (parseErr) {
    // Capture upstream details so the next intermittent non-JSON failure
    // isn't opaque — see SMOKE_TEST_RESULTS.md item 6 for full context.
    // apigwRequestId joins to API Gateway / CloudWatch for end-to-end trace.
    console.error('[playground] upstream returned non-JSON', {
      status: upstream.status,
      contentType: upstream.headers.get('Content-Type'),
      contentLength: upstream.headers.get('Content-Length'),
      apigwRequestId: upstream.headers.get('apigw-requestid'),
      parseError: parseErr instanceof Error ? parseErr.message : String(parseErr),
      bodyPreview: text.slice(0, 500),
    });
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'text/plain',
      },
    });
  }
}
