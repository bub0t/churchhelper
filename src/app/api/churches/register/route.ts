import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'
import { sendAdminNotification } from '@/lib/email'

const VALID_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function generateValidTimes(): string[] {
  const times: string[] = []
  for (let h = 5; h <= 21; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 21) times.push(`${String(h).padStart(2, '0')}:30`)
  }
  return times
}

const VALID_TIMES = generateValidTimes()

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
 * Body: { churchName, location, contactEmail, serviceDay, serviceTime }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { churchName, location, contactEmail, serviceDay, serviceTime } = body

    if (!churchName || typeof churchName !== 'string' || churchName.trim().length < 2) {
      return NextResponse.json({ ok: false, error: 'Church name is required (min 2 characters)' }, { status: 400 })
    }
    if (!location || typeof location !== 'string' || location.trim().length < 2) {
      return NextResponse.json({ ok: false, error: 'Location is required' }, { status: 400 })
    }
    if (!contactEmail || typeof contactEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      return NextResponse.json({ ok: false, error: 'Valid contact email is required' }, { status: 400 })
    }
    if (!serviceDay || !VALID_DAYS.includes(serviceDay)) {
      return NextResponse.json({ ok: false, error: 'Valid service day is required' }, { status: 400 })
    }
    if (!serviceTime || !VALID_TIMES.includes(serviceTime)) {
      return NextResponse.json({ ok: false, error: 'Valid service time is required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const normalEmail = contactEmail.trim().toLowerCase()
    const churchSlug = slugify(churchName)

    const { data: existingChurch } = await supabase
      .from('churches')
      .select('id')
      .eq('id', churchSlug)
      .maybeSingle()
    if (existingChurch) {
      return NextResponse.json({ ok: false, error: 'A church with a similar name already exists' }, { status: 409 })
    }

    const { data: existingName } = await supabase
      .from('churches')
      .select('id')
      .ilike('name', churchName.trim())
      .maybeSingle()
    if (existingName) {
      return NextResponse.json({ ok: false, error: 'A church with this name is already registered' }, { status: 409 })
    }

    const { error: churchErr } = await supabase.from('churches').insert({
      id: churchSlug,
      name: churchName.trim(),
      location: location.trim(),
      contact_email: normalEmail,
      service_day: serviceDay,
      service_time: serviceTime,
      status: 'pending',
    })
    if (churchErr) {
      console.error('[churches/register] church insert error:', churchErr)
      return NextResponse.json({ ok: false, error: churchErr.message }, { status: 500 })
    }

    await sendAdminNotification(
      `New church registration: ${churchName.trim()}`,
      `<p>A new church registration request has been submitted.</p>
       <ul>
         <li><strong>Church:</strong> ${churchName.trim()}</li>
         <li><strong>Location:</strong> ${location.trim()}</li>
         <li><strong>Service:</strong> ${serviceDay} at ${serviceTime}</li>
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
