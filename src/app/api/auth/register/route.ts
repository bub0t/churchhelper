import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import supabase from '@/lib/supabase.server'
import { sendAdminNotification } from '@/lib/email'

/**
 * POST /api/auth/register
 * Registers a new user for an already-approved church.
 * User is immediately set to 'approved'.
 *
 * Body: { username: string, email: string, password: string, churchId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { username, email, password, churchId } = body

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

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const normalUser = username.trim().toLowerCase()
    const normalEmail = email.trim().toLowerCase()
    const normalChurch = churchId.trim().toLowerCase()

    // Verify church exists and is approved
    const { data: church } = await supabase
      .from('churches')
      .select('id, name, status')
      .eq('id', normalChurch)
      .maybeSingle()

    if (!church) {
      return NextResponse.json({ ok: false, error: 'Church not found' }, { status: 404 })
    }
    if ((church as any).status !== 'approved') {
      return NextResponse.json({ ok: false, error: 'Church is not yet approved' }, { status: 403 })
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
    await sendAdminNotification(
      `New user registered: ${normalUser}`,
      `<p>A new user has registered.</p>
       <ul>
         <li><strong>Username:</strong> ${normalUser}</li>
         <li><strong>Email:</strong> ${normalEmail}</li>
         <li><strong>Church:</strong> ${(church as any).name || normalChurch} (${normalChurch})</li>
       </ul>`
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/auth/register error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
