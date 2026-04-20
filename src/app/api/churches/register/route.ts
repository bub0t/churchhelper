import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'
import { sendAdminNotification } from '@/lib/email'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * POST /api/churches/register
 * Registers a new church (pending admin approval).
 *
 * Body: { churchName: string, location: string, contactEmail: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { churchName, location, contactEmail } = body

    // Validation
    if (!churchName || typeof churchName !== 'string' || churchName.trim().length < 2) {
      return NextResponse.json({ ok: false, error: 'Church name is required (min 2 characters)' }, { status: 400 })
    }
    if (!location || typeof location !== 'string' || location.trim().length < 2) {
      return NextResponse.json({ ok: false, error: 'Location is required' }, { status: 400 })
    }
    if (!contactEmail || typeof contactEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      return NextResponse.json({ ok: false, error: 'Valid contact email is required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const normalEmail = contactEmail.trim().toLowerCase()
    const churchSlug = slugify(churchName)

    // Check church slug not already taken
    const { data: existingChurch } = await supabase
      .from('churches')
      .select('id')
      .eq('id', churchSlug)
      .maybeSingle()
    if (existingChurch) {
      return NextResponse.json({ ok: false, error: 'A church with a similar name already exists' }, { status: 409 })
    }

    // Check church name not already taken (case-insensitive)
    const { data: existingName } = await supabase
      .from('churches')
      .select('id')
      .ilike('name', churchName.trim())
      .maybeSingle()
    if (existingName) {
      return NextResponse.json({ ok: false, error: 'A church with this name is already registered' }, { status: 409 })
    }

    // Create the pending church
    const { error: churchErr } = await supabase.from('churches').insert({
      id: churchSlug,
      name: churchName.trim(),
      location: location.trim(),
      contact_email: normalEmail,
      status: 'pending',
    })
    if (churchErr) {
      console.error('[churches/register] church insert error:', churchErr)
      return NextResponse.json({ ok: false, error: churchErr.message }, { status: 500 })
    }

    // Notify superadmin
    await sendAdminNotification(
      `New church registration: ${churchName.trim()}`,
      `<p>A new church registration request has been submitted.</p>
       <ul>
         <li><strong>Church:</strong> ${churchName.trim()}</li>
         <li><strong>Location:</strong> ${location.trim()}</li>
         <li><strong>Pending ID:</strong> ${churchSlug}</li>
         <li><strong>Contact:</strong> ${normalEmail}</li>
       </ul>
       <p>Log in as superadmin to approve or reject this request.</p>`
    )

    return NextResponse.json({ ok: true, pending: true })
  } catch (err) {
    console.error('/api/churches/register error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}


function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * POST /api/churches/register
 * Registers a new church (pending admin approval) and creates the first user for that church.
 *
 * Body: { churchName: string, location: string, username: string, email: string, password: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { churchName, location, username, email, password } = body

    // Validation
    if (!churchName || typeof churchName !== 'string' || churchName.trim().length < 2) {
      return NextResponse.json({ ok: false, error: 'Church name is required (min 2 characters)' }, { status: 400 })
    }
    if (!location || typeof location !== 'string' || location.trim().length < 2) {
      return NextResponse.json({ ok: false, error: 'Location is required' }, { status: 400 })
    }
    if (!username || typeof username !== 'string' || !/^[a-z0-9_-]{3,30}$/.test(username.trim().toLowerCase())) {
      return NextResponse.json({ ok: false, error: 'Username must be 3–30 characters (letters, numbers, _ or -)' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ ok: false, error: 'Valid email is required' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const normalUser = username.trim().toLowerCase()
    const normalEmail = email.trim().toLowerCase()
    const churchSlug = slugify(churchName)

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

    // Check church slug not already taken
    const { data: existingChurch } = await supabase
      .from('churches')
      .select('id')
      .eq('id', churchSlug)
      .maybeSingle()
    if (existingChurch) {
      return NextResponse.json({ ok: false, error: 'A church with a similar name already exists' }, { status: 409 })
    }

    // Check church name not already taken (case-insensitive)
    const { data: existingName } = await supabase
      .from('churches')
      .select('id')
      .ilike('name', churchName.trim())
      .maybeSingle()
    if (existingName) {
      return NextResponse.json({ ok: false, error: 'A church with this name is already registered' }, { status: 409 })
    }

    // Create the pending church
    const { error: churchErr } = await supabase.from('churches').insert({
      id: churchSlug,
      name: churchName.trim(),
      location: location.trim(),
      status: 'pending',
    })
    if (churchErr) {
      console.error('[churches/register] church insert error:', churchErr)
      return NextResponse.json({ ok: false, error: churchErr.message }, { status: 500 })
    }

    // Create the pending user
    const hash = await bcrypt.hash(password, 12)
    const { error: userErr } = await supabase.from('users').insert({
      id: normalUser,
      email: normalEmail,
      password_hash: hash,
      church_id: churchSlug,
      status: 'pending',
    })
    if (userErr) {
      console.error('[churches/register] user insert error:', userErr)
      // Roll back church
      await supabase.from('churches').delete().eq('id', churchSlug)
      return NextResponse.json({ ok: false, error: userErr.message }, { status: 500 })
    }

    // Notify superadmin
    await sendAdminNotification(
      `New church registration: ${churchName.trim()}`,
      `<p>A new church registration request has been submitted.</p>
       <ul>
         <li><strong>Church:</strong> ${churchName.trim()}</li>
         <li><strong>Location:</strong> ${location.trim()}</li>
         <li><strong>Pending ID:</strong> ${churchSlug}</li>
         <li><strong>Requested by:</strong> ${normalUser} (${normalEmail})</li>
       </ul>
       <p>Log in as superadmin to approve or reject this request.</p>`
    )

    return NextResponse.json({ ok: true, pending: true })
  } catch (err) {
    console.error('/api/churches/register error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
