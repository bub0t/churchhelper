import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'
import bcrypt from 'bcryptjs'

const SUPERADMIN_USERNAME = 'superadmin'

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

    // Regular users: check `users` table
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('id, password_hash, church_id, status')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('/api/auth/login supabase error:', error)
        return NextResponse.json({ ok: false }, { status: 500 })
      }

      if (data) {
        if (data.status !== 'approved') {
          return NextResponse.json({ ok: false, reason: 'pending' }, { status: 403 })
        }
        const match = await bcrypt.compare(password, data.password_hash)
        if (!match) return NextResponse.json({ ok: false }, { status: 401 })
        return NextResponse.json({ ok: true, role: 'user', churchId: data.church_id })
      }

      // No user found — fall through to legacy church fallback below
    }

    // Legacy fallback: check `churches` table (for existing CBC account before users table is seeded)
    if (supabase) {
      const { data: church } = await supabase
        .from('churches')
        .select('password')
        .eq('id', id)
        .maybeSingle()

      const stored = (church as any)?.password
      if (stored) {
        const match = await bcrypt.compare(password, stored)
        if (!match) return NextResponse.json({ ok: false }, { status: 401 })
        return NextResponse.json({ ok: true, role: 'user', churchId: id })
      }
    }

    return NextResponse.json({ ok: false }, { status: 401 })
  } catch (error) {
    console.error('/api/auth/login error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
