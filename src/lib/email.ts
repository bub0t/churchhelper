import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = 'Church Helper <onboarding@resend.dev>'

export async function sendAdminNotification(subject: string, html: string): Promise<void> {
  const to = process.env.SUPERADMIN_NOTIFICATION_EMAIL
  if (!resend || !to) {
    console.warn('[email] Resend not configured or SUPERADMIN_NOTIFICATION_EMAIL missing — skipping notification')
    return
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[email] Failed to send admin notification:', err)
  }
}

export async function sendUserEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.warn('[email] Resend not configured — skipping user email to', to)
    return
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[email] Failed to send user email:', err)
  }
}
