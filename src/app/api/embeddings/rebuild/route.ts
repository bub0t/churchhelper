import { NextResponse } from 'next/server'
import { ensureSongEmbeddings } from '@/lib/embeddings.server'

export async function POST(request: Request) {
  try {
    const { userId, songs } = await request.json().catch(() => ({}))
    const res = await ensureSongEmbeddings(userId, songs)
    return NextResponse.json({ built: res.length })
  } catch (error) {
    console.error('/api/embeddings/rebuild error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
