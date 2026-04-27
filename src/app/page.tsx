'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronDown, ChevronUp, RefreshCw, BookOpen, Users, Music, MessageSquare } from 'lucide-react'
import { type Theme, type Activity, type Song } from '@/lib/types'
import { USERS, SONG_METADATA } from '@/lib/data'
import { supabase } from '@/lib/supabase'

function getNextSundayText() {
  const today = new Date()
  const nextSunday = new Date(today)
  const day = today.getDay()
  const daysUntilSunday = ((7 - day) % 7) || 7
  nextSunday.setDate(today.getDate() + daysUntilSunday)
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(nextSunday)
}

export default function Home() {
  const [step, setStep] = useState<'disclaimer' | 'about' | 'why-register' | 'login' | 'register' | 'register-church' | 'forgot-password' | 'admin' | 'verse' | 'verseReview' | 'themeContext' | 'themes' | 'choice' | 'activities' | 'songs' | 'youthDiscussion'>('disclaimer')

  // multi-verse inputs + aggregated verses array
  const [verse1, setVerse1] = useState('')
  const [verse2, setVerse2] = useState('')
  const [verse3, setVerse3] = useState('')
  const [verses, setVerses] = useState<string[]>([])
  const [versesText, setVersesText] = useState<Array<{ text: string; bible?: string; notFound?: boolean }>>([])

  const [context, setContext] = useState('')
  const [themes, setThemes] = useState<Theme[]>([])
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [userType, setUserType] = useState<'basic' | 'advanced' | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [recommendedFamiliar, setRecommendedFamiliar] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshingGames, setIsRefreshingGames] = useState(false)
  const [isRefreshingCrafts, setIsRefreshingCrafts] = useState(false)
  const [isRefreshingSong, setIsRefreshingSong] = useState(false)
  const [discussionQuestions, setDiscussionQuestions] = useState<string[]>([])
  const [regenerateCount, setRegenerateCount] = useState(0)
  const [songsRegenCount, setSongsRegenCount] = useState(0)
  const [songsCooldown, setSongsCooldown] = useState(false)
  const [youthRegenCount, setYouthRegenCount] = useState(0)
  const [youthCooldown, setYouthCooldown] = useState(false)
  const REGEN_LIMIT = 3
  const COOLDOWN_MS = 5000
  const [themeFeedback, setThemeFeedback] = useState('')
  const [weather, setWeather] = useState('')
  const weatherFetchedRef = useRef(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginChurchId, setLoginChurchId] = useState('')
  const [churchLocation, setChurchLocation] = useState('Canterbury, Victoria, Australia')
  const [churchServiceDay, setChurchServiceDay] = useState('Sunday')
  const [churchServiceTime, setChurchServiceTime] = useState('10:00')

  // Registration state
  const [regChurchId, setRegChurchId] = useState('')
  const [regChurchSearch, setRegChurchSearch] = useState('')
  const [regChurchName, setRegChurchName] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('')
  const [regInviteKey, setRegInviteKey] = useState('')
  const [regChurchLocation, setRegChurchLocation] = useState('')
  const [regServiceDay, setRegServiceDay] = useState('Sunday')
  const [regServiceTime, setRegServiceTime] = useState('10:00')
  const [regError, setRegError] = useState('')
  const [suburbQuery, setSuburbQuery] = useState('')
  const [suburbSuggestions, setSuburbSuggestions] = useState<string[]>([])
  const [suburbLoading, setSuburbLoading] = useState(false)
  const [suburbSelected, setSuburbSelected] = useState(false)
  const suburbDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [availableChurches, setAvailableChurches] = useState<{id: string, name: string, location: string}[]>([])

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  // Admin (superadmin) state
  const [adminPassword, setAdminPassword] = useState('')
  const [pendingChurches, setPendingChurches] = useState<any[]>([])
  const [adminSlugs, setAdminSlugs] = useState<Record<string, string>>({})
  const [adminInviteKeys, setAdminInviteKeys] = useState<Record<string, string>>({})
  const [adminMessage, setAdminMessage] = useState('')
  // Key lookup state
  const [keyLookupQuery, setKeyLookupQuery] = useState('')
  const [keyLookupResults, setKeyLookupResults] = useState<any[]>([])
  const [keyLookupSelected, setKeyLookupSelected] = useState<{id: string, name: string} | null>(null)
  const [keyLookupResult, setKeyLookupResult] = useState<string | null>(null)
  const [keyLookupLoading, setKeyLookupLoading] = useState(false)
  const [keyLookupError, setKeyLookupError] = useState('')
  const [groupSize, setGroupSize] = useState('')
  const [ageRange, setAgeRange] = useState('5-11')

  const handleSuburbInput = (value: string) => {
    setSuburbQuery(value)
    setRegChurchLocation(value)
    setSuburbSelected(false)
    setSuburbSuggestions([])
    if (suburbDebounceRef.current) clearTimeout(suburbDebounceRef.current)
    if (value.trim().length < 2) return
    suburbDebounceRef.current = setTimeout(async () => {
      setSuburbLoading(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(value + ', Australia')}&featuretype=settlement`
        const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'ChurchHelperApp/1.0' } })
        const data = await res.json()
        const suggestions: string[] = []
        for (const item of data) {
          const a = item.address || {}
          const suburb = a.suburb || a.village || a.town || a.city || a.municipality || ''
          const state = a.state || ''
          const country = a.country || ''
          if (suburb && state && country) {
            const label = `${suburb}, ${state}, ${country}`
            if (!suggestions.includes(label)) suggestions.push(label)
          }
        }
        setSuburbSuggestions(suggestions)
      } catch {
        // silently ignore network errors
      } finally {
        setSuburbLoading(false)
      }
    }, 400)
  }

  // Collect verses and go to review (no API call here)
  const handleVerseSubmit = async () => {
    const collected = [verse1, verse2, verse3].map(v => v.trim()).filter(Boolean)
    if (collected.length === 0) return
    setVerses(collected)

    // Fetch full verse texts from server-side proxy
    try {
      const res = await fetch('/api/bible/verses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verses: collected }),
      })
      if (res.ok) {
        const json = await res.json()
        const texts = Array.isArray(json.verses) ? json.verses.map((v: any) => ({ text: v.text || '', bible: v.bible, notFound: v.notFound || false })) : []
        setVersesText(texts)
      } else {
        setVersesText(collected.map((c) => ({ text: c })))
      }
    } catch (e) {
      console.warn('Bible API fetch failed', e)
      setVersesText(collected.map((c) => ({ text: c })))
    }

    setStep('verseReview')
  }

  const handleContinueFromReview = () => {
    setStep('themeContext')
  }

  const handleLogout = () => {
    setUserType(null)
    setLoginUsername('')
    setLoginPassword('')
    setLoginChurchId('')
    setVerse1('')
    setVerse2('')
    setVerse3('')
    setVerses([])
    setVersesText([])
    setRecommendedFamiliar([])
    setSongs([])
    setActivities([])
    setDiscussionQuestions([])
    setSelectedTheme(null)
    setSongsRegenCount(0)
    setSongsCooldown(false)
    setYouthRegenCount(0)
    setYouthCooldown(false)
    setStep('login')
  }

  const logoutButton = userType !== null ? (
    <button
      onClick={handleLogout}
      className="fixed top-3 right-4 z-50 text-xs text-slate-400 hover:text-slate-700 underline underline-offset-2"
    >
      Log out
    </button>
  ) : null

  const handleStartNewVerses = () => {
    setVerse1('')
    setVerse2('')
    setVerse3('')
    setVerses([])
    setVersesText([])
    setRecommendedFamiliar([])
    setSongs([])
    setActivities([])
    setDiscussionQuestions([])
    setSelectedTheme(null)
    setSongsRegenCount(0)
    setSongsCooldown(false)
    setYouthRegenCount(0)
    setYouthCooldown(false)
    setStep('verse')
  }

  const handleThemeContextSubmit = async () => {
    if (!verses || verses.length === 0) return
    setIsLoading(true)
    const validVerses = verses.filter((_, i) => !versesText[i]?.notFound)
    if (validVerses.length === 0) return
    try {
      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verses: validVerses, context, feedback: themeFeedback }),
      })
      if (!response.ok) {
        const text = await response.text()
        console.error('Themes API error response:', response.status, text)
        setThemes([])
        setIsLoading(false)
        return
      }
      const data = await response.json()
      setThemes(data.themes || [])
      setStep('themes')
    } catch (error) {
      console.error('Error generating themes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleThemeSelect = (theme: Theme) => {
    setSelectedTheme(theme)
    setStep('choice')
  }

  const handleRegenerateThemes = async () => {
    setIsLoading(true)
    try {
      const validVerses = verses.filter((_, i) => !versesText[i]?.notFound)
      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verses: validVerses,
          context: context + ' (regenerated)',
          feedback: themeFeedback,
        }),
      })
      if (!response.ok) {
        const text = await response.text()
        console.error('Themes regenerate API error response:', response.status, text)
        setThemes([])
        setIsLoading(false)
        return
      }

      const data = await response.json()
      setThemes(data.themes || [])
      setRegenerateCount(prev => prev + 1)
    } catch (error) {
      console.error('Error regenerating themes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChoiceSelect = (choice: 'activities' | 'songs' | 'youthDiscussion') => {
    if (choice === 'activities' || choice === 'youthDiscussion') {
      if (choice === 'youthDiscussion') {
        generateDiscussionQuestions()
      }
      setStep(choice)
      return
    }

    if (choice === 'songs' && userType !== 'advanced') {
      setStep('login')
      return
    }
    setStep(choice)
  }

  const generateDiscussionQuestions = async () => {
    if (!selectedTheme) return
    setIsLoading(true)
    setDiscussionQuestions([])
    try {
      const response = await fetch('/api/discussion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selectedTheme.title, verses }),
      })
      if (response.ok) {
        const data = await response.json()
        setDiscussionQuestions(data.questions || [])
      }
    } catch (e) {
      console.error('Discussion questions failed', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async () => {
    try {
      const normalizedUsername = loginUsername.trim().toLowerCase()
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: normalizedUsername, password: loginPassword }),
      })
      const json = await res.json()

      if (!res.ok || !json.ok) {
        if (res.status === 403 && json.reason === 'pending') {
          alert('Your registration is pending admin approval. You will be notified when approved.')
        } else {
          alert('Invalid credentials')
        }
        return
      }

      if (json.role === 'superadmin') {
        setAdminPassword(loginPassword)
        setLoginPassword('')
        setLoginUsername('')
        await loadPendingChurches(loginPassword)
        setStep('admin')
        return
      }

      setLoginUsername(normalizedUsername)
      setLoginChurchId(json.churchId || normalizedUsername)
      if (json.churchLocation) setChurchLocation(json.churchLocation)
      if (json.serviceDay) setChurchServiceDay(json.serviceDay)
      if (json.serviceTime) setChurchServiceTime(json.serviceTime)
      setUserType('advanced')
      setStep('verse')
    } catch (e) {
      console.error('Login error', e)
      alert('Login failed')
    }
  }

  const loadPendingChurches = async (password: string) => {
    const INVITE_VERSES = ['John3:16','Psalm23','Romans8:28','Proverbs3:5','Isaiah40:31','Philippians4:13','Jeremiah29:11','Matthew6:33','Galatians5:22','Hebrews11:1','Psalm46:10','John14:6','Romans5:8','Ephesians2:8','Joshua1:9']
    const INVITE_WORDS = ['Grace','Peace','Joy','Hope','Faith','Love','Light','Jordan','Zion','Bethel','Shalom','Moses','Elijah','Salvation','Praise','Glory','Refuge','Canaan','Lamb','Shepherd']
    const suggestKey = () => {
      const verse = INVITE_VERSES[Math.floor(Math.random() * INVITE_VERSES.length)]
      const word = INVITE_WORDS[Math.floor(Math.random() * INVITE_WORDS.length)]
      return `${verse}+${word}`
    }
    try {
      const res = await fetch('/api/admin/pending-churches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (json.ok) {
        const churches = json.churches || []
        setPendingChurches(churches)
        const slugs: Record<string, string> = {}
        const keys: Record<string, string> = {}
        for (const c of churches) {
          slugs[c.id] = c.id
          keys[c.id] = suggestKey()
        }
        setAdminSlugs(slugs)
        setAdminInviteKeys(keys)
      }
    } catch (e) {
      console.error('Failed to load pending churches', e)
    }
  }

  const handleApproveChurch = async (pendingId: string) => {
    const approvedId = (adminSlugs[pendingId] || pendingId).trim().toLowerCase()
    const inviteKey = (adminInviteKeys[pendingId] || '').trim()
    if (!inviteKey) { setAdminMessage('Please set an invite key before approving.'); return }
    setAdminMessage('')
    try {
      const res = await fetch('/api/admin/approve-church', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, pendingId, approvedId, inviteKey }),
      })
      const json = await res.json()
      if (json.ok) {
        setPendingChurches(prev => prev.filter(c => c.id !== pendingId))
        setAdminMessage(`Approved: ${approvedId}`)
      } else {
        setAdminMessage(`Error: ${json.error}`)
      }
    } catch (e) {
      setAdminMessage('Failed to approve church')
    }
  }

  const handleRejectChurch = async (churchId: string) => {
    if (!confirm(`Reject and delete "${churchId}" and all its pending users?`)) return
    setAdminMessage('')
    try {
      const res = await fetch('/api/admin/reject-church', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, churchId }),
      })
      const json = await res.json()
      if (json.ok) {
        setPendingChurches(prev => prev.filter(c => c.id !== churchId))
        setAdminMessage(`Rejected: ${churchId}`)
      } else {
        setAdminMessage(`Error: ${json.error}`)
      }
    } catch (e) {
      setAdminMessage('Failed to reject church')
    }
  }

  const handleActivitiesSubmit = async () => {
    if (!groupSize || !ageRange || !selectedTheme) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: selectedTheme.title,
          verses,
          groupSize: parseInt(groupSize, 10),
          ageRange,
          weather,
        }),
      })
      const data = await response.json()
      let generatedActivities = (data.activities || []) as Activity[]

      // Post-process to ensure a balanced mix: 3-4 games, 2-3 crafts, 1-2 songs
      const ensureBalanced = (items: Activity[]) => {
        const games = items.filter(a => a.type === 'game')
        const crafts = items.filter(a => a.type === 'craft')
        const songs = items.filter(a => a.type === 'song')

        // simple built-in fallbacks
        const craftFallbacks: Activity[] = [
          {
            id: 'cf-1', title: 'Prayer Bead Craft', type: 'craft', activityLevel: 'laid-back', description: 'Make simple prayer beads to remember key prayers.', themeRelation: '', materials: ['Beads','String'], questions: ['Who will you pray for?'], expanded: false
          },
          {
            id: 'cf-2', title: 'Faith Collage', type: 'craft', activityLevel: 'moderate', description: 'Create a collage of things that remind us of God’s faithfulness.', themeRelation: '', materials: ['Magazines','Glue','Paper'], questions: ['What image shows God’s care?'], expanded: false
          },
          {
            id: 'cf-3', title: 'Praise Flags', type: 'craft', activityLevel: 'laid-back', description: 'Decorate small flags to wave during a song.', themeRelation: '', materials: ['Paper','Sticks','Markers'], questions: ['What are you thankful for?'], expanded: false
          },
        ]

        const songFallbacks: Activity[] = [
          { id: 'song-1', title: 'This Little Light of Mine', type: 'song', activityLevel: 'laid-back', description: 'Sing and act out to reinforce the theme.', themeRelation: '', materials: ['Lyrics'], questions: [], expanded: false },
          { id: 'song-2', title: 'Deep and Wide (children)', type: 'song', activityLevel: 'moderate', description: 'Simple motions with song to remember the message.', themeRelation: '', materials: ['Lyrics'], questions: [], expanded: false },
        ]

        // Ensure at least 2 crafts (use generic fallbacks only for crafts/songs, not games)
        if (crafts.length < 2) {
          const needed = 2 - crafts.length
          for (let i = 0; i < needed && i < craftFallbacks.length; i++) items.push(craftFallbacks[i])
        }

        // Ensure at least 1 song
        if (songs.length < 1) {
          items.push(songFallbacks[0])
        }
        return items
      }

      generatedActivities = ensureBalanced(generatedActivities)

      const mapped = generatedActivities.map((activity, index) => ({ ...activity, id: activity.id || `activity-${index + 1}`, expanded: false }))
      const finalActivities = mapped.map((activity: Activity, index: number) => {
        const safeQuestions = activity.questions && activity.questions.length > 0
          ? activity.questions
          : [
              `How does this activity connect to the theme "${selectedTheme?.title}"?`,
              'What part of this activity helped you remember the main idea?',
              'Why is this idea important for the children to learn?',
            ]

        return {
          ...activity,
          id: activity.id || `activity-${index + 1}`,
          expanded: false,
          questions: safeQuestions,
          themeRelation: activity.themeRelation || `This activity connects to the theme by reinforcing the main lesson in a child-friendly way.`,
        }
      })
      setActivities(finalActivities)
    } catch (error) {
      console.error('Error generating activities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSongsGenerate = async () => {
    if (!selectedTheme) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selectedTheme.title, userId: (loginChurchId || loginUsername || 'CBC') }),
      })
      const data = await response.json()
      const rec = data.recommended || []
      const rawAdditional = data.additional || []

      const normalize = (s: any, index: number) => {
        if (typeof s === 'string') {
          const meta = SONG_METADATA[s]
          return {
            id: `song-${index + 1}`,
            title: s,
            artist: meta?.artist,
            ccli: meta?.ccli,
            tempo: (meta?.tempo as any) || 'medium',
            bandRequirements: meta?.bandRequirements || 'Full band',
            youtubeUrl: undefined,
            isHymn: (meta as any)?.isHymn || false,
          }
        }

        return {
          id: s.id || `song-${index + 1}`,
          title: s.title || s.Name || 'Untitled Song',
          artist: s.artist || s.Artist || undefined,
          ccli: s.ccli || s.CCLI || undefined,
          tempo: s.tempo || 'medium',
          bandRequirements: s.bandRequirements || 'Full band',
          youtubeUrl: undefined,
          isHymn: s.isHymn || false,
        }
      }

      const normalizedRecommended = rec.map((s: any, i: number) => normalize(s, i))
      setRecommendedFamiliar(normalizedRecommended)

      const normalizedAdditional = rawAdditional.map((s: any, i: number) => normalize(s, i))
      setSongs(normalizedAdditional)
    } catch (error) {
      console.error('Error generating songs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-generate songs when navigating to the songs page for the selected theme
  // Fetch weather once when the user reaches the choice step (before activities)
  useEffect(() => {
    if (step === 'choice' && !weatherFetchedRef.current) {
      weatherFetchedRef.current = true
      const params = new URLSearchParams({
        location: churchLocation,
        serviceDay: churchServiceDay,
        serviceTime: churchServiceTime,
      })
      fetch(`/api/weather?${params}`)
        .then(r => r.json())
        .then(data => { setWeather(data.weather || 'Sunny and mild') })
        .catch(() => { setWeather('Sunny and mild') })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    if (step === 'songs' && selectedTheme) {
      // Only trigger if we don't already have recommendations
      if (!recommendedFamiliar || recommendedFamiliar.length === 0) {
        // show searching message and generate
        setIsLoading(true)
        handleSongsGenerate().catch((e) => console.error('Auto song generation failed', e))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedTheme])

  const toggleActivityExpansion = (activityId: string) => {
    setActivities(prev => prev.map(activity =>
      activity.id === activityId
        ? { ...activity, expanded: !activity.expanded }
        : activity
    ))
  }

  const generateNewActivity = (activityId: string) => {
    // TODO: Generate new activity
    console.log('Generate new activity for:', activityId)
  }

  if (step === 'disclaimer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-slate-900">Welcome to Church Helper</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 shadow-sm">
              <div className="flex items-start gap-3">
                <BookOpen className="mt-1 h-5 w-5 text-amber-700" />
                <div>
                  <p className="font-semibold">Important Disclaimer</p>
                  <p className="text-sm leading-6">
                    This app is a planning tool only. Please use proper discernment with the Holy Spirit when making decisions for your church. Always seek wisdom from God and experienced church leaders.
                  </p>
                </div>
              </div>
            </Alert>

            <div className="text-center">
              <Button onClick={() => setStep('login')} className="border border-slate-300 shadow-sm text-slate-900">
                Continue
              </Button>
            </div>

            <div className="flex justify-center text-sm">
              <button
                type="button"
                className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                onClick={() => setStep('about')}
              >
                About this app
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'about') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900">About Church Helper</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-slate-700 text-sm leading-7">
            <p>
              <strong>Church Helper</strong>'s goal is to make it easier for more people to serve by giving them a clear place to begin. It supports volunteers who are willing to help but don’t know where to start. After taking time to reflect on the message or Scripture and seeking guidance from the Holy Spirit, volunteers can use the app as a starting point by reviewing suggestions, adapting them, or writing their own ideas as they prepare to serve.
            </p>
            <p>You start by entering one or more Bible verses for your upcoming service. Church Helper then suggests themes drawn directly from those passages. Once you choose a theme, you can generate:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Children's activities</strong> — age-appropriate games, crafts, and questions tailored to your theme, group size, and the weather forecast on your service day.</li>
              <li><strong>Worship song suggestions</strong> — songs from your church's own repertoire that match your chosen theme. <em>(Registered users only.)</em></li>
              <li><strong>Youth group discussion questions</strong> — thoughtful prompts for teenagers that connect the theme to real challenges young people face today.</li>
            </ul>
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <div className="flex items-start gap-3">
                <BookOpen className="mt-1 h-5 w-5 shrink-0 text-amber-700" />
                <p className="text-sm leading-6">
                  <strong>A note on discernment:</strong> Church Helper is a starting point, not a decision-maker.
                  Nothing should replace careful prayer, reflection, and the wisdom of your pastoral team when choosing what activities and messages to bring to your congregation.
                  Always apply your own judgement before using anything this app suggests.
                </p>
              </div>
            </Alert>
            <div className="text-center pt-2">
              <Button onClick={() => setStep('disclaimer')} className="border border-slate-300 shadow-sm text-slate-900">Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'why-register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900">Do I need to register?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-slate-700 text-sm leading-7">
            <p>
              <strong>No — you can use Church Helper as a guest.</strong> Guest access lets you enter verses, choose a theme, and generate children's activities and youth discussion questions without creating an account.
            </p>
            <p>
              <strong>Registering unlocks congregational song suggestions.</strong> When your church registers, you get a shared song database — a list of worship songs your congregation already knows and loves.
              Church Helper uses that list to suggest songs that match your chosen theme, so you're not starting from scratch every week.
            </p>
            <p>
              Because every congregation is different, the song database is unique to your church. Registered users from the same church all share and contribute to one list, keeping it relevant to your community.
            </p>
            <p>
              If your church isn't registered yet, you can still use Church Helper as a guest to generate children's activities and youth discussion questions — no account needed.
            </p>
            <Alert className="border-blue-200 bg-blue-50 text-blue-900">
              <AlertDescription className="text-sm">
                <strong>Note:</strong> Registering a new church is currently disabled while we complete further testing.
                If your church isn't already on Church Helper, please check back soon — we'll open registrations once testing is complete.
              </AlertDescription>
            </Alert>
            <div className="text-center pt-2">
              <Button onClick={() => setStep('login')} className="border border-slate-300 shadow-sm text-slate-900">Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'verse') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        {logoutButton}
        <div className="max-w-2xl w-full space-y-6">
          <Card className="w-full bg-white text-slate-950">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900">Let's Get Started</CardTitle>
              <CardDescription>
                Share up to three Bible verses or passages you'd like to base your planning on
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bible Verse 1
                </label>
                <Input
                  placeholder="e.g., John 3:16"
                  value={verse1}
                  onChange={(e) => setVerse1(e.target.value)}
                  className="w-full mb-2"
                />
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bible Verse 2 (optional)
                </label>
                <Input
                  placeholder="e.g., Romans 8:28-30"
                  value={verse2}
                  onChange={(e) => setVerse2(e.target.value)}
                  className="w-full mb-2"
                />
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bible Verse 3 (optional)
                </label>
                <Input
                  placeholder="e.g., Psalm 23"
                  value={verse3}
                  onChange={(e) => setVerse3(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Additional context removed per request; context can be added later in the next step */}

              <div className="flex gap-3">
                <Button
                  onClick={handleVerseSubmit}
                  disabled={!(verse1.trim() || verse2.trim() || verse3.trim()) || isLoading}
                  className="w-full border border-slate-300 shadow-sm text-slate-900"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === 'verseReview') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        {logoutButton}
        <div className="max-w-2xl w-full">
          <Card>
            <CardHeader>
              <CardTitle>Review verses</CardTitle>
              <CardDescription>
                Here are the verses you requested. Reflect on these words and let the Holy Spirit guide you. When you are ready, press Continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {verses && verses.length > 0 ? (
                  <div className="space-y-4">
                    {verses.map((v, i) => {
                      const vt = versesText[i]
                      const bibleId = vt?.bible
                      const label = bibleId === 'd6e14a625393b4da-01' ? 'NLT'
                        : bibleId === '78a9f6124f344018-01' ? 'NIV' : (bibleId ? bibleId : '')
                      return (
                        <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-baseline justify-between">
                            <div className="font-semibold text-slate-800">{v}</div>
                            {label ? <div className="text-xs text-slate-500">{label}</div> : null}
                          </div>
                          {vt?.notFound
                            ? <div className="text-red-500 text-sm mt-2 italic">No scripture found for this reference.</div>
                            : <div className="text-slate-700 whitespace-pre-wrap text-sm mt-2">{vt?.text || 'Passage not available.'}</div>
                          }
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-slate-600">No verses available.</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep('verse')} className="flex-1 border border-slate-300 shadow-sm text-slate-900">Back</Button>
                <Button onClick={handleContinueFromReview} className="flex-1 border border-slate-300 shadow-sm text-slate-900">Continue</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === 'themeContext') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        {logoutButton}
        <div className="max-w-2xl w-full">
          <Card>
            <CardHeader>
              <CardTitle>Preparing Governing Themes</CardTitle>
              <CardDescription>
                The app will now identify governing themes from the verses provided and plan service details based on those themes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Additional information</label>
                <textarea
                  placeholder="Add any additional information such as service summaries, specific goals, intended audience, and any leading of the Holy Spirit you want included."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="w-full min-h-[120px] resize-y px-3 py-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep('verseReview')} className="flex-1 border border-slate-300 shadow-sm text-slate-900">Back</Button>
                <Button onClick={handleThemeContextSubmit} disabled={isLoading} className="flex-1 border border-slate-300 shadow-sm text-slate-900">
                  {isLoading ? 'Generating Themes...' : 'Generate Themes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === 'themes') {
    return (
      <div className="min-h-screen bg-white p-4">
        {logoutButton}
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="mb-4">
              <Button variant="outline" onClick={() => setStep('verseReview')} className="border border-slate-300 text-slate-700">
                ← Back to verse preview
              </Button>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-950 mb-2">Choose a Theme</h1>
              <p className="text-slate-700">Based on: {verses && verses.length > 0 ? verses.join(', ') : '—'}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {themes.map((theme) => (
              <Card
                key={theme.id}
                className="cursor-pointer hover:shadow-lg transition-shadow bg-white border border-slate-200 text-slate-950"
                onClick={() => handleThemeSelect(theme)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{theme.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 text-sm">{theme.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              onClick={handleRegenerateThemes}
              disabled={isLoading}
              className="gap-2 border border-slate-300 shadow-sm text-slate-900"
            >
              <RefreshCw className="h-4 w-4" />
              {isLoading
                ? 'Regenerating...'
                : themeFeedback
                  ? 'Regenerate with feedback'
                  : 'Try Different Themes'}
            </Button>
          </div>

          {regenerateCount >= 1 && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-950 mt-6">
              <p className="text-sm text-slate-700 mb-3">
                Not what you are looking for? Tell us why so we can improve the next theme suggestions.
              </p>
              <textarea
                placeholder="Tell me what you need to change or what focus should be stronger..."
                value={themeFeedback}
                onChange={(e) => setThemeFeedback(e.target.value)}
                rows={4}
                className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="mt-3 text-right">
                <Button
                  onClick={handleRegenerateThemes}
                  disabled={isLoading || !themeFeedback.trim()}
                  className="border border-slate-300 bg-white text-slate-950 shadow-sm"
                >
                  {isLoading ? 'Applying feedback...' : 'Apply feedback & Regenerate'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 'choice') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        {logoutButton}
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-950">What would you like to plan?</CardTitle>
            <CardDescription>
              Selected theme: {selectedTheme?.title}
            </CardDescription>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-2">
              💡 <strong>Tip:</strong> Take a screenshot or copy your results — they won&apos;t be saved and may be lost while navigating through the app.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleChoiceSelect('activities')}
              >
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-lg font-semibold mb-2">Children's Activities</h3>
                  <p className="text-slate-700 text-sm">
                    Games, crafts, and discussion questions for kids
                  </p>
                </CardContent>
              </Card>

              {userType === 'advanced' && (
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleChoiceSelect('songs')}
                >
                  <CardContent className="p-6 text-center">
                    <Music className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <h3 className="text-lg font-semibold mb-2">Worship Songs</h3>
                    <p className="text-slate-700 text-sm">
                      Song suggestions based on your theme
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleChoiceSelect('youthDiscussion')}
              >
                <CardContent className="p-6 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                  <h3 className="text-lg font-semibold mb-2">Youth Group Discussion</h3>
                  <p className="text-slate-700 text-sm">
                    Discussion questions for secondary school students (12–18)
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="pt-2">
              <Button variant="outline" onClick={() => setStep('themes')} className="border border-slate-300 text-slate-700">
                ← Back to themes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'login') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full bg-white text-slate-950">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-950">Login</CardTitle>
            <CardDescription>
              Please login to continue with church planning.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Input
                placeholder="Username or email"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              />
              <Input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleLogin} className="flex-1 border border-slate-300 shadow-sm text-slate-900">
                Login
              </Button>
              <Button variant="outline" onClick={() => { setUserType('basic'); setStep('verse') }} className="flex-1 border border-slate-300 shadow-sm text-slate-900">
                Continue as Guest
              </Button>
            </div>

            <div className="flex justify-between text-sm text-slate-500">
              <button
                type="button"
                className="hover:text-slate-800 underline"
                onClick={async () => {
                  setRegError('')
                  setAvailableChurches([])
                  setRegChurchId('')
                  setRegUsername('')
                  setRegEmail('')
                  setRegPassword('')
                  setRegPasswordConfirm('')
                  try {
                    const res = await fetch('/api/churches/list')
                    const json = await res.json()
                    if (json.ok) setAvailableChurches(json.churches || [])
                  } catch {}
                  setStep('register')
                }}
              >
                Register
              </button>
              <button
                type="button"
                className="hover:text-slate-800 underline"
                onClick={() => { setForgotEmail(''); setForgotSent(false); setStep('forgot-password') }}
              >
                Forgot password?
              </button>
            </div>
            <div className="text-center text-sm text-slate-400">
              <button
                type="button"
                className="hover:text-slate-600 underline underline-offset-2"
                onClick={() => setStep('why-register')}
              >
                Do I need to register?
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'activities') {
    const games = activities.filter((activity) => activity.type === 'game')
    const crafts = activities.filter((activity) => activity.type === 'craft')
    const songActivities = activities.filter((activity) => activity.type === 'song')

    return (
      <div className="min-h-screen bg-white p-4">
        {logoutButton}
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Children's Activities</h1>
              <p className="text-slate-600">Theme: {selectedTheme?.title}</p>
              <p className="text-sm text-slate-700 mt-2">
                {weather
                  ? weather
                  : 'Fetching weather forecast for next Sunday…'}
              </p>
            </div>
            <Button onClick={() => setActivities([])} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
              Back to children's settings
            </Button>
          </div>

          {activities.length === 0 ? (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Tell us about the children</CardTitle>
                <CardDescription>We'll generate games, crafts and a song based on their age and group size.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Group Size
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g., 15"
                    value={groupSize}
                    onChange={(e) => setGroupSize(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Age Range
                  </label>
                  <Input
                    placeholder="e.g., 5-8 years old"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleActivitiesSubmit}
                  disabled={!groupSize || !ageRange || isLoading}
                  className="w-full border border-slate-300 shadow-sm text-slate-900"
                >
                  {isLoading ? 'Generating Activities...' : 'Generate Activities'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-12">
              {/* ... activities rendering unchanged ... */}
              {/* keep remaining code as before */}
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Games</h2>
                    <p className="text-slate-600">Suggested games for the children&apos;s group.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isRefreshingGames}
                      onClick={async () => {
                        setIsRefreshingGames(true)
                        try {
                          const response = await fetch('/api/activities', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ theme: selectedTheme?.title, verses, groupSize: parseInt(groupSize || '0', 10), ageRange, weather }),
                          })
                          if (response.ok) {
                            const json = await response.json()
                            const newGames = (json.activities || [] as Activity[]).filter((a: Activity) => a.type === 'game')
                            setActivities(prev => {
                              const kept = prev.filter(a => a.type !== 'game')
                              const take = newGames.slice(0, 4).map((a: Activity, i: number) => ({ ...a, id: a.id || `game-refreshed-${i+1}`, expanded: false }))
                              return [...take, ...kept]
                            })
                          }
                        } catch (e) {
                          console.error('Refresh games failed', e)
                        } finally {
                          setIsRefreshingGames(false)
                        }
                      }}
                    >
                      {isRefreshingGames ? 'Finding new games…' : 'Refresh Games'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  {games.map((activity) => (
                    <Card
                      key={activity.id}
                      className="overflow-hidden border border-slate-200 bg-white text-slate-950"
                      onClick={() => toggleActivityExpansion(activity.id)}
                    >
                      <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-lg text-slate-950">{activity.title}</CardTitle>
                            <CardDescription className="text-slate-600">{activity.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              activity.activityLevel === 'laid-back' ? 'secondary' :
                              activity.activityLevel === 'moderate' ? 'default' : 'destructive'
                            }>
                              {activity.activityLevel}
                            </Badge>
                            {/* per-activity refresh removed to avoid misclicks; use Refresh Games above */}
                            {activity.expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                        </div>
                      </CardHeader>

                      {activity.expanded && (
                        <CardContent className="pt-0 bg-slate-50 text-slate-950">
                          {activity.themeRelation ? (
                            <div className="mb-4">
                              <h4 className="font-semibold mb-2">How this connects to the theme</h4>
                              <p className="text-slate-700">{activity.themeRelation}</p>
                              <p className="text-sm text-slate-600 mt-2">Designed for {ageRange || 'the selected age group'} with age-appropriate theme focus.</p>
                            </div>
                          ) : (
                            <div className="mb-4">
                              <h4 className="font-semibold mb-2">How this connects to the theme</h4>
                              <p className="text-slate-700">This activity supports the current theme and is created to be suitable for the selected age group.</p>
                              <p className="text-sm text-slate-600 mt-2">Designed for {ageRange || 'the selected age group'} with age-appropriate theme focus.</p>
                            </div>
                          )}

                          {activity.materials && activity.materials.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-semibold mb-2">Materials Needed</h4>
                              <ul className="list-disc list-inside text-slate-700 space-y-1">
                                {activity.materials.map((material, index) => (
                                  <li key={index}>{material}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div>
                            <h4 className="font-semibold mb-2">Discussion Questions</h4>
                            <ul className="list-disc list-inside text-slate-700 space-y-1">
                              {activity.questions && activity.questions.length > 0 ? (
                                activity.questions.map((question, index) => (
                                  <li key={index}>{question}</li>
                                ))
                              ) : (
                                <li>No discussion questions available.</li>
                              )}
                            </ul>
                          </div>
                          <div className="mt-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                try {
                                  const text = [`${activity.title}`, `${activity.description}`, '\nMaterials:', ...(activity.materials||[]), '\nQuestions:', ...(activity.questions||[])].join('\n')
                                  navigator.clipboard.writeText(text)
                                  alert('Activity copied to clipboard')
                                } catch (err) {
                                  console.error('Clipboard error', err)
                                  alert('Unable to copy to clipboard')
                                }
                              }}
                            >
                              Copy to Clipboard
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Crafts</h2>
                    <p className="text-slate-600">Hands-on crafts that reinforce the theme.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRefreshingCrafts}
                    onClick={async () => {
                      setIsRefreshingCrafts(true)
                      try {
                        const response = await fetch('/api/activities', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ theme: selectedTheme?.title, verses, groupSize: parseInt(groupSize || '0', 10), ageRange, weather }),
                        })
                        if (response.ok) {
                          const json = await response.json()
                          const newCrafts = (json.activities || [] as Activity[]).filter((a: Activity) => a.type === 'craft')
                          setActivities(prev => {
                            const kept = prev.filter(a => a.type !== 'craft')
                            const take = newCrafts.slice(0, 4).map((a: Activity, i: number) => ({ ...a, id: a.id || `craft-refreshed-${i+1}`, expanded: false }))
                            return [...kept, ...take]
                          })
                        }
                      } catch (e) {
                        console.error('Refresh crafts failed', e)
                      } finally {
                        setIsRefreshingCrafts(false)
                      }
                    }}
                  >
                    {isRefreshingCrafts ? 'Finding new crafts…' : 'Refresh Crafts'}
                  </Button>
                </div>
                <div className="space-y-4">
                  {crafts.map((activity) => (
                    <Card
                      key={activity.id}
                      className="overflow-hidden border border-slate-200 bg-white text-slate-950"
                      onClick={() => toggleActivityExpansion(activity.id)}
                    >
                      <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-lg text-slate-950">{activity.title}</CardTitle>
                            <CardDescription className="text-slate-600">{activity.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={activity.activityLevel === 'laid-back' ? 'secondary' : activity.activityLevel === 'moderate' ? 'default' : 'destructive'}>
                              {activity.activityLevel}
                            </Badge>
                            {activity.expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                        </div>
                      </CardHeader>
                      {activity.expanded && (
                        <CardContent className="pt-0 bg-slate-50 text-slate-950">
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">How this connects to the theme</h4>
                            <p className="text-slate-700">{activity.themeRelation || 'This craft supports the current theme.'}</p>
                          </div>
                          {activity.materials && activity.materials.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-semibold mb-2">Materials Needed</h4>
                              <ul className="list-disc list-inside text-slate-700 space-y-1">
                                {activity.materials.map((m, i) => <li key={i}>{m}</li>)}
                              </ul>
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold mb-2">Discussion Questions</h4>
                            <ul className="list-disc list-inside text-slate-700 space-y-1">
                              {activity.questions && activity.questions.length > 0
                                ? activity.questions.map((q, i) => <li key={i}>{q}</li>)
                                : <li>No discussion questions available.</li>}
                            </ul>
                          </div>
                          <div className="mt-4 text-right">
                            <Button variant="outline" size="sm" onClick={(e) => {
                              e.stopPropagation()
                              try {
                                navigator.clipboard.writeText([activity.title, activity.description, '\nMaterials:', ...(activity.materials||[]), '\nQuestions:', ...(activity.questions||[])].join('\n'))
                                alert('Copied to clipboard')
                              } catch { alert('Unable to copy') }
                            }}>
                              Copy to Clipboard
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </section>

              {songActivities.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-950">Children&apos;s Song</h2>
                      <p className="text-slate-600">A song suggestion for the children&apos;s activity time.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isRefreshingSong}
                      onClick={async () => {
                        setIsRefreshingSong(true)
                        try {
                          const response = await fetch('/api/activities', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ theme: selectedTheme?.title, verses, groupSize: parseInt(groupSize || '0', 10), ageRange, weather }),
                          })
                          if (response.ok) {
                            const json = await response.json()
                            const newSongs = (json.activities || [] as Activity[]).filter((a: Activity) => a.type === 'song')
                            setActivities(prev => {
                              const kept = prev.filter(a => a.type !== 'song')
                              const take = newSongs.slice(0, 2).map((a: Activity, i: number) => ({ ...a, id: a.id || `song-refreshed-${i+1}`, expanded: false }))
                              return [...kept, ...take]
                            })
                          }
                        } catch (e) {
                          console.error('Refresh song failed', e)
                        } finally {
                          setIsRefreshingSong(false)
                        }
                      }}
                    >
                      {isRefreshingSong ? 'Finding new song…' : 'Refresh Song'}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {songActivities.map((activity) => (
                      <Card
                        key={activity.id}
                        className="overflow-hidden border border-slate-200 bg-white text-slate-950"
                        onClick={() => toggleActivityExpansion(activity.id)}
                      >
                        <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <CardTitle className="text-lg text-slate-950">{activity.title}</CardTitle>
                              <CardDescription className="text-slate-600">{activity.description}</CardDescription>
                            </div>
                            {activity.expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                        </CardHeader>
                        {activity.expanded && (
                          <CardContent className="pt-0 bg-slate-50 text-slate-950">
                            <div className="mb-4">
                              <h4 className="font-semibold mb-2">How this connects to the theme</h4>
                              <p className="text-slate-700">{activity.themeRelation || 'This song reinforces the theme for children.'}</p>
                            </div>
                            <div className="mt-4 text-right">
                              <Button variant="outline" size="sm" onClick={(e) => {
                                e.stopPropagation()
                                try {
                                  navigator.clipboard.writeText([activity.title, activity.description].join('\n'))
                                  alert('Copied to clipboard')
                                } catch { alert('Unable to copy') }
                              }}>
                                Copy to Clipboard
                              </Button>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activities.length > 0 && (
            <div className="pt-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-slate-950">Do you need further help with any of the following?</h2>
                <div className="flex flex-wrap gap-3">
                  {userType === 'advanced' && (
                    <Button onClick={() => handleChoiceSelect('songs')} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
                      Worship Songs
                    </Button>
                  )}
                  <Button onClick={() => handleChoiceSelect('youthDiscussion')} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
                    Youth Group Discussion
                  </Button>
                  <Button onClick={handleStartNewVerses} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
                    New Bible Verses
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 'youthDiscussion') {
    return (
      <div className="min-h-screen bg-white p-4">
        {logoutButton}
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Youth Group Discussion</h1>
            <p className="text-slate-600">Theme: {selectedTheme?.title}</p>
            <p className="text-sm text-slate-500 mt-1">For secondary school students aged 12–18</p>
          </div>

          {isLoading && (
            <div className="p-6 rounded-lg border border-slate-200 bg-white text-slate-800">
              <h3 className="text-lg font-semibold">Generating discussion questions…</h3>
              <p className="text-slate-600">Creating thoughtful questions for your youth group.</p>
            </div>
          )}

          {!isLoading && discussionQuestions.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-950">Discussion Questions</h2>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={youthRegenCount >= REGEN_LIMIT || youthCooldown}
                  onClick={() => {
                    if (youthRegenCount >= REGEN_LIMIT || youthCooldown) return
                    if (youthRegenCount === REGEN_LIMIT - 1) {
                      if (!confirm('This is your last regeneration for discussion questions. Continue?')) return
                    }
                    setYouthRegenCount(c => c + 1)
                    setYouthCooldown(true)
                    setTimeout(() => setYouthCooldown(false), COOLDOWN_MS)
                    generateDiscussionQuestions()
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {youthRegenCount >= REGEN_LIMIT ? 'Limit reached' : 'Regenerate'}
                </Button>
              </div>
              <div className="space-y-3">
                {discussionQuestions.map((q, i) => (
                  <div key={i} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <p className="text-slate-950"><span className="font-semibold text-slate-500 mr-2">{i + 1}.</span>{q}</p>
                  </div>
                ))}
              </div>
              <div className="text-right pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(discussionQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n'))
                      alert('Questions copied to clipboard')
                    } catch { alert('Unable to copy') }
                  }}
                >
                  Copy All to Clipboard
                </Button>
              </div>
            </section>
          )}

          {!isLoading && discussionQuestions.length === 0 && (
            <div className="text-center py-12">
              <Button onClick={generateDiscussionQuestions} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
                Generate Discussion Questions
              </Button>
            </div>
          )}

          {!isLoading && discussionQuestions.length > 0 && (
            <div className="pt-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-slate-950">Do you need further help with any of the following?</h2>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setStep('activities')} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
                    Children&apos;s Activities
                  </Button>
                  {userType === 'advanced' && (
                    <Button onClick={() => handleChoiceSelect('songs')} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
                      Worship Songs
                    </Button>
                  )}
                  <Button onClick={handleStartNewVerses} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
                    New Bible Verses
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 'songs') {
    return (
      <div className="min-h-screen bg-white p-4 text-slate-950">
        {logoutButton}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-950 mb-2">Worship Songs</h1>
            <p className="text-slate-700">Theme: {selectedTheme?.title}</p>
          </div>

          <div className="space-y-8">
            {isLoading && (
              <div className="p-6 rounded-lg border border-slate-200 bg-white text-slate-800">
                <h3 className="text-lg font-semibold">Searching for songs based on the theme</h3>
                <p className="text-slate-600">This may take a few seconds — fetching the best matches for your selected theme from the known congregational songs.</p>
              </div>
            )}

            {!isLoading && recommendedFamiliar && recommendedFamiliar.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-slate-950 mb-4">Recommended Songs (based on theme)</h2>
                <div className="space-y-4">
                  {recommendedFamiliar.map((song, i) => {
                    const meta = SONG_METADATA[song.title]
                    return (
                      <Card key={`familiar-${i}`} className="bg-white text-slate-950 border border-slate-200">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg text-slate-950">{song.title}</CardTitle>
                            <div className="flex gap-2 items-center">
                              { (song.isHymn || meta?.isHymn) && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">Hymn</Badge>
                              ) }
                              <Badge variant="outline">{(song.tempo || meta?.tempo) || 'medium'}</Badge>
                            </div>
                          </div>
                          {(song.artist || meta?.artist) && (
                            <CardDescription className="text-slate-700">{song.artist || meta?.artist}</CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )}

            {!isLoading && songs && songs.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-slate-950 mb-4">New song suggestions</h2>
                <div className="space-y-4">
                  {songs.map((song, i) => (
                    <Card key={song.id} className="bg-white text-slate-950 border border-slate-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-slate-950">{song.title}</CardTitle>
                          <div className="flex gap-2 items-center">
                            <Badge variant="outline">{song.tempo}</Badge>
                          </div>
                        </div>
                        {song.artist && (
                          <CardDescription className="text-slate-700">{song.artist}</CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {!isLoading && ( (recommendedFamiliar && recommendedFamiliar.length > 0) || (songs && songs.length > 0) ) && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={songsRegenCount >= REGEN_LIMIT || songsCooldown}
                  onClick={async () => {
                    if (songsRegenCount >= REGEN_LIMIT || songsCooldown) return
                    if (songsRegenCount === REGEN_LIMIT - 1) {
                      if (!confirm('This is your last regeneration for songs. Continue?')) return
                    }
                    setRecommendedFamiliar([])
                    setSongs([])
                    setSongsRegenCount(c => c + 1)
                    setSongsCooldown(true)
                    setTimeout(() => setSongsCooldown(false), COOLDOWN_MS)
                    await handleSongsGenerate()
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {songsRegenCount >= REGEN_LIMIT ? 'Limit reached' : 'Regenerate Songs'}
                </Button>
              </div>
            )}

            {!isLoading && ( (recommendedFamiliar && recommendedFamiliar.length > 0) || (songs && songs.length > 0) ) && (
              <div className="pt-4 space-y-4">
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Add more songs to database</h2>
                      <p className="text-slate-600">The app will suggest songs that are familiar to the congregation. Add titles to improve future suggestions.</p>
                    </div>
                    <div>
                      <Button onClick={() => window.location.href = '/add-songs'} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
                        Add more songs to database
                      </Button>
                    </div>
                  </div>
                </section>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm space-y-4">
                  <h2 className="text-lg font-semibold text-slate-950">Do you need further help with any of the following?</h2>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setStep('activities')} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
                      Children&apos;s Activities
                    </Button>
                    <Button onClick={() => handleChoiceSelect('youthDiscussion')} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
                      Youth Group Discussion
                    </Button>
                    <Button onClick={handleStartNewVerses} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
                      New Bible Verses
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  if (step === 'forgot-password') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white text-slate-950">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
            <CardDescription>Enter your email and we'll send a reset link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {forgotSent ? (
              <div className="text-center space-y-4">
                <p className="text-slate-700">If that email is registered, a reset link has been sent. Check your inbox.</p>
                <Button onClick={() => setStep('login')} className="border border-slate-300 shadow-sm text-slate-900">
                  Back to Login
                </Button>
              </div>
            ) : (
              <>
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('login')} className="flex-1 border border-slate-300 text-slate-900">
                    Back
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!forgotEmail.trim()) return
                      await fetch('/api/auth/forgot-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: forgotEmail.trim() }),
                      })
                      setForgotSent(true)
                    }}
                    className="flex-1 border border-slate-300 shadow-sm text-slate-900"
                  >
                    Send Reset Link
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'register') {
    const hasChurches = availableChurches.length > 0
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-lg w-full bg-white text-slate-950">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription>Register with your church to access all features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {regError && (
              <Alert className="border-red-200 bg-red-50 text-red-900">
                <AlertDescription>{regError}</AlertDescription>
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Church</label>
              {hasChurches ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for your church…"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={regChurchSearch}
                    onChange={(e) => {
                      setRegChurchSearch(e.target.value)
                      setRegChurchId('')
                    }}
                  />
                  {regChurchId && (
                    <p className="mt-1 text-xs text-green-700 font-medium">
                      ✓ {availableChurches.find(c => c.id === regChurchId)?.name}
                    </p>
                  )}
                  {regChurchSearch.trim().length > 0 && !regChurchId && (() => {
                    const filtered = availableChurches.filter(c =>
                      c.name.toLowerCase().includes(regChurchSearch.toLowerCase()) ||
                      c.location.toLowerCase().includes(regChurchSearch.toLowerCase())
                    )
                    return filtered.length > 0 ? (
                      <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg text-sm">
                        {filtered.map(c => (
                          <li
                            key={c.id}
                            className="px-3 py-2 cursor-pointer hover:bg-slate-100 text-slate-950"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setRegChurchId(c.id)
                              setRegChurchSearch(c.name)
                            }}
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="text-slate-500 text-xs ml-2">{c.location}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg px-3 py-2 text-sm text-slate-500">
                        No churches found
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No churches registered yet.</p>
              )}
              {process.env.NEXT_PUBLIC_CHURCH_REGISTRATION_ENABLED === 'true' ? (
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline mt-1"
                  onClick={() => {
                    setRegError('')
                    setRegChurchName('')
                    setRegChurchLocation('')
                    setStep('register-church')
                  }}
                >
                  My church isn't listed — register it
                </button>
              ) : (
                <p className="text-sm text-slate-500 mt-1">
                  Registering new churches will be available soon after some further testing.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <Input
                placeholder="e.g. johndoe (letters, numbers, _ or -)"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <Input
                type="password"
                placeholder="Min 8 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <Input
                type="password"
                placeholder="Re-enter password"
                value={regPasswordConfirm}
                onChange={(e) => setRegPasswordConfirm(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Church Invite Key</label>
              <Input
                type="password"
                placeholder="Enter the key provided by your church"
                value={regInviteKey}
                onChange={(e) => setRegInviteKey(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">Contact your church administrator if you don't have one.</p>
            </div>

            <Alert className="border-blue-200 bg-blue-50 text-blue-900">
              <AlertDescription className="text-sm">
                <strong>Note:</strong> Song lists are shared per church. All users from the same church share one congregational song database.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('login')} className="flex-1 border border-slate-300 text-slate-900">
                Back
              </Button>
              <Button
                onClick={async () => {
                  setRegError('')
                  if (!regChurchId) { setRegError('Please select a church'); return }
                  if (regPassword !== regPasswordConfirm) { setRegError('Passwords do not match'); return }
                  try {
                    const res = await fetch('/api/auth/register', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        username: regUsername,
                        email: regEmail,
                        password: regPassword,
                        churchId: regChurchId,
                        inviteKey: regInviteKey,
                      }),
                    })
                    const json = await res.json()
                    if (json.ok) {
                      setRegError('')
                      alert('Account created! You can now log in.')
                      setStep('login')
                    } else {
                      setRegError(json.error || 'Registration failed')
                    }
                  } catch {
                    setRegError('Network error. Please try again.')
                  }
                }}
                className="flex-1 border border-slate-300 shadow-sm text-slate-900"
              >
                Create Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'register-church') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-lg w-full bg-white text-slate-950">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Register Your Church</CardTitle>
            <CardDescription>Submit your church for approval. You'll be notified once approved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {regError && (
              <Alert className="border-red-200 bg-red-50 text-red-900">
                <AlertDescription>{regError}</AlertDescription>
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Church Name</label>
              <Input
                placeholder="e.g. Canterbury Baptist Church"
                value={regChurchName}
                onChange={(e) => setRegChurchName(e.target.value)}
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">Suburb</label>
              <Input
                placeholder="Start typing your suburb and select from the list"
                value={suburbQuery}
                onChange={(e) => handleSuburbInput(e.target.value)}
                autoComplete="off"
                className={suburbQuery && !suburbSelected ? 'border-amber-400 focus:border-amber-500' : ''}
              />
              {suburbQuery && !suburbSelected && !suburbLoading && suburbSuggestions.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Please select a suburb from the dropdown suggestions.</p>
              )}
              {suburbLoading && (
                <p className="text-xs text-slate-400 mt-1">Searching...</p>
              )}
              {suburbSuggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {suburbSuggestions.map((s, i) => (
                    <li
                      key={i}
                      className="px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 cursor-pointer"
                      onClick={() => {
                        setSuburbQuery(s)
                        setRegChurchLocation(s)
                        setSuburbSelected(true)
                        setSuburbSuggestions([])
                      }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <hr className="border-slate-200" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service Day</label>
                <select
                  value={regServiceDay}
                  onChange={(e) => setRegServiceDay(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service Time</label>
                <select
                  value={regServiceTime}
                  onChange={(e) => setRegServiceTime(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {Array.from({ length: 33 }, (_, i) => {
                    const totalMins = 5 * 60 + i * 30
                    const h = Math.floor(totalMins / 60)
                    const m = totalMins % 60
                    const value = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
                    const ampm = h < 12 ? 'AM' : 'PM'
                    const displayH = h % 12 === 0 ? 12 : h % 12
                    const label = `${displayH}:${String(m).padStart(2,'0')} ${ampm}`
                    return <option key={value} value={value}>{label}</option>
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('register')} className="flex-1 border border-slate-300 text-slate-900">
                Back
              </Button>
              <Button
                onClick={async () => {
                  setRegError('')
                  if (!suburbSelected) { setRegError('Please select your suburb from the dropdown suggestions.'); return }
                  try {
                    const res = await fetch('/api/churches/register', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        churchName: regChurchName,
                        location: regChurchLocation,
                        contactEmail: regEmail,
                        serviceDay: regServiceDay,
                        serviceTime: regServiceTime,
                      }),
                    })
                    const json = await res.json()
                    if (json.ok) {
                      setRegError('')
                      alert('Your church registration has been submitted for approval. You will be notified by email once approved.')
                      setStep('login')
                    } else {
                      setRegError(json.error || 'Registration failed')
                    }
                  } catch {
                    setRegError('Network error. Please try again.')
                  }
                }}
                className="flex-1 border border-slate-300 shadow-sm text-slate-900"
              >
                Submit for Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Church Helper — Admin</h1>
              <p className="text-slate-400 text-sm mt-1">Pending church registrations</p>
            </div>
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white"
              onClick={() => { setAdminPassword(''); setPendingChurches([]); setStep('login') }}
            >
              Logout
            </Button>
          </div>

          {adminMessage && (
            <div className="px-4 py-3 rounded-md bg-slate-700 text-slate-200 text-sm">{adminMessage}</div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300"
            onClick={() => loadPendingChurches(adminPassword)}
          >
            Refresh
          </Button>

          {/* Invite Key Lookup */}
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-3">
            <h2 className="text-lg font-semibold text-white">Retrieve Church Invite Key</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search for a church..."
                value={keyLookupQuery}
                className="w-full rounded-md border border-slate-600 bg-slate-700 text-white placeholder:text-slate-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={async (e) => {
                  const q = e.target.value
                  setKeyLookupQuery(q)
                  setKeyLookupSelected(null)
                  setKeyLookupResult(null)
                  setKeyLookupError('')
                  if (q.trim().length < 2) { setKeyLookupResults([]); return }
                  try {
                    const res = await fetch('/api/admin/search-churches', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ password: adminPassword, query: q }),
                    })
                    const json = await res.json()
                    setKeyLookupResults(json.ok ? (json.churches || []) : [])
                  } catch {}
                }}
              />
              {keyLookupResults.length > 0 && !keyLookupSelected && (
                <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-600 bg-slate-700 shadow-lg text-sm">
                  {keyLookupResults.map((c) => (
                    <li
                      key={c.id}
                      className="px-3 py-2 cursor-pointer hover:bg-slate-600 text-white"
                      onClick={() => {
                        setKeyLookupSelected(c)
                        setKeyLookupQuery(c.name)
                        setKeyLookupResults([])
                        setKeyLookupResult(null)
                        setKeyLookupError('')
                      }}
                    >
                      {c.name} <span className="text-slate-400 text-xs">({c.id})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              className="bg-blue-700 hover:bg-blue-600 text-white border-0"
              disabled={!keyLookupSelected || keyLookupLoading}
              onClick={async () => {
                if (!keyLookupSelected) return
                setKeyLookupLoading(true)
                setKeyLookupResult(null)
                setKeyLookupError('')
                try {
                  const res = await fetch('/api/admin/get-invite-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: adminPassword, churchId: keyLookupSelected.id }),
                  })
                  const json = await res.json()
                  if (json.ok) {
                    setKeyLookupResult(json.inviteKey)
                  } else {
                    setKeyLookupError(json.error || 'Failed to retrieve key')
                  }
                } catch {
                  setKeyLookupError('Request failed')
                } finally {
                  setKeyLookupLoading(false)
                }
              }}
            >
              {keyLookupLoading ? 'Retrieving...' : 'Get Invite Key'}
            </Button>
            {keyLookupResult && (
              <div className="rounded-md bg-slate-900 border border-slate-600 px-4 py-3">
                <p className="text-xs text-slate-400 mb-1">Invite key for <strong className="text-slate-200">{keyLookupSelected?.name}</strong></p>
                <p className="font-mono text-green-400 text-sm select-all">{keyLookupResult}</p>
              </div>
            )}
            {keyLookupError && (
              <p className="text-red-400 text-sm">{keyLookupError}</p>
            )}
          </div>

          {pendingChurches.length === 0 ? (
            <div className="text-slate-400 py-12 text-center">No pending registrations.</div>
          ) : (
            <div className="space-y-4">
              {pendingChurches.map((church) => (
                <div key={church.id} className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-4">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-white">{church.name}</div>
                    <div className="text-slate-400 text-sm">{church.location}</div>
                    <div className="text-slate-500 text-xs">Submitted: {church.createdAt ? new Date(church.createdAt).toLocaleString() : 'Unknown'}</div>
                  </div>

                  {church.contactEmail && (
                    <div className="text-sm text-slate-300">
                      <span className="font-medium">Contact: </span>{church.contactEmail}
                    </div>
                  )}
                  {(church.serviceDay || church.serviceTime) && (
                    <div className="text-sm text-slate-300">
                      <span className="font-medium">Service: </span>{church.serviceDay} at {church.serviceTime}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Church ID / slug</label>
                      <Input
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                        value={adminSlugs[church.id] ?? church.id}
                        onChange={(e) => setAdminSlugs(prev => ({ ...prev, [church.id]: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Invite Key <span className="text-slate-500">(sent to contact email on approval)</span></label>
                    <Input
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 font-mono text-sm"
                      value={adminInviteKeys[church.id] ?? ''}
                      onChange={(e) => setAdminInviteKeys(prev => ({ ...prev, [church.id]: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-green-700 hover:bg-green-600 text-white border-0"
                      onClick={() => handleApproveChurch(church.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      className="flex-1 bg-red-800 hover:bg-red-700 text-white border-0"
                      onClick={() => handleRejectChurch(church.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
