import OpenAI from 'openai'
import { promises as fs } from 'fs'
import { join } from 'path'
import os from 'os'
import { CBC_SONGS, SONG_METADATA } from './data'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

type StoredEmbedding = {
  id: string
  title: string
  artist?: string
  vector: number[]
}

// Use OS temp dir for fallback writes on serverless platforms (Vercel has read-only project fs)
const EMBED_PATH = join(process.env.SONG_EMBED_PATH || os.tmpdir(), 'song-embeddings.json')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
let supabase: SupabaseClient | null = null
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text })
  // @ts-ignore
  return res.data[0].embedding as number[]
}

function cosine(a: number[], b: number[]) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12)
}

/**
 * Ensure embeddings exist for a given set of songs.
 * New schema: songs (shared pool) + church_songs (per-church junction).
 * Falls back to local JSON file when Supabase is not configured.
 */
export async function ensureSongEmbeddings(userId?: string, songs?: string[]): Promise<StoredEmbedding[]> {
  const sourceSongs = songs || CBC_SONGS

  if (IS_PRODUCTION && !supabase) {
    throw new Error('Refusing to write embeddings in production without SUPABASE_SERVICE_KEY configured.')
  }

  if (supabase && userId) {
    // Fetch titles already in the shared songs pool
    const { data: existing, error: selErr } = await supabase
      .from('songs')
      .select('id, title')
      .in('title', sourceSongs)
    if (selErr) throw selErr

    const existingMap: Record<string, string> = {}
    for (const row of existing || []) existingMap[row.title] = row.id

    // Generate embeddings for songs not yet in the shared pool
    const toCreate = sourceSongs.filter(t => !existingMap[t])
    for (const title of toCreate) {
      const meta = (SONG_METADATA as any)[title] || {}
      const seed = `${title}${meta.artist ? ' — ' + meta.artist : ''}`
      const vector = await embedText(seed)
      const { data: inserted, error: insErr } = await supabase
        .from('songs')
        .upsert({
          title,
          artist: meta.artist || null,
          tempo: meta.tempo || 'medium',
          ccli: meta.ccli || null,
          band_requirements: meta.bandRequirements || null,
          is_hymn: meta.isHymn || false,
          embedding: vector,
        }, { onConflict: 'title' })
        .select('id, title')
      if (insErr) throw insErr
      if (inserted && inserted[0]) existingMap[inserted[0].title] = inserted[0].id
    }

    // Link all songs to the church via church_songs
    const churchSongRows = sourceSongs
      .filter(t => existingMap[t])
      .map(t => ({ church_id: userId, song_id: existingMap[t] }))

    if (churchSongRows.length > 0) {
      const { error: csErr } = await supabase
        .from('church_songs')
        .upsert(churchSongRows, { onConflict: 'church_id,song_id' })
      if (csErr) throw csErr
    }

    // Return all songs for this church
    const { data: rows, error: rowsErr } = await supabase
      .from('church_songs')
      .select('songs(id, title, artist, embedding)')
      .eq('church_id', userId)
    if (rowsErr) throw rowsErr

    return (rows || []).map((r: any, idx: number) => {
      const s = r.songs
      return { id: s.id || `song-${idx + 1}`, title: s.title, artist: s.artist, vector: s.embedding }
    })
  }

  // Fallback: file-based storage
  try {
    const existing = await fs.readFile(EMBED_PATH, 'utf8')
    const parsed: StoredEmbedding[] = JSON.parse(existing)
    if (parsed.length >= sourceSongs.length) return parsed
  } catch (e) {
    // continue to (re)build
  }

  const out: StoredEmbedding[] = []
  for (let i = 0; i < sourceSongs.length; i++) {
    const title = sourceSongs[i]
    const meta = (SONG_METADATA as any)[title]
    const seed = `${title}${meta?.artist ? ' — ' + meta.artist : ''}`
    const vector = await embedText(seed)
    out.push({ id: `song-${i + 1}`, title, artist: meta?.artist, vector })
  }

  await fs.writeFile(EMBED_PATH, JSON.stringify(out, null, 2), 'utf8')
  return out
}

/**
 * Get top-K song titles by semantic similarity to a theme.
 * Uses the church's song list via church_songs join when Supabase is available.
 */
export async function getTopKSongsByTheme(theme: string, k = 10, userId?: string): Promise<string[]> {
  const themeVector = await embedText(theme)

  let emb: StoredEmbedding[] = []

  if (supabase && userId) {
    const { data: rows, error } = await supabase
      .from('church_songs')
      .select('songs(id, title, artist, embedding)')
      .eq('church_id', userId)

    if (!error && rows && rows.length > 0) {
      emb = (rows as any).map((r: any, idx: number) => {
        const s = r.songs
        return { id: s.id || `song-${idx + 1}`, title: s.title, artist: s.artist, vector: s.embedding }
      })
    }
    // fall through to file fallback if Supabase returned nothing
  }

  if (emb.length === 0) {
    try {
      const raw = await fs.readFile(EMBED_PATH, 'utf8')
      emb = JSON.parse(raw) as StoredEmbedding[]
    } catch (e) {
      emb = await ensureSongEmbeddings(undefined)
    }
  }

  const scored = emb.map(e => ({ title: e.title, score: cosine(themeVector, e.vector) }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, k).map(s => s.title)
}

export async function loadEmbeddings(): Promise<StoredEmbedding[] | null> {
  try {
    const raw = await fs.readFile(EMBED_PATH, 'utf8')
    return JSON.parse(raw) as StoredEmbedding[]
  } catch {
    return null
  }
}

export default {
  ensureSongEmbeddings,
  getTopKSongsByTheme,
  loadEmbeddings,
}


async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text })
  // @ts-ignore
  return res.data[0].embedding as number[]
}

function cosine(a: number[], b: number[]) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12)
}

// Build or ensure embeddings for a given user's song list. If userId is provided and Supabase is configured,
// store embeddings in Supabase scoped to that user. Otherwise store/read from local JSON file.
export async function ensureSongEmbeddings(userId?: string, songs?: string[]): Promise<StoredEmbedding[]> {
  const sourceSongs = songs || CBC_SONGS

  // In production, refuse to create or write local embedding files. Require Supabase service key.
  if (IS_PRODUCTION && !supabase) {
    throw new Error('Refusing to write embeddings in production without SUPABASE_SERVICE_KEY configured. Provide SUPABASE_SERVICE_KEY to persist embeddings to Supabase.')
  }

  // If Supabase is configured and userId provided, use Supabase storage
  if (supabase && userId) {
    // fetch existing for user
    const { data: existing, error: selErr } = await supabase.from('song_embeddings').select('title') .eq('user_id', userId)
    if (selErr) throw selErr
    const existingTitles = new Set((existing || []).map((r: any) => r.title))

    const toCreate = sourceSongs.filter(t => !existingTitles.has(t))
    const upserts: any[] = []
    for (let i = 0; i < toCreate.length; i++) {
      const title = toCreate[i]
      const meta = SONG_METADATA[title]
      const seed = `${title}${meta?.artist ? ' — ' + meta.artist : ''}`
      const vector = await embedText(seed)
      upserts.push({ user_id: userId, title, artist: meta?.artist, embedding: vector })
    }

    if (upserts.length > 0) {
      const { error: upErr } = await supabase.from('song_embeddings').insert(upserts)
      if (upErr) throw upErr
    }

    // return all stored embeddings for user
    const { data: rows, error: rowsErr } = await supabase.from('song_embeddings').select('title,artist,embedding').eq('user_id', userId)
    if (rowsErr) throw rowsErr
    return (rows || []).map((r: any, idx: number) => ({ id: `song-${idx + 1}`, title: r.title, artist: r.artist, vector: r.embedding }))
  }

  // Fallback: file-based storage
  try {
    const existing = await fs.readFile(EMBED_PATH, 'utf8')
    const parsed: StoredEmbedding[] = JSON.parse(existing)
    if (parsed.length >= sourceSongs.length) return parsed
  } catch (e) {
    // continue to (re)build
  }

  const out: StoredEmbedding[] = []
  for (let i = 0; i < sourceSongs.length; i++) {
    const title = sourceSongs[i]
    const meta = SONG_METADATA[title]
    const seed = `${title}${meta?.artist ? ' — ' + meta.artist : ''}`
    const vector = await embedText(seed)
    out.push({ id: `song-${i + 1}`, title, artist: meta?.artist, vector })
  }

  // In production we should never write fallback files (guard above prevents this).
  await fs.writeFile(EMBED_PATH, JSON.stringify(out, null, 2), 'utf8')
  return out
}

export default {
  ensureSongEmbeddings,
  getTopKSongsByTheme,
  loadEmbeddings,
}
