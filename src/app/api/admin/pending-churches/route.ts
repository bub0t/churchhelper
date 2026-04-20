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
    .select('id, name, location, contact_email, service_day, service_time')
    .eq('status', 'pending')

  if (cErr) {
    console.error('[pending-churches] churches fetch error:', cErr)
    return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 })
  }

  const result = (churches || []).map((church: any) => ({
    id: church.id,
    name: church.name,
    location: church.location,
    contactEmail: church.contact_email || '',
    serviceDay: church.service_day || 'Sunday',
    serviceTime: church.service_time || '10:00',
  }))

  return NextResponse.json({ ok: true, churches: result })
}
