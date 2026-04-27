import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase.server'
import { SONG_METADATA, CBC_SONGS } from '@/lib/data'
import precomputedEmbeddings from '@/lib/song-embeddings.json'

/**
 * POST /api/admin/seed-songs
 * Protected by ADMIN_SECRET env var.
 * Seeds the `songs` shared pool and `church_songs` junction table from:
 *   - SONG_METADATA (metadata: tempo, ccli, artist, isHymn, bandRequirements)
 *   - song-embeddings.json (pre-computed 1536-dim vectors — no OpenAI calls needed)
 *
 * Body: { secret: string, churchId?: string }
 * Default churchId: "cbc"
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { secret, churchId = 'cbc' } = body

    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    }

    // Build a lookup from title → precomputed vector
    const vectorMap: Record<string, number[]> = {}
    for (const item of precomputedEmbeddings as any[]) {
      if (item.title && Array.isArray(item.vector)) {
        vectorMap[item.title] = item.vector
      }
    }

    // Deduplicate CBC_SONGS
    const uniqueSongs = [...new Set(CBC_SONGS)]

    // Upsert into shared songs table
    const songRows = uniqueSongs.map(title => {
      const meta = (SONG_METADATA as any)[title] || {}
      return {
        title,
        artist: meta.artist || null,
        tempo: meta.tempo || 'medium',
        ccli: meta.ccli || null,
        band_requirements: meta.bandRequirements || null,
        is_hymn: meta.isHymn || false,
        embedding: vectorMap[title] || null,
      }
    })

    const { data: upsertedSongs, error: songsErr } = await supabase
      .from('songs')
      .upsert(songRows, { onConflict: 'title' })
      .select('id, title')

    if (songsErr) {
      console.error('seed-songs upsert error:', songsErr)
      return NextResponse.json({ ok: false, error: songsErr.message }, { status: 500 })
    }

    // Link songs to the church via church_songs
    const songIdMap: Record<string, string> = {}
    for (const row of upsertedSongs || []) {
      songIdMap[row.title] = row.id
    }

    const churchSongRows = uniqueSongs
      .filter(t => songIdMap[t])
      .map(t => ({ church_id: churchId, song_id: songIdMap[t] }))

    const { error: csErr } = await supabase
      .from('church_songs')
      .upsert(churchSongRows, { onConflict: 'church_id,song_id' })

    if (csErr) {
      console.error('seed-songs church_songs error:', csErr)
      return NextResponse.json({ ok: false, error: csErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      songsSeeded: songRows.length,
      churchSongsLinked: churchSongRows.length,
      churchId,
    })
  } catch (err) {
    console.error('/api/admin/seed-songs error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
