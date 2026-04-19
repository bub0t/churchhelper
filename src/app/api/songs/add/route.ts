import { NextResponse } from 'next/server'
import { USERS, SONG_METADATA, autoDetectHymn } from '@/lib/data'
import { ensureSongEmbeddings } from '@/lib/embeddings.server'
import supabase from '@/lib/supabase.server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userId = typeof body?.userId === 'string' ? body.userId : 'CBC'
    const raw = Array.isArray(body?.songs) ? body.songs : typeof body?.songs === 'string' ? body.songs.split('\n') : []

    const titles = raw.map((s: string) => s.trim()).filter(Boolean)
    if (titles.length === 0) {
      return NextResponse.json({ added: 0, existing: 0, message: 'No songs provided' })
    }

    const user = USERS[userId as keyof typeof USERS]
    if (!user) {
      return NextResponse.json({ added: 0, existing: titles.length, message: 'Unknown user' }, { status: 400 })
    }

    const existingSet = new Set((user.songs || []).map((t: string) => t.toLowerCase()))
    const toAdd: string[] = []
    let already = 0
    for (const t of titles) {
      if (existingSet.has(t.toLowerCase())) {
        already += 1
      } else {
        toAdd.push(t)
        user.songs.push(t)
        // ensure metadata exists
        if (!(SONG_METADATA as any)[t]) {
          ;(SONG_METADATA as any)[t] = { tempo: 'medium', bandRequirements: 'Full band' }
        }
        // auto-detect hymn flag
        try {
          ;(SONG_METADATA as any)[t].isHymn = autoDetectHymn(t)
        } catch {}
      }
    }

    // Build embeddings for the newly added songs (Supabase if configured, otherwise local file)
    if (toAdd.length > 0) {
      try {
        await ensureSongEmbeddings(userId, toAdd)
      } catch (err) {
        console.error('Failed to ensure embeddings for new songs:', err)
      }
    }

    // Persist updated church song list to Supabase if available
    if (supabase) {
      try {
        const { error } = await supabase.from('churches').upsert({ id: userId, location: user.location, songs: user.songs })
        if (error) console.error('Failed to upsert churches row:', error)
      } catch (err) {
        console.error('Supabase upsert failed:', err)
      }
    }

    return NextResponse.json({ added: toAdd.length, existing: already })
  } catch (error) {
    console.error('/api/songs/add error:', error)
    return NextResponse.json({ added: 0, existing: 0 }, { status: 500 })
  }
}
