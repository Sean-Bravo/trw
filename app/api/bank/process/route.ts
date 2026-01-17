import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';

/**
 * POST /api/bank/process
 * Process an uploaded bank statement PDF
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tier = session.user.subscriptionTier || 'free';

    // Bank statements require Pro or Premium tier
    if (tier === 'free') {
      return NextResponse.json(
        { error: 'Bank statement processing requires a Pro or Premium subscription' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { jobId, s3Key, outputFormat } = body;

    if (!jobId || !s3Key) {
      return NextResponse.json({ error: 'Missing jobId or s3Key' }, { status: 400 });
    }

    // Validate output format
    const validFormats = ['qbo', 'xero', 'excel'];
    if (outputFormat && !validFormats.includes(outputFormat)) {
      return NextResponse.json(
        { error: `Invalid output format. Valid: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Call AWS Lambda to process
    const lambdaResponse = await fetch(`${API_GATEWAY_URL}/bank/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        s3Key,
        outputFormat: outputFormat || 'qbo',
      }),
    });

    const data = await lambdaResponse.json();

    if (!lambdaResponse.ok) {
      console.error('[Bank Process] Lambda error:', data);
      return NextResponse.json(
        {
          success: false,
          error: data.error || 'Processing failed',
          warnings: data.warnings || [],
        },
        { status: lambdaResponse.status }
      );
    }

    console.log(`[Bank Process] Job ${jobId} processed successfully`);

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Bank Process] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
