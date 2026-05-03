import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createApiKey, listApiKeys } from '@/lib/api-keys';

/**
 * GET /api/developer/keys
 * List all API keys for the authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await listApiKeys(session.user.id);

    return NextResponse.json({
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: `tf_live_${k.key_prefix}...`,
        tier: k.tier,
        isActive: k.is_active,
        rateLimitRpm: k.rate_limit_rpm,
        monthlyQuota: k.monthly_quota,
        lastUsedAt: k.last_used_at,
        createdAt: k.created_at,
        // D6: surfaces deactivation-by-Stripe-downgrade in the dashboard.
        deactivatedReason: k.deactivated_reason,
        deactivatedAt: k.deactivated_at,
      })),
    });
  } catch (error) {
    console.error('[Developer Keys] Error listing keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/developer/keys
 * Generate a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: 'Name is required (max 100 characters)' },
        { status: 400 }
      );
    }

    const result = await createApiKey(session.user.id, name);

    return NextResponse.json({
      id: result.id,
      key: result.key,
      keyPrefix: `tf_live_${result.prefix}...`,
      message: 'Store this key securely. It will not be shown again.',
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('Maximum of') || message.includes('Only one active free')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error('[Developer Keys] Error creating key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
