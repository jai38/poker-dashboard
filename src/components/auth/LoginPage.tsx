import React, { useState } from 'react'
import { Lock, User, ShieldCheck, AlertCircle, ArrowRight, Activity, KeyRound } from 'lucide-react'
import { useLedger } from '../../lib/store/ledgerStore'

export const LoginPage: React.FC = () => {
  const { signIn, isOnlineMode } = useLedger()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('AdminPass2026!')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: authError } = await signIn(username.trim(), password)
      if (authError) {
        setError(authError.message || 'Invalid username or password.')
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = () => {
    setUsername('admin')
    setPassword('AdminPass2026!')
    setError('')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Subtle ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-xl shadow-indigo-500/20 text-white mb-4 ring-1 ring-white/10">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Session Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">Personal Activity & Expense Tracking</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-6">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">Admin Sign In</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {isOnlineMode ? 'Cloud Mode' : 'Local Storage Mode'}
            </span>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoFocus
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">Password</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-fill helper banner */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-[11px]">
              <div className="text-slate-400">
                <span className="font-semibold text-slate-300">Default Credentials:</span>
                <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                  user: <span className="text-indigo-400">admin</span> · pass: <span className="text-indigo-400">AdminPass2026!</span>
                </div>
              </div>
              <button
                type="button"
                onClick={fillCredentials}
                className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20 transition-colors"
              >
                Auto-fill
              </button>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Restricted Personal Side Project Access</span>
        </div>
      </div>
    </div>
  )
}
