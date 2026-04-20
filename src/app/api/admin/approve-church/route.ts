import { NextResponse } from 'next/server'
import { randomBytes, createCipheriv } from 'crypto'
import supabase from '@/lib/supabase.server'
import { sendUserEmail } from '@/lib/email'

function encryptInviteKey(plaintext: string): string {
  const secret = process.env.INVITE_KEY_SECRET
  if (!secret) throw new Error('INVITE_KEY_SECRET not configured')
  const keyBuffer = Buffer.from(secret, 'hex')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

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
    const { password, pendingId, approvedId, inviteKey } = body

    const sp = process.env.SUPERADMIN_PASSWORD
    if (!sp || password !== sp) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!pendingId || !approvedId) {
      return NextResponse.json({ ok: false, error: 'pendingId and approvedId are required' }, { status: 400 })
    }
    if (!inviteKey || typeof inviteKey !== 'string' || inviteKey.trim().length < 4) {
      return NextResponse.json({ ok: false, error: 'Invite key is required (min 4 characters)' }, { status: 400 })
    }

    const plainKey = inviteKey.trim()
    const encryptedKey = encryptInviteKey(plainKey)

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
        invite_key_encrypted: encryptedKey,
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

      // Email the plain invite key to the contact email
      const contactEmail = (existing as any).contact_email
      if (contactEmail) {
        await sendUserEmail(
          contactEmail,
          `${existing.name || finalId} has been approved on Church Helper`,
          `<p>Good news! Your church <strong>${existing.name || finalId}</strong> has been approved on Church Helper.</p>
           <p>Your church invite key is: <strong>${plainKey}</strong></p>
           <p>Share this key with your team members — they will need it when creating their Church Helper account.</p>
           <p>Keep this key safe. You can request it again from your superadmin if needed.</p>`
        )
      }

      // Notify pending users
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

      const { data: church } = await supabase
        .from('churches')
        .select('name, contact_email')
        .eq('id', finalId)
        .maybeSingle()

      await supabase
        .from('churches')
        .update({ status: 'approved', invite_key_encrypted: encryptedKey })
        .eq('id', finalId)
      await supabase
        .from('users')
        .update({ status: 'approved' })
        .eq('church_id', finalId)
        .eq('status', 'pending')

      // Email the plain invite key to the contact email
      const contactEmail = (church as any)?.contact_email
      if (contactEmail) {
        await sendUserEmail(
          contactEmail,
          `${(church as any)?.name || finalId} has been approved on Church Helper`,
          `<p>Good news! Your church <strong>${(church as any)?.name || finalId}</strong> has been approved on Church Helper.</p>
           <p>Your church invite key is: <strong>${plainKey}</strong></p>
           <p>Share this key with your team members — they will need it when creating their Church Helper account.</p>
           <p>Keep this key safe. You can request it again from your superadmin if needed.</p>`
        )
      }

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
