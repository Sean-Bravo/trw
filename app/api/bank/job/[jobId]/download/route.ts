import { NextRequest, NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';

/**
 * GET /api/bank/job/[jobId]/download
 * Get presigned download URL for bank statement result
 * Anonymous access allowed — download is gated by knowing the jobId (UUID)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // Call Lambda
    const lambdaResponse = await fetch(
      `${API_GATEWAY_URL}/bank/job/${jobId}/download?format=${format}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await lambdaResponse.json();

    if (!lambdaResponse.ok) {
      return NextResponse.json(data, { status: lambdaResponse.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Bank Download] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
