import { NextResponse } from 'next/server'
import { USERS, SONG_METADATA, autoDetectHymn } from '@/lib/data'
import { ensureSongEmbeddings } from '@/lib/embeddings.server'
import supabase from '@/lib/supabase.server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userId = typeof body?.userId === 'string' ? body.userId.toLowerCase() : 'cbc'
    const raw = Array.isArray(body?.songs) ? body.songs : typeof body?.songs === 'string' ? body.songs.split('\n') : []

    const titles = raw.map((s: string) => s.trim()).filter(Boolean)
    if (titles.length === 0) {
      return NextResponse.json({ added: 0, existing: 0, message: 'No songs provided' })
    }

    // Determine existing songs for this church
    let existingTitles: string[] = []
    if (supabase) {
      // Fetch from church_songs → songs join
      const { data: rows } = await supabase
        .from('church_songs')
        .select('songs(title)')
        .eq('church_id', userId)
      existingTitles = (rows || []).map((r: any) => r.songs?.title).filter(Boolean)
    } else {
      // Fallback to local USERS
      const user = USERS[userId.toUpperCase() as keyof typeof USERS] || USERS['CBC']
      existingTitles = user?.songs || []
    }

    const existingSet = new Set(existingTitles.map((t: string) => t.toLowerCase()))
    const toAdd: string[] = []
    let already = 0
    for (const t of titles) {
      if (existingSet.has(t.toLowerCase())) {
        already += 1
      } else {
        toAdd.push(t)
        // ensure metadata exists locally for embedding seed
        if (!(SONG_METADATA as any)[t]) {
          ;(SONG_METADATA as any)[t] = { tempo: 'medium', bandRequirements: 'Full band' }
        }
        try {
          ;(SONG_METADATA as any)[t].isHymn = autoDetectHymn(t)
        } catch {}
      }
    }

    // Build embeddings for new songs (upserts into songs pool + church_songs link)
    if (toAdd.length > 0) {
      try {
        await ensureSongEmbeddings(userId, toAdd)
      } catch (err) {
        console.error('Failed to ensure embeddings for new songs:', err)
      }
    }

    return NextResponse.json({ added: toAdd.length, existing: already })
  } catch (error) {
    console.error('/api/songs/add error:', error)
    return NextResponse.json({ added: 0, existing: 0 }, { status: 500 })
  }
}
