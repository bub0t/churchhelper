import { NextResponse } from 'next/server'

const BIBLE_API_BASE = process.env.BIBLE_API_BASE || 'https://rest.api.bible'
// Prefer environment variable, otherwise fall back to provided key for convenience (remove before production)
const BIBLE_API_KEY = process.env.BIBLE_API_KEY || ''

// Known IDs discovered from the API for common English translations
const PREFERRED_BIBLES = [
  'd6e14a625393b4da-01', // New Living Translation (NLT)
  '78a9f6124f344018-01', // New International Version 2011 (NIV11)
]

async function fetchVerseText(verse: string) {
  for (const bibleId of PREFERRED_BIBLES) {
    try {
      const url = `${BIBLE_API_BASE}/v1/bibles/${bibleId}/passages?reference=${encodeURIComponent(verse)}`
      const res = await fetch(url, {
        headers: {
          'api-key': BIBLE_API_KEY,
          Accept: 'application/json',
        },
      })
      if (!res.ok) {
        continue
      }
      const json = await res.json()
      // API shapes vary; handle common shapes from rest.api.bible
      let text: any = null
      if (Array.isArray(json?.data) && json.data.length > 0) {
        text = json.data[0]?.content || json.data[0]?.text || json.data[0]
      } else {
        text = json?.data?.content || json?.data?.passages?.[0]?.content || json?.data?.text || json?.content || json?.text
      }
      if (typeof text === 'string' && text.trim()) {
        // Convert basic HTML to plain text: preserve paragraph breaks
        let plain = text.replace(/<\s*\/p\s*>/gi, '\n\n')
        plain = plain.replace(/<[^>]+>/g, ' ')
        plain = plain.replace(/&nbsp;/g, ' ')
        plain = plain.replace(/&amp;/g, '&')
        plain = plain.replace(/&lt;/g, '<')
        plain = plain.replace(/&gt;/g, '>')
        plain = plain.replace(/&quot;/g, '"')
        plain = plain.replace(/&#39;/g, "'")
        plain = plain.replace(/\s+\n/g, '\n')
        plain = plain.replace(/\n\s+/g, '\n')
        plain = plain.replace(/\s{2,}/g, ' ')
        plain = plain.trim()
        return { ref: verse, text: plain, bible: bibleId }
      }
      if (Array.isArray(text) && text.length > 0) return { ref: verse, text: text.map((t: any) => (t?.content || t?.text || JSON.stringify(t))).join('\n\n'), bible: bibleId }
      // fallback to stringify
      if (text) return { ref: verse, text: JSON.stringify(text), bible: bibleId }
    } catch (e) {
      // try next bible
      continue
    }
  }
  // If preferred IDs failed, try to discover a suitable English bible dynamically
  try {
    const listRes = await fetch(`${BIBLE_API_BASE}/v1/bibles`, {
      headers: { 'api-key': BIBLE_API_KEY, Accept: 'application/json' },
    })
    if (listRes.ok) {
      const listJson = await listRes.json()
      const eng = (listJson.data || []).find((b: any) => (b.language?.id === 'eng' || /english/i.test(b.language?.name || '')))
      if (eng && eng.id) {
        try {
          const url = `${BIBLE_API_BASE}/v1/bibles/${eng.id}/passages?reference=${encodeURIComponent(verse)}`
          const res = await fetch(url, { headers: { 'api-key': BIBLE_API_KEY, Accept: 'application/json' } })
          if (res.ok) {
            const json = await res.json()
            const text = json?.data?.content || json?.data?.passages?.[0]?.content || json?.data?.text || json?.content || json?.text
            if (typeof text === 'string' && text.trim()) return { ref: verse, text, bible: eng.id }
            if (Array.isArray(text) && text.length > 0) return { ref: verse, text: text.map((t: any) => (t?.content || t?.text || JSON.stringify(t))).join('\n\n'), bible: eng.id }
          }
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (e) {
    // ignore discovery errors
  }

  // if all lookups failed, mark as not found
  return { ref: verse, text: '', notFound: true }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const verses: string[] = Array.isArray(body?.verses) ? body.verses : []
    if (verses.length === 0) return NextResponse.json({ verses: [] })

    const results = await Promise.all(verses.map(v => fetchVerseText(v)))
    return NextResponse.json({ verses: results })
  } catch (error) {
    console.error('/api/bible/verses error', error)
    return NextResponse.json({ verses: [] }, { status: 500 })
  }
}
