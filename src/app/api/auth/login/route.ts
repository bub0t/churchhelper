import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'
import bcrypt from 'bcryptjs'

const SUPERADMIN_USERNAME = 'supahadmin'

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => ({}))
    const id: string = typeof raw.id === 'string' ? raw.id.trim().toLowerCase() : ''
    const password: string = raw.password || ''
    if (!id || !password) return NextResponse.json({ ok: false }, { status: 400 })

    // Superadmin: env-only, never stored in DB
    if (id === SUPERADMIN_USERNAME) {
      const superPassword = process.env.SUPERADMIN_PASSWORD
      if (!superPassword) return NextResponse.json({ ok: false }, { status: 401 })
      if (password !== superPassword) return NextResponse.json({ ok: false }, { status: 401 })
      return NextResponse.json({ ok: true, role: 'superadmin' })
    }

    // Regular users: check `users` table — match by username or email
    if (supabase) {
      const isEmail = id.includes('@')
      const query = supabase
        .from('users')
        .select('id, password_hash, church_id, status')

      const { data, error } = await (isEmail
        ? query.eq('email', id).maybeSingle()
        : query.eq('id', id).maybeSingle())

      if (error) {
        console.error('/api/auth/login supabase error:', error)
        return NextResponse.json({ ok: false }, { status: 500 })
      }

      // If looked up by username and not found, also try email fallback
      let resolved = data
      if (!resolved && !isEmail) {
        const { data: byEmail } = await supabase
          .from('users')
          .select('id, password_hash, church_id, status')
          .eq('email', id)
          .maybeSingle()
        resolved = byEmail
      }

      if (resolved) {
        if (resolved.status !== 'approved') {
          return NextResponse.json({ ok: false, reason: 'pending' }, { status: 403 })
        }
        const match = await bcrypt.compare(password, resolved.password_hash)
        if (!match) return NextResponse.json({ ok: false }, { status: 401 })

        const { data: church } = await supabase
          .from('churches')
          .select('location, service_day, service_time')
          .eq('id', resolved.church_id)
          .maybeSingle()

        return NextResponse.json({
          ok: true,
          role: 'user',
          churchId: resolved.church_id,
          churchLocation: (church as any)?.location ?? null,
          serviceDay: (church as any)?.service_day ?? 'Sunday',
          serviceTime: (church as any)?.service_time ?? '10:00',
        })
      }

      // No user found — fall through to legacy church fallback below
    }

    return NextResponse.json({ ok: false }, { status: 401 })
  } catch (error) {
    console.error('/api/auth/login error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
