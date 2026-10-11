import React, { useState } from 'react'
import {
  getSupabaseConfig,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  testSupabaseConnection,
  normalizeSupabaseUrl,
} from '../../lib/supabase/client'
import { useLedger } from '../../lib/store/ledgerStore'
// Single source of truth: the canonical, security-hardened schema. The in-app
// "Copy SQL Schema" button emits exactly this file so the copied setup can never
// drift from the real schema (authenticated-only RLS + all current columns).
import SQL_SCHEMA from '../../lib/supabase/schema.sql?raw'
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react'


export const DatabaseConfigCard: React.FC = () => {
  const currentConfig = getSupabaseConfig()
  const { isOnlineMode, syncLocalToCloud } = useLedger()

  const [url, setUrl] = useState(currentConfig.url)
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey)
  const [showKey, setShowKey] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [copiedSchema, setCopiedSchema] = useState(false)
  const [showSchemaCode, setShowSchemaCode] = useState(false)

  const handleTestConnection = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ success: false, message: 'Please enter both Supabase URL and Anon Key.' })
      return
    }
    setIsTesting(true)
    setTestResult(null)
    const res = await testSupabaseConnection(url, anonKey)
    setIsTesting(false)
    setTestResult(res)
  }

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || !anonKey.trim()) {
      alert('Please fill in both Supabase URL and Anon Key.')
      return
    }
    saveCustomSupabaseConfig(url, anonKey)
  }

  const handleDisconnect = () => {
    if (confirm('Disconnect from Supabase? The dashboard will return to local offline storage.')) {
      clearCustomSupabaseConfig()
    }
  }

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCHEMA)
      setCopiedSchema(true)
      setTimeout(() => setCopiedSchema(false), 3000)
    } catch {
      alert('Failed to copy. Please manually copy from the schema block.')
    }
  }

  const handleSyncToCloud = async () => {
    if (!confirm('This will upload your current local members, sessions, payments, and settings to your Supabase database. Proceed?')) {
      return
    }
    setIsSyncing(true)
    setSyncResult(null)
    try {
      if (syncLocalToCloud) {
        await syncLocalToCloud()
        setSyncResult('Local data successfully pushed to Supabase!')
      } else {
        setSyncResult('Sync function unavailable.')
      }
    } catch (err: any) {
      setSyncResult(`Sync failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSyncing(false)
      setTimeout(() => setSyncResult(null), 5000)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Cloud Database (Free Supabase)
              {isOnlineMode ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Local Offline Storage
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Connect a free PostgreSQL database from Supabase so all 4 organizers can access and update the ledger from any device.
            </p>
          </div>
        </div>

        {isOnlineMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncToCloud}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              title="Upload current local records to cloud"
            >
              <UploadCloud className="w-4 h-4" />
              {isSyncing ? 'Syncing...' : 'Push Local Data to Cloud'}
            </button>
            <button
              onClick={handleDisconnect}
              className="px-3 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-300 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {syncResult && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{syncResult}</span>
        </div>
      )}

      {/* Guide Banner */}
      <div className="mt-6 bg-slate-800/60 border border-slate-700/60 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
          <span>How to setup your free database in 60 seconds:</span>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            Open Supabase <ExternalLink className="w-3 h-3" />
          </a>
        </h3>
        <ol className="mt-2.5 text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>Create a free account at <strong>supabase.com</strong> and click <strong>New Project</strong>.</li>
          <li>
            In your Supabase project, click <strong>SQL Editor</strong> on the left, paste the table schema, and click <strong>Run</strong>:
            <button
              onClick={handleCopySchema}
              className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-emerald-300 rounded text-[11px] font-semibold transition"
            >
              {copiedSchema ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedSchema ? 'Copied to Clipboard!' : '1-Click Copy SQL Schema'}
            </button>
          </li>
          <li>Go to <strong>Project Settings $\rightarrow$ API</strong>, copy your <strong>Project URL</strong> and <strong>anon public key</strong>, paste them below, and click <strong>Save & Connect</strong>.</li>
        </ol>

        <div className="mt-3">
          <button
            onClick={() => setShowSchemaCode(!showSchemaCode)}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline font-mono"
          >
            {showSchemaCode ? 'Hide SQL Schema' : 'View SQL Schema Code'}
          </button>
          {showSchemaCode && (
            <pre className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-300 max-h-48 overflow-y-auto font-mono">
              {SQL_SCHEMA}
            </pre>
          )}
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSaveConfig} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setUrl(normalizeSupabaseUrl(url))}
              placeholder="https://xyzabcdefg.supabase.co"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Supabase Public Anon Key
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition disabled:opacity-50 min-h-[40px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-900/30 transition min-h-[40px]"
          >
            <Check className="w-4 h-4" />
            <span>Save & Connect Database</span>
          </button>
        </div>
      </form>
    </div>
  )
}
