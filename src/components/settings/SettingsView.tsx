import React, { useState } from 'react'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR, parseRupeesToPaise } from '../../lib/accounting/formatters'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { Settings, ShieldAlert, RotateCcw, Save, AlertTriangle, Users } from 'lucide-react'

export const SettingsView: React.FC = () => {
  const { settings, owners, updateSettings, updateOwner, resetToInitialSeed } = useLedger()

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

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [pendingSettings, setPendingSettings] = useState<any | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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

    // Also update owner names if changed
    for (const [id, name] of Object.entries(ownerNames)) {
      const orig = owners.find((o) => o.id === id)
      if (orig && orig.name !== name.trim()) {
        await updateOwner(id, name.trim())
      }
    }

    setSuccessMsg('Settings updated and audited successfully. Downstream calculations refreshed.')
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleResetConfirm = () => {
    resetToInitialSeed()
    setSuccessMsg('Ledger successfully reset to initial ₹52,650 seed state.')
    setTimeout(() => setSuccessMsg(null), 4000)
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
          Configurable financial thresholds, targets, and owner names. All changes are versioned and logged in the audit ledger.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-400">
          ✓ {successMsg}
        </div>
      )}

      {/* Warning Notice (Section 26) */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-200">Accounting Settings Caution</div>
          <p className="leading-relaxed">
            Changing targets (e.g. Table Recovery Target or Festival Reserve Target) alters downstream waterfall calculations for all games. Confirmation is required and changes are permanently logged to the audit trail.
          </p>
        </div>
      </div>

      <form onSubmit={handleSettingsSubmit} className="space-y-6">
        {/* Core Financial Targets */}
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

        {/* Owner Names Configuration (Section 3.1) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Owner Names (Exactly 4 Owners)</span>
            </h3>
            <span className="text-xs text-slate-400">Do not hardcode names</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {owners.map((owner, idx) => (
              <div key={owner.id} className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Owner #{idx + 1} Name
                </label>
                <input
                  type="text"
                  value={ownerNames[owner.id] || ''}
                  onChange={(e) =>
                    setOwnerNames((prev) => ({ ...prev, [owner.id]: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      {/* Dangerous Zone / Reset */}
      <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>Reset Ledger to Initial Known State</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Resets the ledger back to the initial state defined in Section 38 & 39: 16 players with ₹52,650 historical rake, ₹12,350 table recovery remaining, and ₹0 owner profit distribution.
        </p>
        <button
          type="button"
          onClick={() => setIsResetConfirmOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Initial Seed</span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSettings}
        title="Confirm Accounting Settings Update"
        message="Are you sure you want to update the financial targets? This will recalculate table recovery and festival thresholds across the ledger."
        confirmText="Update Settings"
        requireReason
        reasonPlaceholder="e.g. Approved by all 4 table owners"
      />

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetConfirm}
        title="Reset Ledger to Initial Seed"
        message="Are you sure you want to reset all data back to the clean ₹52,650 historical rake seed state? Any manually added games will be erased."
        confirmText="Reset to Seed"
        isDestructive
      />
    </div>
  )
}
