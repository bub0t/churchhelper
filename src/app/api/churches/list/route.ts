import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'

/**
 * GET /api/churches/list
 * Returns all approved churches for the registration dropdown.
 */
export async function GET() {
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('churches')
    .select('id, name, location')
    .eq('status', 'approved')
    .order('name', { ascending: true })

  if (error) {
    console.error('[churches/list] error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, churches: data || [] })
}
