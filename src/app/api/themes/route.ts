import { NextResponse } from 'next/server'
import { aiGenerateThemes } from '@/lib/openai.server'

export async function POST(request: Request) {
  const { verse, context, feedback } = await request.json()
  const themes = await aiGenerateThemes(verse || '', context || '', feedback || '')
  return NextResponse.json({ themes })
}
