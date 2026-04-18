import { NextResponse } from 'next/server'
import { aiGenerateActivities } from '@/lib/openai.server'

export async function POST(request: Request) {
  const { theme, verse, groupSize, ageRange, weather } = await request.json()
  const activities = await aiGenerateActivities(theme || '', verse || '', Number(groupSize) || 0, ageRange || '', weather || 'Sunny and mild')
  return NextResponse.json({ activities })
}
