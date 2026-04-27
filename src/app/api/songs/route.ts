import { NextResponse } from 'next/server'
import { aiGenerateSongs } from '@/lib/openai.server'
import { USERS, SONG_METADATA } from '@/lib/data'
import { getTopKSongsByTheme } from '@/lib/embeddings.server'
import supabase from '@/lib/supabase.server'

async function getChurchSongsFromDb(churchId: string): Promise<{ title: string; artist?: string; tempo?: string; isHymn?: boolean }[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('church_songs')
    .select('songs(title, artist, tempo, is_hymn)')
    .eq('church_id', churchId)
  if (error) return null
  if (!data || data.length === 0) return []
  return (data as any[]).map(r => ({
    title: r.songs.title,
    artist: r.songs.artist,
    tempo: r.songs.tempo,
    isHymn: r.songs.is_hymn,
  }))
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const theme = body?.theme || ''
    const rawUserId = typeof body?.userId === 'string' ? body.userId : 'CBC'
    const churchId = rawUserId.toLowerCase()
    const excludedTitles: string[] = Array.isArray(body?.excludedTitles)
      ? body.excludedTitles.map((t: unknown) => (typeof t === 'string' ? t.toLowerCase() : '')).filter(Boolean)
      : []

    // Prefer Supabase as source of truth for church songs so newly added songs are included
    // null = Supabase unavailable (fall back to local data); [] = church exists but has no songs yet
    const dbSongs = await getChurchSongsFromDb(churchId)
    const churchSongs: string[] = dbSongs !== null
      ? dbSongs.map(s => s.title)
      : (USERS[churchId.toUpperCase() as keyof typeof USERS]?.songs || USERS['CBC'].songs || [])

    // Build a metadata map from DB results (merged with local SONG_METADATA)
    const dbMeta: Record<string, { artist?: string; tempo?: string; isHymn?: boolean }> = {}
    if (dbSongs) {
      for (const s of dbSongs) dbMeta[s.title] = s
    }
    const getMeta = (title: string) => (SONG_METADATA as any)[title] || dbMeta[title] || {}

    // Use embeddings-based prefilter — returns titles from church_songs in Supabase
    const top = await getTopKSongsByTheme(theme || '', Math.min(20, churchSongs.length), churchId)
    // top already comes from Supabase church_songs, so no need to re-filter against hardcoded list
    const allCandidates = top.length > 0 ? top : churchSongs.slice(0, 20)
    // Exclude previously shown songs so regeneration produces fresh results
    const candidates = excludedTitles.length > 0
      ? allCandidates.filter(t => !excludedTitles.includes(t.toLowerCase()))
      : allCandidates

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
    const hymnsAvailable = churchSongsList.filter(t => getMeta(t)?.isHymn)

    const isHymn = (s: any) => Boolean(getMeta(s.title)?.isHymn)

    let hymns = combined.filter(isHymn)
    let nonHymns = combined.filter(s => !isHymn(s))

    // If not enough hymns from the combined list, try to add hymns from repertoire
    if (hymns.length < 2) {
      for (const h of hymnsAvailable) {
        if (hymns.find(x => x.title === h)) continue
        const meta = getMeta(h)
        hymns.push({ id: `repl-hymn-${h}`, title: h, artist: meta?.artist, tempo: meta?.tempo || 'slow', bandRequirements: meta?.bandRequirements || 'Hymn' })
        if (hymns.length >= 2) break
      }
    }

    const final: any[] = []
    for (const h of hymns) {
      if (final.length >= 6) break
      final.push(h)
    }
    for (const s of nonHymns) {
      if (final.length >= 6) break
      final.push(s)
    }

    // If still under 6, fill from churchSongs excluding already included
    if (final.length < 6) {
      for (const title of churchSongsList) {
        if (final.find(f => f.title === title)) continue
        const meta = getMeta(title)
        final.push({ id: `fill-${title}`, title, artist: meta?.artist, tempo: meta?.tempo || 'medium', bandRequirements: meta?.bandRequirements || 'Full band' })
        if (final.length >= 6) break
      }
    }

    return NextResponse.json({ recommended: final, additional: [] })
  } catch (error) {
    console.error('/api/songs error:', error)
    return NextResponse.json({ recommended: [], additional: [] }, { status: 500 })
  }
}
