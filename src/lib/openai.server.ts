import OpenAI from 'openai'
import { promises as fs } from 'fs'
import { join } from 'path'
import { Activity, Song, Theme } from './types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
})

const promptCache = new Map<string, string>()

async function getPromptTemplate(name: string): Promise<string> {
  if (promptCache.has(name)) return promptCache.get(name)!

  const promptsPath = join(process.cwd(), 'src', 'lib', 'prompts.md')
  const file = await fs.readFile(promptsPath, 'utf8')
  const regex = new RegExp(`<!-- PROMPT:${name} -->([\s\S]*?)<!-- END_PROMPT:${name} -->`, 'i')
  const match = file.match(regex)

  if (!match) {
    throw new Error(`Prompt template not found: ${name}`)
  }

  const template = match[1].trim()
  promptCache.set(name, template)
  return template
}

function safeParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    const match = value.match(/(\[[\s\S]*\])/)
    if (match) {
      try {
        return JSON.parse(match[1]) as T
      } catch {
        return null
      }
    }
    return null
  }
}

async function createOpenAIResponse(prompt: string): Promise<string> {
  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
  })

  return response.output_text || ''
}

export async function aiGenerateThemes(verse: string, context?: string, feedback?: string): Promise<Theme[]> {
  const template = await getPromptTemplate('theme')
  const prompt = template
    .replace(/{{verse}}/g, verse)
    .replace(/{{contextSection}}/g, context ? ` and context: "${context}"` : '')
    .replace(/{{feedbackSection}}/g, feedback ? ` Also consider this feedback: "${feedback}".` : '')

  try {
    const raw = await createOpenAIResponse(prompt)
    const themes = safeParseJson<Theme[]>(raw)
    if (themes?.length) return themes
  } catch (error) {
    console.error('OpenAI themes error:', error)
  }

  return [
    { id: '1', title: 'God\'s Love and Grace', description: 'Themes of unconditional love, forgiveness, and mercy' },
    { id: '2', title: 'Faith and Trust', description: 'Building confidence in God\'s promises and provision' },
    { id: '3', title: 'Community and Fellowship', description: 'The importance of relationships and supporting one another' },
  ]
}

export async function aiGenerateActivities(
  theme: string,
  verse: string,
  groupSize: number,
  ageRange: string,
  weather: string
): Promise<Activity[]> {
  const template = await getPromptTemplate('activities')
  const prompt = template
    .replace(/{{theme}}/g, theme)
    .replace(/{{verse}}/g, verse)
    .replace(/{{groupSize}}/g, String(groupSize))
    .replace(/{{ageRange}}/g, ageRange)
    .replace(/{{weather}}/g, weather)

  try {
- 2-3 games
- 2-3 crafts
- 1 children's song suggestion for the children\'s activity time (not the congregational worship set)

For each activity, include exactly these fields:
- id
- title
- type (game, craft, or song)
- activityLevel (laid-back, moderate, or active)
- description
- themeRelation
- materials (array)
- questions (array of discussion questions appropriate for the age group)

Use actual children's worship song examples where possible, such as songs from Psalty, Cedarmont Kids, Seeds Family Worship, or classic children's praise music.
Make sure games and discussion questions are age-appropriate for ${ageRange}, with simple, theme-related questions.
Consider weather conditions for indoor/outdoor suggestions. Return as JSON array.`

  try {
    const raw = await createOpenAIResponse(prompt)
    const activities = safeParseJson<Activity[]>(raw)
    if (activities?.length) {
      return activities.map((activity, index) => ({ ...activity, id: `activity-${index + 1}`, expanded: false }))
    }
  } catch (error) {
    console.error('OpenAI activities error:', error)
  }

  return [
    {
      id: 'activity-1',
      title: 'Love Chain Game',
      type: 'game',
      activityLevel: 'moderate',
      description: 'A game demonstrating how God\'s love connects us all as children build a paper chain of encouragement.',
      themeRelation: 'The game uses the idea of a chain to show how the theme of being connected through God relates to each child.',
      materials: ['Paper strips', 'Markers', 'Tape'],
      questions: ['How does God\'s love connect us?', 'Who can you invite to share God\'s love?', 'What does it mean to encourage a friend?'],
      expanded: false,
    },
    {
      id: 'activity-2',
      title: 'Fruit of the Spirit Relay',
      type: 'game',
      activityLevel: 'active',
      description: 'A relay race where teams collect fruit labels while discussing the Fruit of the Spirit.',
      themeRelation: 'The relay reinforces the theme by helping children remember the Fruit of the Spirit through movement and teamwork.',
      materials: ['Fruit picture cards', 'Baskets', 'Cones'],
      questions: ['Which Fruit of the Spirit is your favorite?', 'How can kindness change your day?', 'Why does patience matter?'],
      expanded: false,
    },
    {
      id: 'activity-3',
      title: 'Prayer Bracelet Craft',
      type: 'craft',
      activityLevel: 'laid-back',
      description: 'Children make bracelets with colored beads to remind them of different prayer needs.',
      themeRelation: 'The craft connects to the theme by giving each child a tangible reminder of different prayer themes and values.',
      materials: ['Elastic string', 'Beads in different colors'],
      questions: ['What will you pray for today?', 'How can you help someone with your prayers?', 'What does each bead color remind you of?'],
      expanded: false,
    },
    {
      id: 'activity-4',
      title: 'Journey Map Poster',
      type: 'craft',
      activityLevel: 'moderate',
      description: 'Create a group poster showing a faith journey through Bible scenes and simple prayers.',
      themeRelation: 'The poster helps children see the theme as a journey they can follow together, making it easier to connect to the story.',
      materials: ['Poster board', 'Crayons', 'Stickers', 'Glue'],
      questions: ['What story from the Bible inspires you most?', 'How can you follow Jesus this week?', 'Who can you encourage with your poster?'],
      expanded: false,
    },
    {
      id: 'activity-5',
      title: 'This Little Light of Mine',
      type: 'song',
      activityLevel: 'laid-back',
      description: 'Sing and act out the classic children\'s song to celebrate letting God\'s light shine through you.',
      themeRelation: 'The song supports the theme by encouraging children to see themselves as lights in the world, reflecting the message of the lesson.',
      materials: ['Lyrics printout', 'Small flashlights or paper lanterns'],
      questions: ['What does it mean to let your light shine?', 'How can you show God\'s light to others?', 'Who can you invite to shine with you?'],
      expanded: false,
    },
  ]
}


export async function aiGenerateSongs(theme: string, churchSongs: string[]): Promise<Song[]> {
  const template = await getPromptTemplate('songs')
  const prompt = template
    .replace(/{{theme}}/g, theme)
    .replace(/{{churchSongs}}/g, churchSongs.join(', '))

  try {
    const raw = await createOpenAIResponse(prompt)
    const songs = safeParseJson<Song[]>(raw)
    if (songs?.length) {
      return songs.map((song, index) => ({ ...song, id: song.id || `song-${index + 1}` }))
    }
  } catch (error) {
    console.error('OpenAI songs error:', error)
  }

  return [
    { id: 'song-1', title: 'King of Love', tempo: 'medium', bandRequirements: 'Full band', ccli: '7123204' },
  ]
}
