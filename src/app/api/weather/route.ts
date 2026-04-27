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

        // Compute the actual service date for the label
        const serviceLocalDate = new Date(serviceUtcTs * 1000 + tzOffsetSeconds * 1000)
        const dayNum = serviceLocalDate.getUTCDate()
        const monthName = serviceLocalDate.toLocaleString('en-AU', { month: 'long', timeZone: 'UTC' })
        const label = `Forecast for ${dayNum} ${monthName} (${serviceDay}) ${displayTime} in ${location}`

        let weatherStr = temp != null ? `${label}: ${description}, ${temp}°C` : `${label}: ${description}`

        const precipParts: string[] = []
        if (rain3h > 0) precipParts.push(`${rain3h.toFixed(1)}mm expected (3h window)`)
        if (pop > 0) precipParts.push(`${Math.round(pop * 100)}% chance of rain`)

        const wetGroundLikely = rain3h > 0 || pop >= 0.5
        if (precipParts.length > 0) {
          if (wetGroundLikely) {
            weatherStr += `. Precipitation: ${precipParts.join(', ')}. Ground likely wet — indoor activities recommended.`
          } else {
            weatherStr += `. ${precipParts.join(', ')} — outdoor activities likely fine, but light rain possible.`
          }
        } else {
          weatherStr += '. No rain expected — outdoor activities suitable.'
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

      // Compute the next service date even for the fallback
      const tzFallback = 0 // no tz data in this branch; use UTC approximation
      const serviceUtcFallback = nextServiceTimestamp(serviceDay, serviceTime, tzFallback)
      const fallbackDate = new Date(serviceUtcFallback * 1000)
      const dayNumF = fallbackDate.getUTCDate()
      const monthNameF = fallbackDate.toLocaleString('en-AU', { month: 'long', timeZone: 'UTC' })
      const weatherStr = `Forecast for ${dayNumF} ${monthNameF} (${serviceDay}) ${displayTime} in ${location}: rain data unavailable this far ahead — outdoor activities suggested for now, but verify closer to the date`
      return NextResponse.json({ weather: weatherStr })
    }

    // No service params: return current conditions with location label
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encoded}&units=metric&appid=${apiKey}`
    const currentRes = await fetch(currentUrl)
    if (!currentRes.ok) throw new Error('Weather API error')
    const currentData = await currentRes.json()

    const description = currentData.weather?.[0]?.description || 'mild conditions'
    const temp = currentData.main?.temp != null ? Math.round(currentData.main.temp) : null
    const rain1h: number = currentData.rain?.['1h'] ?? 0
    const rain3h: number = currentData.rain?.['3h'] ?? 0

    let weatherStr = `Current conditions in ${location}: ${temp != null ? `${description}, ${temp}°C` : description}`

    const precipParts: string[] = []
    if (rain1h > 0) precipParts.push(`${rain1h.toFixed(1)}mm in last 1h`)
    if (rain3h > 0) precipParts.push(`${rain3h.toFixed(1)}mm in last 3h`)

    if (precipParts.length > 0) {
      weatherStr += `. Recent rainfall: ${precipParts.join(', ')}. Ground may be wet — indoor activities recommended.`
    } else {
      weatherStr += '. No recent rain — outdoor activities suitable.'
    }

    return NextResponse.json({ weather: weatherStr })
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json({ weather: 'Sunny and mild' })
  }
}
