import OpenAI from 'openai'
import { promises as fs } from 'fs'
import { join } from 'path'
import { Activity, Song, Theme } from './types'
import { SONG_METADATA } from './data'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
})

const promptCache = new Map<string, string>()

async function getPromptTemplate(name: string): Promise<string> {
  if (promptCache.has(name)) return promptCache.get(name)!

  const promptsPath = join(process.cwd(), 'src', 'lib', 'prompts.md')
  const file = await fs.readFile(promptsPath, 'utf8')
  // try the strict form first, then a more flexible form that tolerates whitespace
  const strict = new RegExp(`<!-- PROMPT:${name} -->([\\s\\S]*?)<!-- END_PROMPT:${name} -->`, 'i')
  const flexible = new RegExp(`<!--\\s*PROMPT:${name}\\s*-->([\\s\\S]*?)<!--\\s*END_PROMPT:${name}\\s*-->`, 'i')
  let match = file.match(strict) || file.match(flexible)

  if (!match) {
    // fallback: if template is missing, provide a safe built-in default for known prompts
    console.warn(`Prompt template not found in prompts.md: ${name}. Using builtin fallback.`)
    const fallbacks: Record<string, string> = {
      theme: `You are a church volunteer creating church planning themes. Based on the Bible verse "{{verse}}"{{contextSection}}{{feedbackSection}}, prioritize the provided context and make sure each suggested theme clearly relates to it. Generate 3 relevant themes for church activities or worship planning. Each theme should have a title and brief description. Return as JSON array with id, title, and description fields.`,
      activities: `Generate 2-3 children's Christian church activities based on theme "{{theme}}" from verse "{{verse}}", or directly from "{{verse}}". Group size: {{groupSize}}, Age range: {{ageRange}}, Weather: {{weather}}.\n\nInclude:\n- 2-3 games\n- 2-3 crafts\n- 1 children's song suggestion for the children's activity time (not the congregational worship set)\n\nFor each activity, include exactly these fields:\n- id\n- title\n- type (game, craft, or song)\n- activityLevel (laid-back, moderate, or active)\n- description\n- themeRelation\n- materials (array)\n- questions (array of discussion questions appropriate for the age group)\n\nUse actual children's worship song examples where possible, such as songs from Psalty, Cedarmont Kids, Seeds Family Worship, or classic children's praise music.\nMake sure games and discussion questions are age-appropriate for {{ageRange}} in terms of complexity, and are related to the {{theme}} and/or {{verse}}.\nConsider weather conditions for indoor/outdoor suggestions. Return as JSON array.`,
      songs: `Based on theme "{{theme}}", select 4-5 songs from this church's repertoire: {{churchSongs}}. Also suggest 1 additional song that would fit this church's style.\n\nFor each song, include:\n- Title\n- Artist (if known)\n- CCLI number (if available)\n- Tempo (slow, medium, fast)\n- Band requirements (e.g., "Piano only", "Full band", "Acoustic guitar")\n- YouTube URL (if you know one)\n\nReturn as JSON array.`,
    }

    const fb = fallbacks[name]
    if (fb) {
      promptCache.set(name, fb)
      return fb
    }

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


export async function aiGenerateSongs(theme: string, churchSongs: string[]): Promise<{ recommended: Song[]; additional: Song[] }> {
  const template = await getPromptTemplate('songs')
  const prompt = template
    .replace(/{{theme}}/g, theme)
    .replace(/{{churchSongs}}/g, churchSongs.join(', '))

  try {
    const raw = await createOpenAIResponse(prompt)
    // Expecting an object with { recommended: [...], additional: [...] }
    const parsed = safeParseJson<{ recommended: Song[]; additional: Song[] }>(raw)
    if (parsed && (parsed.recommended?.length || parsed.additional?.length)) {
      const recommended = (parsed.recommended || []).map((s, i) => ({ ...s, id: s.id || `recommended-${i + 1}` }))
      const additional = (parsed.additional || []).map((s, i) => ({ ...s, id: s.id || `additional-${i + 1}` }))
      return { recommended, additional }
    }
  } catch (error) {
    console.error('OpenAI songs error:', error)
  }

  // Fallback: pick first 4 from churchSongs and suggest Amazing Grace
  const recommendedFallback = churchSongs.slice(0, 4).map((t, i) => {
    const meta = (SONG_METADATA as any)[t]
    return {
      id: `rec-fb-${i + 1}`,
      title: t,
      artist: meta?.artist,
      ccli: meta?.ccli,
      tempo: meta?.tempo || 'medium',
      bandRequirements: meta?.bandRequirements || 'Full band',
      reason: `Fits the theme ${theme} well from the church repertoire.`,
    } as Song
  })

  const additionalFallback = [
    {
      id: 'add-fb-1',
      title: 'Amazing Grace',
      artist: 'Traditional',
      tempo: 'slow',
      bandRequirements: 'Hymn',
      reason: 'Classic hymn that supports many themes of grace and love.',
    } as Song,
  ]

  return { recommended: recommendedFallback, additional: additionalFallback }
}
