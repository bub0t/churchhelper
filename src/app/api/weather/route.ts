import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || 'Canterbury, Victoria, Australia'
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (apiKey) {
    const encoded = encodeURIComponent(location)
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encoded}&units=metric&appid=${apiKey}`
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Weather API error')
      const data = await response.json()
      const description = data.weather?.[0]?.description || 'mild conditions'
      const temp = data.main?.temp != null ? Math.round(data.main.temp) : null
      return NextResponse.json({ weather: temp != null ? `${description}, ${temp}°C` : description })
    } catch (error) {
      console.error('Weather API error:', error)
    }
  }

  return NextResponse.json({ weather: 'Sunny and mild' })
}
