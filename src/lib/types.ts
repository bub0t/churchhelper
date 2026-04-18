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
  themeRelation?: string
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
