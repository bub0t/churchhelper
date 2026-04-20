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

    const { data: tokenRow, error: tokenErr } = await supabase
      .from('password_reset_tokens')
      .select('token, user_id, expires_at, used')
      .eq('token', token)
      .maybeSingle()

    if (tokenErr || !tokenRow) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 400 })
    }

    if ((tokenRow as any).used) {
      return NextResponse.json({ ok: false, error: 'Token has already been used' }, { status: 400 })
    }

    if (new Date((tokenRow as any).expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: 'Token has expired' }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 12)

    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_hash: hash })
      .eq('id', (tokenRow as any).user_id)

    if (updateErr) {
      console.error('[reset-password] update error:', updateErr)
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 })
    }

    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/auth/reset-password error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
