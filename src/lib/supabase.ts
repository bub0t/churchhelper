import { createClient } from '@supabase/supabase-js'

// Prefer explicit NEXT_PUBLIC_* client env vars for browser usage.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

let _supabase: any = null
if (supabaseUrl && supabaseAnonKey) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Provide a minimal noop client to avoid runtime crashes when envs are missing (dev without Supabase).
  // Callers should handle the case where Supabase isn't configured and fall back to server-side auth.
  // eslint-disable-next-line no-console
  console.warn('Supabase client not configured: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.')
  _supabase = {
    auth: {
      async signInWithPassword() {
        return { data: null, error: new Error('Supabase client not configured') }
      },
      async signOut() {
        return { error: new Error('Supabase client not configured') }
      },
    },
    from() {
      return {
        select: async () => ({ data: null, error: new Error('Supabase client not configured') }),
        upsert: async () => ({ data: null, error: new Error('Supabase client not configured') }),
      }
    },
  }
}

export const supabase = _supabase

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