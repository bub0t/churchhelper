'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { USERS } from '@/lib/data'

export default function AddSongsPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [result, setResult] = useState<{ added: number; existing: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    const lines = text.split(/\n|,|;/).map(s => s.trim()).filter(Boolean)
    if (lines.length === 0) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/songs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: (Object.keys(USERS)[0] || 'CBC'), songs: lines }),
      })
      const data = await res.json()
      setResult({ added: data.added || 0, existing: data.existing || 0 })
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Add More Songs to Database</h1>
          <p className="text-slate-600">The app will suggest songs that are familiar to the congregation. Enter one song title per line.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Paste song titles</CardTitle>
            <CardDescription>One title per line (or comma/semicolon separated). Only new titles will be added.</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-md"
            />

            <div className="flex gap-3 mt-4">
              <Button onClick={handleSubmit} disabled={isLoading} className="border border-slate-300 bg-white text-slate-950 shadow-sm">{isLoading ? 'Adding...' : 'Add to database'}</Button>
              <Button variant="outline" onClick={() => router.back()}>Back</Button>
            </div>

            {result && (
              <div className="mt-4 text-slate-700">
                <p><strong>{result.added}</strong> added.</p>
                <p><strong>{result.existing}</strong> were already in the database.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Need children's activity suggestions?</h2>
              <p className="text-slate-600">Get children's church activity suggestions to complete your service plan.</p>
            </div>
            <Button onClick={() => router.push('/')} className="border border-slate-300 bg-white text-slate-950 shadow-sm">Children's Activities</Button>
          </div>
        </section>
      </div>
    </div>
  )
}
