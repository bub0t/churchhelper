import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import supabase from '@/lib/supabase.server'
import { sendUserEmail } from '@/lib/email'

/**
 * POST /api/auth/forgot-password
 * Generates a password reset token and sends a reset link to the user's email.
 * Always returns { ok: true } regardless of whether the email exists (prevents enumeration).
 *
 * Body: { email: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Email is required' }, { status: 400 })
    }

    if (!supabase) {
      // Still return ok to avoid leaking info
      return NextResponse.json({ ok: true })
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (user) {
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

      await supabase.from('password_reset_tokens').insert({
        token,
        user_id: (user as any).id,
        expires_at: expiresAt,
        used: false,
      })

      const appUrl = process.env.APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
      const resetLink = `${appUrl}/reset-password?token=${token}`

      await sendUserEmail(
        email,
        'Reset your Church Helper password',
        `<p>Hi ${(user as any).id},</p>
         <p>You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.</p>
         <p><a href="${resetLink}">${resetLink}</a></p>
         <p>If you did not request this, you can safely ignore this email.</p>`
      )
    }

    // Always return ok
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/auth/forgot-password error:', err)
    return NextResponse.json({ ok: true }) // still mask errors
  }
}
