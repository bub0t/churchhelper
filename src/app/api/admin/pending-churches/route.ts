import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'

function isSuperadmin(password: string) {
  const sp = process.env.SUPERADMIN_PASSWORD
  return sp && password === sp
}

/**
 * GET /api/admin/pending-churches?password=xxx
 * Returns all pending churches with their pending users.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const password = searchParams.get('password') || ''

  if (!isSuperadmin(password)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
  }

  const { data: churches, error: cErr } = await supabase
    .from('churches')
    .select('id, name, location, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (cErr) {
    console.error('[pending-churches] churches fetch error:', cErr)
    return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 })
  }

  const result = await Promise.all(
    (churches || []).map(async (church: any) => {
      const { data: users } = await supabase!
        .from('users')
        .select('id, email, created_at')
        .eq('church_id', church.id)
        .eq('status', 'pending')
      return { ...church, pendingUsers: users || [] }
    })
  )

  return NextResponse.json({ ok: true, churches: result })
}
