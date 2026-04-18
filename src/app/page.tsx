'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronDown, ChevronUp, RefreshCw, BookOpen, Users, Music } from 'lucide-react'
import { type Theme, type Activity, type Song } from '@/lib/types'
import { USERS, SONG_METADATA } from '@/lib/data'

function getNextSundayText() {
  const today = new Date()
  const nextSunday = new Date(today)
  const day = today.getDay()
  const daysUntilSunday = ((7 - day) % 7) || 7
  nextSunday.setDate(today.getDate() + daysUntilSunday)
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(nextSunday)
}

export default function Home() {
  const [step, setStep] = useState<'disclaimer' | 'login' | 'verse' | 'themes' | 'choice' | 'activities' | 'songs'>('disclaimer')
  const [verse, setVerse] = useState('')
  const [context, setContext] = useState('')
  const [themes, setThemes] = useState<Theme[]>([])
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [userType, setUserType] = useState<'basic' | 'advanced' | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [recommendedFamiliar, setRecommendedFamiliar] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [regenerateCount, setRegenerateCount] = useState(0)
  const [themeFeedback, setThemeFeedback] = useState('')
  const [weather, setWeather] = useState('Sunny and mild')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [groupSize, setGroupSize] = useState('')
  const [ageRange, setAgeRange] = useState('')

  const handleVerseSubmit = async () => {
    if (!verse.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verse, context }),
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
      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verse,
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

  const handleChoiceSelect = (choice: 'activities' | 'songs') => {
    if (choice === 'activities') {
      setStep(choice)
      return
    }

    if (choice === 'songs' && userType !== 'advanced') {
      setStep('login')
      return
    }
    setStep(choice)
  }

  const handleLogin = () => {
    const normalized = loginUsername.trim().toLowerCase()
    const entry = Object.entries(USERS).find(([key]) => key.toLowerCase() === normalized)
    if (entry && entry[1].password === loginPassword) {
      setUserType('advanced')
      setStep('verse')
    } else {
      alert('Invalid credentials')
    }
  }

  const handleActivitiesSubmit = async () => {
    if (!groupSize || !ageRange || !selectedTheme) return

    setIsLoading(true)
    try {
      const weatherResponse = await fetch('/api/weather?location=Canterbury%2C%20Victoria%2C%20Australia')
      const weatherData = await weatherResponse.json()
      setWeather(weatherData.weather || 'Sunny and mild')
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: selectedTheme.title,
          verse,
          groupSize: parseInt(groupSize, 10),
          ageRange,
          weather: weatherData.weather || 'Sunny and mild',
        }),
      })
      const data = await response.json()
      const generatedActivities = (data.activities || []).map((activity: Activity, index: number) => {
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
      setActivities(generatedActivities)
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
        body: JSON.stringify({ theme: selectedTheme.title, userId: (loginUsername || 'CBC') }),
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
                Continue to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'verse') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-6">
          <Card className="w-full bg-white text-slate-950">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900">Let's Get Started</CardTitle>
              <CardDescription>
                Share a Bible verse or passage you'd like to base your planning on
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bible Verse(s)
                </label>
                <Input
                  placeholder="e.g., John 3:16, Romans 8:28-30"
                  value={verse}
                  onChange={(e) => setVerse(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Additional Context (optional)
                </label>
                <textarea
                  placeholder="Add any helpful context such as a short sermon summary, key message, or specific goals you want the activities to support."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="w-full min-h-[120px] resize-y px-3 py-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <Button
                onClick={handleVerseSubmit}
                disabled={!verse.trim() || isLoading}
                className="w-full border border-slate-300 shadow-sm text-slate-900"
              >
                {isLoading ? 'Generating Themes...' : 'Generate Themes'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === 'themes') {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-950 mb-2">Choose a Theme</h1>
            <p className="text-slate-700">Based on: {verse}</p>
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
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-950">What would you like to plan?</CardTitle>
            <CardDescription>
              Selected theme: {selectedTheme?.title}
            </CardDescription>
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
                placeholder="User"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
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
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Children's Activities</h1>
              <p className="text-slate-600">Theme: {selectedTheme?.title}</p>
              <p className="text-sm text-slate-700 mt-2">
                It will be {weather} in Canterbury on {getNextSundayText()} at 10:00 am.
              </p>
            </div>
            <Button onClick={() => setStep('choice')} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
              Back to planning options
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
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Games</h2>
                    <p className="text-slate-600">Suggested games for the children&apos;s group.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{games.length} suggested</span>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                generateNewActivity(activity.id)
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
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
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </section>

              <>
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-950">Crafts</h2>
                      <p className="text-slate-600">Hands-on craft ideas for children to explore the theme.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{crafts.length} suggested</span>
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
                              <Badge variant={
                                activity.activityLevel === 'laid-back' ? 'secondary' :
                                activity.activityLevel === 'moderate' ? 'default' : 'destructive'
                              }>
                                {activity.activityLevel}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  generateNewActivity(activity.id)
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
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
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-950">Children's Songs</h2>
                      <p className="text-slate-600">A children&apos;s song suggestion to support the theme.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{songActivities.length} suggested</span>
                  </div>
                  <div className="space-y-4">
                      {songActivities.length > 0 ? (
                      songActivities.map((activity) => (
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    generateNewActivity(activity.id)
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
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
                            </CardContent>
                          )}
                        </Card>
                      ))
                    ) : (
                      <Card className="border border-slate-200 bg-white text-slate-950 p-6">
                        <CardTitle className="text-lg">Song suggestion coming soon</CardTitle>
                        <CardDescription className="text-slate-600">We&apos;ll include one children&apos;s worship song to complement the theme.</CardDescription>
                      </Card>
                    )}
                  </div>
                </section>
                {/* 'Plan other stuff' button removed as requested */}
              </>

              {userType === 'advanced' && (
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Need further help planning?</h2>
                      <p className="text-slate-600">Get worship song suggestions to complete your service plan.</p>
                    </div>
                    <Button
                      onClick={() => setStep('songs')}
                      className="border border-slate-300 bg-white text-slate-950 shadow-sm"
                    >
                      Worship Songs
                    </Button>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 'songs') {
    return (
      <div className="min-h-screen bg-white p-4 text-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-950 mb-2">Worship Songs</h1>
            <p className="text-slate-700">Theme: {selectedTheme?.title}</p>
          </div>

          <div className="text-center mb-6">
            <Button onClick={() => setStep('choice')} className="border border-slate-300 bg-white text-slate-950 shadow-sm">
              Back to planning options
            </Button>
          </div>

          <div className="space-y-8">
            {/* Show searching message while generating; otherwise render sections only when data exists */}
            {isLoading && (
              <div className="p-6 rounded-lg border border-slate-200 bg-white text-slate-800">
                <h3 className="text-lg font-semibold">Searching for songs based on the theme</h3>
                <p className="text-slate-600">This may take a few seconds — fetching the best matches for your selected theme.</p>
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
                  {songs.map((song) => (
                    <Card key={song.id} className="bg-white text-slate-950 border border-slate-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-slate-950">{song.title}</CardTitle>
                          <div className="flex gap-2">
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

            {/* After songs are shown, offer a button to plan other stuff */}
            {!isLoading && ( (recommendedFamiliar && recommendedFamiliar.length > 0) || (songs && songs.length > 0) ) && (
              <div className="pt-4">
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Need children's activity suggestions?</h2>
                      <p className="text-slate-600">Get children's church activity suggestions to complete your service plan.</p>
                    </div>
                    <Button
                      onClick={() => setStep('activities')}
                      className="border border-slate-300 bg-white text-slate-950 shadow-sm"
                    >
                      Children's Activities
                    </Button>
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Removed manual generate prompt/button — songs auto-generate on page open */}
        </div>
      </div>
    )
  }

  return null
}
