import React, { useState, useEffect } from 'react'
import { useLedger } from '../../lib/store/ledgerStore'
import { parseRupeesToPaise } from '../../lib/accounting/formatters'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { Settings, ShieldAlert, RotateCcw, Save, AlertTriangle, Users, CheckCircle2, Trash2 } from 'lucide-react'

export const SettingsView: React.FC = () => {
  const { settings, owners, updateSettings, updateOwners, resetToInitialSeed, clearDatabase } = useLedger()

  const [tableTargetRupees, setTableTargetRupees] = useState(
    (settings.tableRecoveryTargetPaise / 100).toString()
  )
  const [festivalTargetRupees, setFestivalTargetRupees] = useState(
    (settings.festivalFundTargetPaise / 100).toString()
  )
  const [equalThresholdRupees, setEqualThresholdRupees] = useState(
    (settings.equalDistributionThresholdPaise / 100).toString()
  )
  const [absentPercentage, setAbsentPercentage] = useState(
    (settings.absentOwnerPercentage * 100).toString()
  )

  const [ownerNames, setOwnerNames] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    owners.forEach((o) => (init[o.id] = o.name))
    return init
  })

  useEffect(() => {
    const updated: Record<string, string> = {}
    owners.forEach((o) => (updated[o.id] = o.name))
    setOwnerNames(updated)
  }, [owners])

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const [pendingSettings, setPendingSettings] = useState<any | null>(null)
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null)
  const [ownersSuccessMsg, setOwnersSuccessMsg] = useState<string | null>(null)
  const [isSavingOwners, setIsSavingOwners] = useState(false)

  const handleOwnerNamesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingOwners(true)
    try {
      const payload = owners.map((o) => ({
        id: o.id,
        name: (ownerNames[o.id] || '').trim(),
      }))
      await updateOwners(payload)
      setOwnersSuccessMsg('Owner names saved successfully! All tables, dropdowns, and settlements updated.')
      setTimeout(() => setOwnersSuccessMsg(null), 4000)
    } catch (err: any) {
      alert(err.message || 'Failed to update owner names')
    } finally {
      setIsSavingOwners(false)
    }
  }

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parsedTable = parseRupeesToPaise(tableTargetRupees)
    const parsedFestival = parseRupeesToPaise(festivalTargetRupees)
    const parsedEqual = parseRupeesToPaise(equalThresholdRupees)
    const parsedAbsent = parseFloat(absentPercentage) / 100

    setPendingSettings({
      tableRecoveryTargetPaise: parsedTable,
      festivalFundTargetPaise: parsedFestival,
      equalDistributionThresholdPaise: parsedEqual,
      absentOwnerPercentage: parsedAbsent,
    })
    setIsConfirmOpen(true)
  }

  const handleConfirmSettings = async (reason?: string) => {
    if (!pendingSettings) return
    await updateSettings(pendingSettings, reason || 'Settings updated from admin panel')
    setSettingsSuccessMsg('Waterfall targets updated and audited successfully. Downstream calculations refreshed.')
    setTimeout(() => setSettingsSuccessMsg(null), 4000)
  }

  const handleResetConfirm = () => {
    resetToInitialSeed()
    setSettingsSuccessMsg('Ledger successfully reset to initial ₹52,650 seed state.')
    setTimeout(() => setSettingsSuccessMsg(null), 4000)
  }

  const handleClearConfirm = () => {
    clearDatabase()
    setSettingsSuccessMsg('Database completely cleared to ₹0. All players, games, payments, and expenses reset.')
    setTimeout(() => setSettingsSuccessMsg(null), 4000)
  }

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>Accounting & Ledger Configuration</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure table owner partner names, core financial waterfall targets, and database state.
        </p>
      </div>

      {/* 1. Owner Names Configuration (Direct save, no reason required) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Owner Names (4 Partners)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter the real names of the 4 table partners. These names appear across games, attendance, and settlements.
            </p>
          </div>
          <span className="text-xs text-indigo-400 font-mono bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded">
            4 Configured
          </span>
        </div>

        {ownersSuccessMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-semibold text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{ownersSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleOwnerNamesSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {owners.map((owner, idx) => (
              <div key={owner.id} className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Owner #{idx + 1} Name</span>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {owner.id}</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={ownerNames[owner.id] ?? owner.name}
                    onChange={(e) =>
                      setOwnerNames((prev) => ({ ...prev, [owner.id]: e.target.value }))
                    }
                    placeholder={`e.g. Partner ${idx + 1}`}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingOwners}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingOwners ? 'Saving...' : 'Save Owner Names'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Waterfall Targets & Thresholds */}
      <div className="space-y-4">
        {settingsSuccessMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-semibold text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{settingsSuccessMsg}</span>
          </div>
        )}

        {/* Warning Notice (Section 26) */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-200">Accounting Settings Caution</div>
            <p className="leading-relaxed">
              Changing financial targets (Table Recovery Target or Festival Reserve Target) alters downstream waterfall calculations for all games. Confirmation and an audit reason are required.
            </p>
          </div>
        </div>

        <form onSubmit={handleSettingsSubmit} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              Waterfall Targets & Thresholds
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Table Recovery Target (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={tableTargetRupees}
                    onChange={(e) => setTableTargetRupees(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500">Initial spec: ₹65,000</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Festival Fund Target (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={festivalTargetRupees}
                    onChange={(e) => setFestivalTargetRupees(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500">Initial spec: ₹30,000</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Equal Distribution Bucket (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={equalThresholdRupees}
                    onChange={(e) => setEqualThresholdRupees(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500">Initial spec: ₹1,000 per game split equally</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Absent Owner Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={absentPercentage}
                    onChange={(e) => setAbsentPercentage(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <span className="absolute right-3 top-2 text-sm text-slate-500">%</span>
                </div>
                <p className="text-[11px] text-slate-500">Initial spec: 10% each on excess rake</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4 text-slate-400" />
              <span>Save Financial Targets</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Database Management & Reset */}
      <div className="space-y-4">
        {/* Wipe to Zero Slate */}
        <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Clear Entire Database (Start from Scratch)</span>
            </h3>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              Zero Slate
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Wipes all data clean to ₹0. Deletes all players, historical rake entries, games, payments, expenses, and settlements. Preserves your 4 configured partner names so you can start entering your real ledger completely fresh.
          </p>
          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Database (Zero Entries)</span>
          </button>
        </div>

        {/* Reset to Seed */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Reset Ledger to Initial ₹52,650 Seed State</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Loads the initial benchmark state from the specification: 16 players with ₹52,650 historical rake and ₹12,350 table recovery remaining.
          </p>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Load ₹52,650 Seed Data</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSettings}
        title="Confirm Accounting Targets Update"
        message="Are you sure you want to update the financial targets? This will recalculate table recovery and festival thresholds across the ledger."
        confirmText="Update Targets"
        requireReason
        reasonPlaceholder="e.g. Approved by all 4 table owners"
      />

      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={handleClearConfirm}
        title="Clear Entire Database to Zero?"
        message="This will permanently wipe all players, historical rake entries, games, payments, expenses, and settlements. Your 4 owner names will be kept. Are you sure you want to start completely from scratch?"
        confirmText="Yes, Wipe Database to Zero"
        isDestructive
      />

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetConfirm}
        title="Reset Ledger to Initial ₹52,650 Seed?"
        message="Are you sure you want to reload the ₹52,650 historical rake seed with 16 players? Any current entries will be replaced."
        confirmText="Reload Seed"
        isDestructive
      />
    </div>
  )
}
