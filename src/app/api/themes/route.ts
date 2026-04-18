import { NextResponse } from 'next/server'
import { aiGenerateThemes } from '@/lib/openai.server'

export async function POST(request: Request) {
  try {
    const { verse, context, feedback } = await request.json()
    const themes = await aiGenerateThemes(verse || '', context || '', feedback || '')
    return NextResponse.json({ themes })
  } catch (error) {
    console.error('API /api/themes error:', error)
    return NextResponse.json({ themes: [], error: String(error) }, { status: 500 })
  }
}
