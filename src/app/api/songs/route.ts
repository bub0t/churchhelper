import { NextResponse } from 'next/server'
import { aiGenerateSongs } from '@/lib/openai.server'
import { USERS, SONG_METADATA } from '@/lib/data'
import { getTopKSongsByTheme } from '@/lib/embeddings.server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const theme = body?.theme || ''
    const userId = typeof body?.userId === 'string' ? body.userId : 'CBC'
    const churchSongs = USERS[userId as keyof typeof USERS]?.songs || USERS['CBC'].songs || []

    // Use embeddings-based prefilter to reduce prompt size and cost
    const top = await getTopKSongsByTheme(theme || '', Math.min(20, churchSongs.length), userId || 'CBC')
    // If embeddings returned something, intersect with churchSongs preserving order
    const filtered = top.filter(t => churchSongs.includes(t))
    const candidates = filtered.length > 0 ? filtered : churchSongs.slice(0, 20)

    const result = await aiGenerateSongs(theme || '', candidates)

    // Post-process: limit to at most 6 recommendations and ensure at least 2 hymns
    const dedupeByTitle = (arr: any[]) => {
      const seen = new Set<string>()
      return arr.filter(s => {
        const t = (s.title || '').toString()
        if (!t || seen.has(t)) return false
        seen.add(t)
        return true
      })
    }

    const combined = dedupeByTitle([...(result.recommended || []), ...(result.additional || [])])

    const churchSongsList = churchSongs

    // Hymns available in this church's repertoire
    const hymnsAvailable = churchSongsList.filter(t => (SONG_METADATA as any)[t]?.isHymn)

    const isHymn = (s: any) => Boolean((SONG_METADATA as any)[s.title]?.isHymn)

    let hymns = combined.filter(isHymn)
    let nonHymns = combined.filter(s => !isHymn(s))

    // If not enough hymns from the combined list, try to add hymns from repertoire
    if (hymns.length < 2) {
      for (const h of hymnsAvailable) {
        if (hymns.find(x => x.title === h)) continue
        const meta = (SONG_METADATA as any)[h]
        hymns.push({ id: `repl-hymn-${h}`, title: h, artist: meta?.artist, tempo: meta?.tempo || 'slow', bandRequirements: meta?.bandRequirements || 'Hymn', reason: `Hymn from repertoire.` })
        if (hymns.length >= 2) break
      }
    }

    const final: any[] = []
    // add hymns first (up to 2 minimum, but allow more if present)
    for (const h of hymns) {
      if (final.length >= 6) break
      final.push(h)
    }

    // then fill with non-hymns until 6
    for (const s of nonHymns) {
      if (final.length >= 6) break
      final.push(s)
    }

    // If still under 6, fill from churchSongs (metadata) excluding already included
    if (final.length < 6) {
      for (const title of churchSongsList) {
        if (final.find(f => f.title === title)) continue
        const meta = (SONG_METADATA as any)[title]
        final.push({ id: `fill-${title}`, title, artist: meta?.artist, tempo: meta?.tempo || 'medium', bandRequirements: meta?.bandRequirements || 'Full band', reason: 'Fallback from repertoire.' })
        if (final.length >= 6) break
      }
    }

    return NextResponse.json({ recommended: final, additional: [] })
  } catch (error) {
    console.error('/api/songs error:', error)
    return NextResponse.json({ recommended: [], additional: [] }, { status: 500 })
  }
}
