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

  const excludedQuestions: string[] = Array.isArray(body?.excludedQuestions)
    ? body.excludedQuestions.map((q: unknown) => (typeof q === 'string' ? q : '')).filter(Boolean)
    : []

  const questions = await aiGenerateDiscussion(theme, verses, excludedQuestions)
  return NextResponse.json({ questions })
}
