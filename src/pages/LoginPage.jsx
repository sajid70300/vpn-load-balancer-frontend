import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock, UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingMessage, setPendingMessage] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const result = await register(name, email, password)
    if (result.success) {
      if (result.pending) {
        setPendingMessage('Registration submitted! Your account is pending approval by the Super Admin. You will be able to login once approved.')
      } else {
        navigate('/')
      }
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  function switchMode(m) {
    setMode(m)
    setError('')
    setPendingMessage('')
  }

  return (
    <div className="min-h-screen login-bg flex items-center justify-center relative overflow-hidden">
      {/* Decorative arch shapes — top right */}
      <div
        className="absolute top-[-40px] right-[-30px] w-48 h-64 rounded-full border-[20px] opacity-70"
        style={{ borderColor: '#6366f1', transform: 'rotate(-10deg)' }}
      />
      <div
        className="absolute top-[-10px] right-[20px] w-32 h-48 rounded-full border-[16px] opacity-40"
        style={{ borderColor: '#ffffff', transform: 'rotate(-10deg)' }}
      />

      {/* Decorative arch shapes — bottom left */}
      <div
        className="absolute bottom-[-40px] left-[-20px] w-44 h-60 rounded-full border-[22px] opacity-80"
        style={{ borderColor: '#6366f1' }}
      />
      <div
        className="absolute bottom-[-20px] left-[30px] w-28 h-44 rounded-full border-[16px] opacity-40"
        style={{ borderColor: '#ffffff' }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-purple flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-purple/30">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Unified VPN Platform</h1>
          <p className="text-gray-500 text-sm mt-1">Admin Dashboard</p>
        </div>

        {/* Pending success message */}
        {pendingMessage && (
          <div className="card p-6 shadow-xl mb-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-green-600" />
              </div>
              <p className="text-sm text-gray-700">{pendingMessage}</p>
              <button
                onClick={() => { setPendingMessage(''); switchMode('login') }}
                className="text-sm text-brand-purple font-medium hover:underline flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Form card */}
        {!pendingMessage && (
          <div className="card p-6 shadow-xl">
            {mode === 'login' ? (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Sign In</h2>
                <p className="text-sm text-gray-500 mb-5">Enter your credentials to access the dashboard</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="admin@vpn.com" className="form-input" required autoFocus
                    />
                  </div>
                  <div>
                    <label className="form-label">Password</label>
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" className="form-input" required
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
                  )}

                  <button type="submit" disabled={loading}
                    className="btn-purple w-full justify-center py-3 mt-2 disabled:opacity-60">
                    <Lock size={15} />
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <p className="text-sm text-gray-500">
                    Don't have an account?{' '}
                    <button onClick={() => switchMode('register')} className="text-brand-purple font-medium hover:underline">Register</button>
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Create Account</h2>
                <p className="text-sm text-gray-500 mb-5">Register for dashboard access</p>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="form-label">Full Name</label>
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="John Doe" className="form-input" required autoFocus
                    />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com" className="form-input" required
                    />
                  </div>
                  <div>
                    <label className="form-label">Password</label>
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min 6 characters" className="form-input" required minLength={6}
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
                  )}

                  <button type="submit" disabled={loading}
                    className="btn-purple w-full justify-center py-3 mt-2 disabled:opacity-60">
                    <UserPlus size={15} />
                    {loading ? 'Registering…' : 'Register'}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <p className="text-sm text-gray-500">
                    Already have an account?{' '}
                    <button onClick={() => switchMode('login')} className="text-brand-purple font-medium hover:underline">Sign In</button>
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-5">
          First registration automatically becomes Super Admin
        </p>
      </div>
    </div>
  )
}