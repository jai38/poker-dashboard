import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { Lock, Mail, AlertTriangle, ShieldCheck } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, isOnlineMode } = useLedger()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: authError } = await signIn(email, password)
      if (authError) {
        setError(authError.message || 'Authentication failed.')
      } else {
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Poker Ledger Sign In" maxWidth="sm">
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs font-medium text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            {isOnlineMode
              ? 'Secured with Supabase Authentication & PostgreSQL Row Level Security (RLS).'
              : 'Local Deterministic Mode: Enter any email to continue or connect Supabase.'}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="email"
              placeholder="owner@pokerledger.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
