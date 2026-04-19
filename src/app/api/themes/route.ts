import { NextResponse } from 'next/server'
import { aiGenerateThemes } from '@/lib/openai.server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Accept legacy single verse or new verses array
    const verses: string[] = Array.isArray(body?.verses)
      ? body.verses.map((v: any) => String(v).trim()).filter(Boolean)
      : body?.verse ? [String(body.verse).trim()] : []

    const context = body?.context || ''
    const feedback = body?.feedback || ''

    if (!verses || verses.length === 0) {
      return NextResponse.json({ themes: [], error: 'No verses provided' }, { status: 400 })
    }

    const themes = await aiGenerateThemes({ verses, context, feedback })
    return NextResponse.json({ themes })
  } catch (error) {
    console.error('API /api/themes error:', error)
    return NextResponse.json({ themes: [], error: String(error) }, { status: 500 })
  }
}
