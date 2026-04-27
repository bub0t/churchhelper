import { NextResponse } from 'next/server'
import { createDecipheriv } from 'crypto'
import supabase from '@/lib/supabase.server'

function decryptInviteKey(encrypted: string): string {
  const secret = process.env.INVITE_KEY_SECRET
  if (!secret) throw new Error('INVITE_KEY_SECRET not configured')
  const keyBuffer = Buffer.from(secret, 'hex')
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted key format')
  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const ciphertext = Buffer.from(parts[2], 'hex')
  const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}

/**
 * POST /api/admin/get-invite-key
 * Returns the decrypted invite key for a given church.
 * Body: { password: string, churchId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { password, churchId } = body

    const sp = process.env.SUPERADMIN_PASSWORD
    if (!sp || password !== sp) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!churchId || typeof churchId !== 'string') {
      return NextResponse.json({ ok: false, error: 'churchId is required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const { data: church, error } = await supabase
      .from('churches')
      .select('id, name, invite_key_encrypted')
      .eq('id', churchId.trim().toLowerCase())
      .maybeSingle()

    if (error || !church) {
      return NextResponse.json({ ok: false, error: 'Church not found' }, { status: 404 })
    }

    if (!(church as any).invite_key_encrypted) {
      return NextResponse.json({ ok: false, error: 'No invite key set for this church' }, { status: 404 })
    }

    const plainKey = decryptInviteKey((church as any).invite_key_encrypted)
    return NextResponse.json({ ok: true, churchId: church.id, name: (church as any).name, inviteKey: plainKey })
  } catch (err) {
    console.error('/api/admin/get-invite-key error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
