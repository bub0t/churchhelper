import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'
import { sendUserEmail } from '@/lib/email'

/**
 * POST /api/admin/approve-church
 * Approves a pending church registration.
 * Body: { password: string, pendingId: string, approvedId: string }
 * - If approvedId !== pendingId, the church row is renamed (id changed, church_songs updated).
 * - All pending users of that church are set to 'approved'.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { password, pendingId, approvedId } = body

    const sp = process.env.SUPERADMIN_PASSWORD
    if (!sp || password !== sp) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!pendingId || !approvedId) {
      return NextResponse.json({ ok: false, error: 'pendingId and approvedId are required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const finalId = approvedId.trim().toLowerCase()
    const sourceId = pendingId.trim().toLowerCase()

    if (finalId !== sourceId) {
      // Fetch the existing church row
      const { data: existing, error: fetchErr } = await supabase
        .from('churches')
        .select('*')
        .eq('id', sourceId)
        .maybeSingle()
      if (fetchErr || !existing) {
        return NextResponse.json({ ok: false, error: fetchErr?.message || 'Church not found' }, { status: 404 })
      }

      // Insert new church row with the approved ID
      const { error: insertErr } = await supabase.from('churches').insert({
        ...existing,
        id: finalId,
        status: 'approved',
      })
      if (insertErr) {
        console.error('[approve-church] insert error:', insertErr)
        return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 })
      }

      // Move church_songs to new id
      await supabase.from('church_songs').update({ church_id: finalId }).eq('church_id', sourceId)

      // Move users to new church_id and approve them
      const { data: pendingUsers } = await supabase
        .from('users')
        .select('id, email')
        .eq('church_id', sourceId)
        .eq('status', 'pending')

      await supabase
        .from('users')
        .update({ church_id: finalId, status: 'approved' })
        .eq('church_id', sourceId)
        .eq('status', 'pending')

      // Delete old church row
      await supabase.from('churches').delete().eq('id', sourceId)

      // Notify users
      for (const user of pendingUsers || []) {
        await sendUserEmail(
          user.email,
          'Your Church Helper registration has been approved',
          `<p>Hi ${user.id},</p><p>Your registration for <strong>${existing.name || finalId}</strong> has been approved. You can now log in to Church Helper.</p>`
        )
      }
    } else {
      // Same ID — just approve in place
      const { data: pendingUsers } = await supabase
        .from('users')
        .select('id, email')
        .eq('church_id', finalId)
        .eq('status', 'pending')

      await supabase.from('churches').update({ status: 'approved' }).eq('id', finalId)
      await supabase
        .from('users')
        .update({ status: 'approved' })
        .eq('church_id', finalId)
        .eq('status', 'pending')

      const { data: church } = await supabase.from('churches').select('name').eq('id', finalId).maybeSingle()

      for (const user of pendingUsers || []) {
        await sendUserEmail(
          user.email,
          'Your Church Helper registration has been approved',
          `<p>Hi ${user.id},</p><p>Your registration for <strong>${(church as any)?.name || finalId}</strong> has been approved. You can now log in to Church Helper.</p>`
        )
      }
    }

    return NextResponse.json({ ok: true, approvedId: finalId })
  } catch (err) {
    console.error('/api/admin/approve-church error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
