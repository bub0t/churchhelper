import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import supabase from '@/lib/supabase.server'

/**
 * POST /api/auth/reset-password
 * Validates a reset token and updates the user's password.
 *
 * Body: { token: string, newPassword: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { token, newPassword } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ ok: false, error: 'Token is required' }, { status: 400 })
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    // Atomically mark the token as used so concurrent requests can't both succeed.
    // Only updates if the token exists, hasn't been used, and hasn't expired.
    const { data: consumed, error: consumeErr } = await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .select('user_id')
      .maybeSingle()

    if (consumeErr) {
      console.error('[reset-password] token consume error:', consumeErr)
      return NextResponse.json({ ok: false, error: 'Could not validate token' }, { status: 500 })
    }

    if (!consumed) {
      return NextResponse.json({ ok: false, error: 'Invalid, expired, or already-used token' }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 12)

    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_hash: hash })
      .eq('id', (consumed as any).user_id)

    if (updateErr) {
      console.error('[reset-password] update error:', updateErr)
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/auth/reset-password error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
