import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'
import bcrypt from 'bcryptjs'
import { USERS } from '@/lib/data'

export async function POST(request: Request) {
  try {
    const { id, password } = await request.json().catch(() => ({}))
    if (!id || !password) return NextResponse.json({ ok: false }, { status: 400 })

    // If Supabase is configured, check the `churches` table for the stored hash
    if (supabase) {
      const { data, error } = await supabase.from('churches').select('password').eq('id', id).maybeSingle()
      if (error) {
        console.error('/api/auth/login supabase select error:', error)
        return NextResponse.json({ ok: false }, { status: 500 })
      }

      const stored = (data as any)?.password
      if (!stored) return NextResponse.json({ ok: false }, { status: 401 })

      const match = await bcrypt.compare(password, stored)
      if (!match) return NextResponse.json({ ok: false }, { status: 401 })

      return NextResponse.json({ ok: true })
    }

    // Demo fallback: if an explicit DEMO_PASSWORD is set via env, allow that credential.
    // Otherwise, allow a local `USERS` fallback (for developer convenience) when Supabase isn't configured.
    const demoPassword = process.env.DEMO_PASSWORD || process.env.DEV_DEMO_PASSWORD
    const demoUser = process.env.DEMO_USER || 'CBC'
    if (demoPassword) {
      if (password === demoPassword && id === demoUser) {
        console.warn('Authenticated via DEMO_PASSWORD environment (insecure; remove for production).')
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    // Local USERS fallback (only when Supabase not configured). This checks the in-repo demo users.
    try {
      const local = (USERS as any)[id]
      if (local && local.password && password === local.password) {
        console.warn('Authenticated via local USERS fallback (insecure; remove before production).')
        return NextResponse.json({ ok: true })
      }
    } catch (e) {
      // ignore and continue to fail below
    }

    return NextResponse.json({ ok: false }, { status: 401 })
  } catch (error) {
    console.error('/api/auth/login error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
