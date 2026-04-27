import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'
import { sendUserEmail } from '@/lib/email'

/**
 * POST /api/admin/reject-church
 * Rejects and deletes a pending church registration.
 * Cascade: pending users are also deleted (via ON DELETE CASCADE on church_id → churches.id SET NULL,
 * so we delete them explicitly first since church_id allows null).
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

    if (!churchId) {
      return NextResponse.json({ ok: false, error: 'churchId is required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const id = churchId.trim().toLowerCase()

    // Fetch pending users before deleting so we can notify them
    const { data: pendingUsers } = await supabase
      .from('users')
      .select('id, email')
      .eq('church_id', id)
      .eq('status', 'pending')

    // Delete pending users for this church
    await supabase.from('users').delete().eq('church_id', id).eq('status', 'pending')

    // Delete the church
    const { error: delErr } = await supabase.from('churches').delete().eq('id', id)
    if (delErr) {
      console.error('[reject-church] delete error:', delErr)
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 })
    }

    // Notify users of rejection
    for (const user of pendingUsers || []) {
      await sendUserEmail(
        user.email,
        'Your Church Helper church registration was not approved',
        `<p>Hi ${user.id},</p><p>Unfortunately, your church registration request was not approved at this time. Please contact us if you believe this is an error.</p>`
      )
    }

    return NextResponse.json({ ok: true, churchId: id })
  } catch (err) {
    console.error('/api/admin/reject-church error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
