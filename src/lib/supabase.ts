import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (for future use)
export interface Church {
  id: string
  name: string
  location: string
  created_at: string
}

export interface Song {
  id: string
  church_id: string
  title: string
  artist?: string
  ccli?: string
  tempo: 'slow' | 'medium' | 'fast'
  band_requirements: string
  youtube_url?: string
  created_at: string
}

export interface Activity {
  id: string
  church_id: string
  theme: string
  verse: string
  content: any
  created_at: string
}