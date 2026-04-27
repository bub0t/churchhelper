import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'

/**
 * POST /api/admin/search-churches
 * Search approved/all churches by name for the admin key lookup tool.
 * Body: { password: string, query: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { password, query } = body

    const sp = process.env.SUPERADMIN_PASSWORD
    if (!sp || password !== sp) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const q = typeof query === 'string' ? query.trim() : ''
    if (q.length < 2) return NextResponse.json({ ok: true, churches: [] })

    const { data, error } = await supabase
      .from('churches')
      .select('id, name')
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(8)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, churches: data || [] })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
