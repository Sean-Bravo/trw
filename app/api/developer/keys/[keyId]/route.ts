import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { revokeApiKey, deleteApiKey, renameApiKey } from '@/lib/api-keys';

/**
 * DELETE /api/developer/keys/[keyId]
 * Revoke an API key (soft delete), or permanently delete if ?permanent=true (only revoked keys)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyId } = await params;
    const permanent = request.nextUrl.searchParams.get('permanent') === 'true';

    if (permanent) {
      const deleted = await deleteApiKey(session.user.id, keyId);
      if (!deleted) {
        return NextResponse.json({ error: 'Key not found or still active' }, { status: 404 });
      }
      return NextResponse.json({ message: 'API key permanently deleted' });
    }

    const revoked = await revokeApiKey(session.user.id, keyId);
    if (!revoked) {
      return NextResponse.json({ error: 'Key not found or already revoked' }, { status: 404 });
    }

    return NextResponse.json({ message: 'API key revoked' });
  } catch (error) {
    console.error('[Developer Keys] Error revoking/deleting key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/developer/keys/[keyId]
 * Rename an API key
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyId } = await params;
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: 'Name is required (max 100 characters)' },
        { status: 400 }
      );
    }

    const renamed = await renameApiKey(session.user.id, keyId, name);

    if (!renamed) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'API key renamed' });
  } catch (error) {
    console.error('[Developer Keys] Error renaming key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
