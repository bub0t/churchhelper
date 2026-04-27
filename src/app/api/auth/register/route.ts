import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createDecipheriv } from 'crypto'
import supabase from '@/lib/supabase.server'
import { sendAdminNotification, sendUserEmail } from '@/lib/email'

function decryptInviteKey(encrypted: string): string {
  const secret = process.env.INVITE_KEY_SECRET
  if (!secret) throw new Error('INVITE_KEY_SECRET not configured')
  const keyBuffer = Buffer.from(secret, 'hex')
  if (keyBuffer.length !== 32) throw new Error('INVITE_KEY_SECRET must be a 64-character hex string (32 bytes)')
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted key format')
  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const ciphertext = Buffer.from(parts[2], 'hex')
  const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}

/**
 * POST /api/auth/register
 * Registers a new user for an already-approved church.
 * User is set to 'approved' only after invite key validation passes.
 *
 * Body: { username, email, password, churchId, inviteKey }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { username, email, password, churchId, inviteKey } = body

    // Validation
    if (!username || typeof username !== 'string' || !/^[a-z0-9_-]{3,30}$/.test(username.trim().toLowerCase())) {
      return NextResponse.json({ ok: false, error: 'Username must be 3–30 characters (letters, numbers, _ or -)' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ ok: false, error: 'Valid email is required' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!churchId || typeof churchId !== 'string') {
      return NextResponse.json({ ok: false, error: 'churchId is required' }, { status: 400 })
    }
    if (!inviteKey || typeof inviteKey !== 'string' || inviteKey.trim().length === 0) {
      return NextResponse.json({ ok: false, error: 'Church invite key is required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const normalUser = username.trim().toLowerCase()
    const normalEmail = email.trim().toLowerCase()
    const normalChurch = churchId.trim().toLowerCase()

    // Verify church exists, is approved, and validate invite key
    const { data: church } = await supabase
      .from('churches')
      .select('id, name, status, invite_key_encrypted')
      .eq('id', normalChurch)
      .maybeSingle()

    if (!church) {
      return NextResponse.json({ ok: false, error: 'Church not found' }, { status: 404 })
    }
    if ((church as any).status !== 'approved') {
      return NextResponse.json({ ok: false, error: 'Church is not yet approved' }, { status: 403 })
    }

    // Validate invite key before touching the users table
    const encryptedKey = (church as any).invite_key_encrypted
    if (!encryptedKey) {
      return NextResponse.json({ ok: false, error: 'This church has no invite key set. Please contact your church administrator.' }, { status: 403 })
    }
    try {
      const plainKey = decryptInviteKey(encryptedKey)
      if (inviteKey.trim().toLowerCase() !== plainKey.toLowerCase()) {
        return NextResponse.json({ ok: false, error: 'Invalid church invite key' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ ok: false, error: 'Could not verify church invite key' }, { status: 500 })
    }

    // Check username not taken
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', normalUser)
      .maybeSingle()
    if (existingUser) {
      return NextResponse.json({ ok: false, error: 'Username already taken' }, { status: 409 })
    }

    // Check email not taken
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalEmail)
      .maybeSingle()
    if (existingEmail) {
      return NextResponse.json({ ok: false, error: 'Email already registered' }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 12)
    const { error: insertErr } = await supabase.from('users').insert({
      id: normalUser,
      email: normalEmail,
      password_hash: hash,
      church_id: normalChurch,
      status: 'approved',
    })

    if (insertErr) {
      console.error('[auth/register] insert error:', insertErr)
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 })
    }

    // Notify superadmin
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    await sendAdminNotification(
      `New user registered: ${normalUser}`,
      `<p>A new user has registered.</p>
       <ul>
         <li><strong>Username:</strong> ${esc(normalUser)}</li>
         <li><strong>Email:</strong> ${esc(normalEmail)}</li>
         <li><strong>Church:</strong> ${esc((church as any).name || normalChurch)} (${esc(normalChurch)})</li>
       </ul>`
    )

    // Welcome email to new user
    await sendUserEmail(
      normalEmail,
      'Welcome to Church Helper!',
      `<p>Hi ${normalUser},</p>
       <p>Welcome to <strong>Church Helper</strong> — an AI-assisted planning tool built for church volunteers like you. We're glad to have you!</p>
       <p>Here's how it works:</p>
       <ol>
         <li><strong>Enter your Bible verses</strong> — type in one or more verses for your upcoming service. Church Helper will generate theme suggestions drawn directly from those passages.</li>
         <li><strong>Choose a theme</strong> — pick the one that best fits your service's focus.</li>
         <li><strong>Plan your activities</strong> — from there, you can generate:</li>
       </ol>
       <ul>
         <li>&#127918; <strong>Children's Activities</strong> — age-appropriate games, crafts, and discussion questions tailored to your theme, group size, and the weather forecast on your service day.</li>
         <li>&#127925; <strong>Worship Song Suggestions</strong> — recommendations from your church's own song repertoire, matched to your chosen theme.</li>
         <li>&#128172; <strong>Youth Group Discussion Questions</strong> — thoughtful questions for secondary school students (ages 12–18), connecting the theme to real challenges young people face today.</li>
       </ul>
       <p>Church Helper is designed to support your planning — not replace the wisdom and discernment of your pastoral team. Use it as a starting point and always apply your own judgement.</p>
       <p>Log in anytime using your username <strong>${normalUser}</strong>.</p>
       <p>If you have questions or feedback, feel free to reply to this email.</p>
       <p>Blessings,<br/>The Church Helper Team</p>`
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/auth/register error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
