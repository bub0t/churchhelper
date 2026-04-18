import { NextResponse } from 'next/server'
import { aiGenerateSongs } from '@/lib/openai.server'
import { USERS } from '@/lib/data'

export async function POST(request: Request) {
  const { theme } = await request.json()
  const churchSongs = USERS['CBC']?.songs || []
  const songs = await aiGenerateSongs(theme || '', churchSongs)
  return NextResponse.json({ songs })
}
