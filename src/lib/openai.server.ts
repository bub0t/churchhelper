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
  // Strip markdown code fences first
  const stripped = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try {
    return JSON.parse(stripped) as T
  } catch {
    // Try to extract an object {...} first, then fall back to array [...]
    const objMatch = stripped.match(/(\{[\s\S]*\})/)
    if (objMatch) {
      try {
        return JSON.parse(objMatch[1]) as T
      } catch {}
    }
    const arrMatch = stripped.match(/(\[[\s\S]*\])/)
    if (arrMatch) {
      try {
        return JSON.parse(arrMatch[1]) as T
      } catch {}
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

export async function aiGenerateThemes(opts: { verses: string[]; context?: string; feedback?: string }): Promise<Theme[]> {
  const { verses, context, feedback } = opts
  const template = await getPromptTemplate('theme')
  const versesList = (verses || []).map((v, i) => `${i + 1}. ${v}`).join('\n')
  const prompt = template
    .replace(/{{verses}}/g, versesList)
    .replace(/{{versesInline}}/g, (verses || []).join(' | '))
    .replace(/{{contextSection}}/g, context ? ` Context: "${context}".` : '')
    .replace(/{{feedbackSection}}/g, feedback ? ` Feedback: "${feedback}".` : '')

  try {
    const raw = await createOpenAIResponse(prompt)
    let themes = safeParseJson<Theme[]>(raw)

    const allIndexes = (verses || []).map((_, i) => i)
    const countCommon = (arr: Theme[] | null | undefined) => (arr || []).filter(t => Array.isArray((t as any).covers) && allIndexes.every(idx => (t as any).covers.includes(idx))).length

    if (themes && countCommon(themes) >= 2) return themes

    // Retry once with a stronger instruction if constraint not met
    const retryPrompt = prompt + '\n\nIMPORTANT: If you did not produce at least two themes that apply to every provided verse, produce additional themes so there are at least two that cover all verses. Return only parseable JSON.'
    try {
      const raw2 = await createOpenAIResponse(retryPrompt)
      const themes2 = safeParseJson<Theme[]>(raw2)
      if (themes2 && countCommon(themes2) >= 2) return themes2
      if (themes2 && themes2.length > 0) themes = themes2
    } catch (e) {
      console.error('OpenAI themes retry error:', e)
    }

    // As a last resort, synthesize two combined themes that cover all verses
    const synthesizeFallback = () => {
      const combinedA: Theme = {
        id: 'synth-1',
        title: 'Combined Theme: Core Hope',
        description: 'A unifying theme that draws together the central hope and promise shared across the provided passages.',
      }
      const combinedB: Theme = {
        id: 'synth-2',
        title: 'Combined Theme: God\'s Faithfulness',
        description: 'A combined theme highlighting God\'s faithfulness and provision that links the selected verses.',
      }
      ;(combinedA as any).covers = allIndexes
      ;(combinedB as any).covers = allIndexes
      return [combinedA, combinedB]
    }

    const result: Theme[] = []
    if (themes && themes.length) {
      // ensure parsed themes have covers arrays where possible
      for (const t of themes) {
        if (!(t as any).covers) (t as any).covers = (t as any).covers || []
        result.push(t)
      }
    }

    const haveCommon = result.filter(t => Array.isArray((t as any).covers) && allIndexes.every(idx => (t as any).covers.includes(idx)))
    if (haveCommon.length >= 2) return result

    // attach synthesized themes
    return [...result, ...synthesizeFallback()]
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
  weather: string,
  excludedTitles: string[] = []
): Promise<Activity[]> {
  const template = await getPromptTemplate('activities')
  let prompt = template
    .replace(/{{theme}}/g, theme)
    .replace(/{{verse}}/g, verse)
    .replace(/{{groupSize}}/g, String(groupSize))
    .replace(/{{ageRange}}/g, ageRange)
    .replace(/{{weather}}/g, weather)
  if (excludedTitles.length > 0) {
    prompt += `\n\nIMPORTANT: Do NOT suggest any of these activities that were already shown: ${excludedTitles.join(', ')}. All suggestions must be completely different activities.`
  }
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

export async function aiGenerateDiscussion(theme: string, verses: string[], excludedQuestions: string[] = []): Promise<string[]> {
  const verseLine = verses.length > 0 ? `\nVerses: ${verses.join(', ')}` : ''
  const prompt = `Generate a set of discussion questions for a youth group of secondary school students aged 12 to 18.

Theme: "${theme}"${verseLine}

Every question must directly serve and support this theme — do not drift into general topics. Each question should help students engage more deeply with what the theme means, what the verse says, and how it applies to their lives.

Build the question set from these categories. The total must be between 5 and 8 questions. Use the theme to decide how many questions each category warrants — a richer theme with multiple real-life angles should produce more questions:

- Observation (0–1 questions): Ask what students notice, find surprising, or don't understand about the verse itself. Skip this category if the verse is straightforward and an observation question would feel forced.
- Theological (1 question): What does this theme reveal about God, human nature, or how life works?
- Real-life challenge (1–3 questions): Connect the theme to specific challenges teenagers face today — peer pressure, identity, social media, belonging, mental health, academic pressure, comparison culture, fear of failure, loneliness, etc. If the theme genuinely touches multiple challenges, write a separate question for each one. Name the challenge explicitly in the question. Do not combine multiple challenges into one question.
- Personal/reflective (1–2 questions): Ask students where they see this theme in their own life. If 2 questions, make them distinct — e.g. one about their inner experience, one about their relationships.
- Practical (1 question): What is one concrete thing they could do this week that reflects this theme?

Rules:
- All questions must clearly trace back to the theme. Do not ask questions that could apply to any topic.
- Questions within the same category must be meaningfully different from each other.
- The total number of questions must be between 5 and 8.

Return ONLY a valid JSON array of strings, e.g. ["Question 1?", "Question 2?", ...]${excludedQuestions.length > 0 ? `\n\nIMPORTANT: Do NOT repeat or closely paraphrase any of these previously shown questions:\n${excludedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\nAll questions must be fresh and distinct from the above.` : ''}`

  try {
    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt,
    })
    const text = response.output_text?.trim() || ''
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed) && parsed.length > 0) {
        const questions = parsed.map((q: unknown) => String(q))
        return questions.length > 8 ? questions.slice(0, 8) : questions
      }
    }
  } catch (e) {
    console.error('aiGenerateDiscussion error:', e)
  }

  // Fallback questions
  const verseRef = verses.length > 0 ? verses.join(', ') : `the theme of "${theme}"`
  return [
    `How does the theme "${theme}" connect to challenges you face in your own life?`,
    `When you scroll through social media and see others' highlight reels, how does the message of ${verseRef} change the way you see yourself?`,
    `Have you ever felt pressure from friends to act against your values? How could this theme give you strength in that moment?`,
    `What does it mean to live out the message of ${verseRef} as a young person today?`,
    `What is one practical thing you could do this week that reflects this theme?`,
  ]
}
