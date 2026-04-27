import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'

/**
 * POST /api/admin/seed-church
 * Protected by ADMIN_SECRET env var.
 * Creates or updates a church record in Supabase.
 *
 * Body: { secret: string, id: string, name?: string, location?: string, songs?: string[] }
 * Note: churches no longer have passwords — authentication is handled by the users table.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { secret, id, name, location } = body

    const adminSecret = process.env.ADMIN_SECRET
    console.log('[seed-church] ADMIN_SECRET set:', !!adminSecret)
    console.log('[seed-church] secret received:', secret ? `"${secret.slice(0, 4)}…"` : '(none)')
    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const { error } = await supabase.from('churches').upsert({
      id: id.trim().toLowerCase(),
      name: name || null,
      location: location || null,
      status: 'approved',
    }, { onConflict: 'id' })

    if (error) {
      console.error('seed-church upsert error:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: id.trim().toLowerCase() })
  } catch (err) {
    console.error('/api/admin/seed-church error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
