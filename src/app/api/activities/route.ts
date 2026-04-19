import { NextResponse } from 'next/server'
import { aiGenerateActivities } from '@/lib/openai.server'

export async function POST(request: Request) {
  const body = await request.json()
  const theme = body?.theme || ''
  // accept either `verse` (legacy) or `verses` (array) — pick the first provided verse for activity prompts
  const verses: string[] = Array.isArray(body?.verses) ? body.verses.map((v: any) => String(v).trim()).filter(Boolean) : []
  const verse = verses.length > 0 ? verses[0] : (body?.verse || '')
  const groupSize = Number(body?.groupSize) || 0
  const ageRange = body?.ageRange || ''
  const weather = body?.weather || 'Sunny and mild'

  const activities = await aiGenerateActivities(theme || '', verse || '', Number(groupSize) || 0, ageRange || '', weather || 'Sunny and mild')
  return NextResponse.json({ activities })
}
