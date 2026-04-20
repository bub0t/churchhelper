'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-slate-600">Invalid or missing reset token.</p>
        <a href="/" className="text-blue-600 hover:underline text-sm mt-2 block">Return to login</a>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <p className="text-slate-700">Your password has been updated.</p>
        <a href="/">
          <Button className="border border-slate-300 shadow-sm text-slate-900">Return to Login</Button>
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-900">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
        <Input
          type="password"
          placeholder="Min 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
        <Input
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <Button
        disabled={isLoading}
        className="w-full border border-slate-300 shadow-sm text-slate-900"
        onClick={async () => {
          setError('')
          if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
          if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
          setIsLoading(true)
          try {
            const res = await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, newPassword }),
            })
            const json = await res.json()
            if (json.ok) {
              setSuccess(true)
            } else {
              setError(json.error || 'Failed to reset password')
            }
          } catch {
            setError('Network error. Please try again.')
          } finally {
            setIsLoading(false)
          }
        }}
      >
        {isLoading ? 'Updating…' : 'Set New Password'}
      </Button>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white text-slate-950">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-center text-slate-500">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
