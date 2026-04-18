import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface Theme {
  id: string
  title: string
  description: string
}

export interface Activity {
  id: string
  title: string
  type: 'game' | 'craft' | 'song'
  activityLevel: 'laid-back' | 'moderate' | 'active'
  description: string
  materials?: string[]
  questions?: string[]
  expanded?: boolean
}

export interface Song {
  id: string
  title: string
  artist?: string
  ccli?: string
  tempo: 'slow' | 'medium' | 'fast'
  bandRequirements: string
  youtubeUrl?: string
}

export async function generateThemes(verse: string, context?: string): Promise<Theme[]> {
  try {
    const prompt = `Based on the Bible verse "${verse}"${context ? ` and context: "${context}"` : ''}, generate 3 relevant themes for church activities or worship planning. Each theme should have a title and brief description. Return as JSON array with id, title, and description fields.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from OpenAI')

    return JSON.parse(content)
  } catch (error) {
    console.error('Error generating themes:', error)
    // Fallback themes
    return [
      {
        id: '1',
        title: 'God\'s Love and Grace',
        description: 'Themes of unconditional love, forgiveness, and mercy'
      },
      {
        id: '2',
        title: 'Faith and Trust',
        description: 'Building confidence in God\'s promises and provision'
      },
      {
        id: '3',
        title: 'Community and Fellowship',
        description: 'The importance of relationships and supporting one another'
      }
    ]
  }
}

export async function generateActivities(
  theme: string,
  verse: string,
  groupSize: number,
  ageRange: string,
  weather: string
): Promise<Activity[]> {
  try {
    const prompt = `Generate 2-3 children's church activities based on theme "${theme}" from verse "${verse}". Group size: ${groupSize}, Age range: ${ageRange}, Weather: ${weather}.

For each activity, include:
- Title
- Type (game, craft, or song)
- Activity level (laid-back, moderate, or active)
- Description
- Materials needed (if applicable)
- Discussion questions appropriate for the age group

Consider weather conditions for indoor/outdoor suggestions. Return as JSON array.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from OpenAI')

    const activities = JSON.parse(content)
    return activities.map((activity: any, index: number) => ({
      ...activity,
      id: `activity-${index + 1}`,
      expanded: false
    }))
  } catch (error) {
    console.error('Error generating activities:', error)
    // Fallback activities
    return [
      {
        id: 'activity-1',
        title: 'Love Chain Game',
        type: 'game',
        activityLevel: 'moderate',
        description: 'A game demonstrating how God\'s love connects us all.',
        materials: ['Paper strips', 'Markers', 'Tape'],
        questions: [
          'How does God\'s love connect us?',
          'Who showed you love this week?',
          'How can you show love to others?'
        ],
        expanded: false
      }
    ]
  }
}

export async function generateSongs(theme: string, churchSongs: string[]): Promise<Song[]> {
  try {
    const prompt = `Based on theme "${theme}", select 4-5 songs from this church's repertoire: ${churchSongs.join(', ')}. Also suggest 1 additional song that would fit this church's style.

For each song, include:
- Title
- Artist (if known)
- CCLI number (if available)
- Tempo (slow, medium, fast)
- Band requirements (e.g., "Piano only", "Full band", "Acoustic guitar")
- YouTube URL (if you know one)

Return as JSON array.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from OpenAI')

    const songs = JSON.parse(content)
    return songs.map((song: any, index: number) => ({
      ...song,
      id: `song-${index + 1}`
    }))
  } catch (error) {
    console.error('Error generating songs:', error)
    // Fallback songs
    return [
      {
        id: 'song-1',
        title: 'King of Love',
        tempo: 'medium',
        bandRequirements: 'Full band',
        ccli: '7123204'
      }
    ]
  }
}

export async function getWeather(location: string): Promise<string> {
  // TODO: Implement weather API call
  // For now, return a mock weather condition
  return 'Sunny and mild'
}