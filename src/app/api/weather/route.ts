import { NextResponse } from 'next/server'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Returns the next Unix timestamp (seconds) for the given weekday + local HH:MM time,
 * accounting for the location's UTC offset (in seconds, from OpenWeatherMap city.timezone).
 */
function nextServiceTimestamp(serviceDay: string, serviceTime: string, tzOffsetSeconds: number): number {
  const targetDayIndex = DAY_NAMES.indexOf(serviceDay)
  const [hStr, mStr] = serviceTime.split(':')
  const serviceHour = parseInt(hStr, 10)
  const serviceMin = parseInt(mStr, 10)

  // Current UTC time in seconds
  const nowUtc = Math.floor(Date.now() / 1000)
  // Current local time at the church location
  const nowLocal = nowUtc + tzOffsetSeconds
  // Current weekday (0=Sun) at local time
  const nowLocalDate = new Date(nowLocal * 1000)
  const currentDay = nowLocalDate.getUTCDay()

  // Seconds since midnight (local)
  const midnight = Math.floor(nowLocal / 86400) * 86400
  const serviceSecondsFromMidnight = serviceHour * 3600 + serviceMin * 60

  let daysAhead = (targetDayIndex - currentDay + 7) % 7
  // If today is the right day but service has already passed, go to next week
  if (daysAhead === 0 && nowLocal >= midnight + serviceSecondsFromMidnight) {
    daysAhead = 7
  }

  const serviceLocalTimestamp = midnight + daysAhead * 86400 + serviceSecondsFromMidnight
  // Convert back to UTC
  return serviceLocalTimestamp - tzOffsetSeconds
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || 'Canterbury, Victoria, Australia'
  const serviceDay = searchParams.get('serviceDay') || ''
  const serviceTime = searchParams.get('serviceTime') || ''
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    return NextResponse.json({ weather: 'Sunny and mild' })
  }

  const encoded = encodeURIComponent(location)
  const hasServiceParams = serviceDay && DAY_NAMES.includes(serviceDay) && /^\d{2}:\d{2}$/.test(serviceTime)

  try {
    if (hasServiceParams) {
      // Step 1: get coordinates + timezone via current weather (lightweight call)
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encoded}&units=metric&appid=${apiKey}`
      const currentRes = await fetch(currentUrl)
      if (!currentRes.ok) throw new Error('Weather API error')
      const currentData = await currentRes.json()

      const tzOffsetSeconds: number = currentData.timezone ?? 0
      const lat: number = currentData.coord?.lat
      const lon: number = currentData.coord?.lon

      if (lat == null || lon == null) throw new Error('No coordinates')

      const serviceUtcTs = nextServiceTimestamp(serviceDay, serviceTime, tzOffsetSeconds)
      const hoursAhead = (serviceUtcTs - Math.floor(Date.now() / 1000)) / 3600

      if (hoursAhead <= 120) {
        // Use 5-day 3-hourly forecast
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        const forecastRes = await fetch(forecastUrl)
        if (!forecastRes.ok) throw new Error('Forecast API error')
        const forecastData = await forecastRes.json()

        // Find the forecast slot closest to the service UTC timestamp
        const slots: any[] = forecastData.list || []
        let best = slots[0]
        let bestDiff = Infinity
        for (const slot of slots) {
          const diff = Math.abs(slot.dt - serviceUtcTs)
          if (diff < bestDiff) { bestDiff = diff; best = slot }
        }

        const description = best?.weather?.[0]?.description || 'mild conditions'
        const temp = best?.main?.temp != null ? Math.round(best.main.temp) : null
        const rain3h = best?.rain?.['3h'] ?? 0
        const pop: number = best?.pop ?? 0  // probability of precipitation (0–1)

        // Format display time
        const [hStr, mStr] = serviceTime.split(':')
        const h = parseInt(hStr, 10)
        const ampm = h < 12 ? 'AM' : 'PM'
        const displayH = h % 12 === 0 ? 12 : h % 12
        const displayTime = `${displayH}:${mStr} ${ampm}`
        const label = `forecast for ${serviceDay} ${displayTime}`

        let weatherStr = temp != null ? `${description}, ${temp}°C (${label})` : `${description} (${label})`

        if (rain3h > 0 || pop >= 0.5) {
          weatherStr += '; rain expected — ground may be wet'
        }

        return NextResponse.json({ weather: weatherStr })
      }
    }

    // Fallback: forecast not available (service too far ahead or no service params)
    if (hasServiceParams) {
      // Format a readable service date/time for the message
      const [hStr, mStr] = serviceTime.split(':')
      const h = parseInt(hStr, 10)
      const ampm = h < 12 ? 'AM' : 'PM'
      const displayH = h % 12 === 0 ? 12 : h % 12
      const displayTime = `${displayH}:${mStr} ${ampm}`
      const weatherStr = `Forecast not available yet — assuming sunny conditions for ${serviceDay} at ${displayTime} in ${location}`
      return NextResponse.json({ weather: weatherStr })
    }

    // No service params: return current conditions as before
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encoded}&units=metric&appid=${apiKey}`
    const currentRes = await fetch(currentUrl)
    if (!currentRes.ok) throw new Error('Weather API error')
    const currentData = await currentRes.json()

    const description = currentData.weather?.[0]?.description || 'mild conditions'
    const temp = currentData.main?.temp != null ? Math.round(currentData.main.temp) : null
    const rain1h = currentData.rain?.['1h'] ?? 0
    const rain3h = currentData.rain?.['3h'] ?? 0

    let weatherStr = temp != null ? `${description}, ${temp}°C` : description
    if (rain3h > 0 || rain1h > 0) {
      weatherStr += '; rain recorded recently — ground may be wet'
    }

    return NextResponse.json({ weather: weatherStr })
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json({ weather: 'Sunny and mild' })
  }
}
