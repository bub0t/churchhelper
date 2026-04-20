import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import supabase from '@/lib/supabase.server'

/**
 * POST /api/admin/seed-users
 * Protected by ADMIN_SECRET env var.
 * Creates or updates a user record in Supabase with a bcrypt-hashed password.
 *
 * Body: { secret: string, id: string, email: string, password: string, churchId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { secret, id, email, password, churchId } = body

    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!id || !email || !password || !churchId) {
      return NextResponse.json({ ok: false, error: 'id, email, password, and churchId are required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const hash = await bcrypt.hash(password, 12)

    const { error } = await supabase.from('users').upsert({
      id: id.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password_hash: hash,
      church_id: churchId.trim().toLowerCase(),
      status: 'approved',
    }, { onConflict: 'id' })

    if (error) {
      console.error('[seed-users] upsert error:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: id.trim().toLowerCase() })
  } catch (err) {
    console.error('/api/admin/seed-users error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
