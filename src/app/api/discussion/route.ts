import { NextResponse } from 'next/server'
import { aiGenerateDiscussion } from '@/lib/openai.server'

export async function POST(request: Request) {
  const body = await request.json()
  const theme = String(body?.theme || '').trim()
  const verses: string[] = Array.isArray(body?.verses)
    ? body.verses.map((v: unknown) => String(v).trim()).filter(Boolean)
    : []

  if (!theme) {
    return NextResponse.json({ questions: [] }, { status: 400 })
  }

  const questions = await aiGenerateDiscussion(theme, verses)
  return NextResponse.json({ questions })
}
