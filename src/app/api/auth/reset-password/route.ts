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

    // Fast pre-check: verify the token looks valid before the expensive hash.
    // The RPC below is still the authoritative atomic operation; this only avoids
    // wasting bcrypt rounds on obviously-invalid tokens.
    const { data: tokenRow, error: preCheckErr } = await supabase
      .from('password_reset_tokens')
      .select('token')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (preCheckErr) {
      console.error('[reset-password] pre-check error:', preCheckErr)
      return NextResponse.json({ ok: false, error: 'Could not validate token' }, { status: 500 })
    }

    if (!tokenRow) {
      return NextResponse.json({ ok: false, error: 'Invalid, expired, or already-used token' }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 12)

    // Atomically mark the token as used and update the password hash inside a
    // single Postgres transaction so the token can never be permanently consumed
    // without a matching password change.
    const { data: result, error: rpcErr } = await supabase
      .rpc('reset_password_with_token', {
        p_token: token,
        p_password_hash: hash,
      })

    if (rpcErr) {
      console.error('[reset-password] rpc error:', rpcErr)
      return NextResponse.json({ ok: false, error: 'Could not reset password' }, { status: 500 })
    }

    if (result === 'invalid_token') {
      return NextResponse.json({ ok: false, error: 'Invalid, expired, or already-used token' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/auth/reset-password error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
