import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { parseRupeesToPaise, formatINR } from '../../lib/accounting/formatters'
import { SessionExpense } from '../../lib/accounting/types'
import { Plus, Trash2, CheckCircle2, AlertTriangle, SlidersHorizontal, ArrowRight } from 'lucide-react'
import {
  calculateGameNetRake,
  allocateRakeToBuckets,
  calculateOwnerDistribution,
} from '../../lib/accounting/engine'

interface AddGameModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AddGameModal: React.FC<AddGameModalProps> = ({ isOpen, onClose }) => {
  const { owners, summary, settings, addGame } = useLedger()

  const [playedAt, setPlayedAt] = useState<string>(new Date().toISOString().slice(0, 16))
  const [grossRakeInput, setGrossRakeInput] = useState<string>('')
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    owners.forEach((o) => (init[o.id] = true)) // Default all present
    return init
  })
  const [expenses, setExpenses] = useState<SessionExpense[]>([
    { amountPaise: 0, description: 'Electricity' },
  ])
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [savedSuccess, setSavedSuccess] = useState<any | null>(null)

  // Allocation Mode: Auto vs Custom
  const [allocationMode, setAllocationMode] = useState<'auto' | 'custom'>('auto')
  const [customTableInput, setCustomTableInput] = useState<string>('')
  const [customFestivalInput, setCustomFestivalInput] = useState<string>('')
  const [customProfitInput, setCustomProfitInput] = useState<string>('')

  const grossRakePaise = parseRupeesToPaise(grossRakeInput)

  const activeExpenses = expenses.filter((e) => e.amountPaise > 0)
  const { netRakePaise, totalExpensePaise, uncoveredExpensePaise } = calculateGameNetRake(
    grossRakePaise,
    activeExpenses
  )

  const ownerAttendanceList = owners.map((o) => ({
    ownerId: o.id,
    present: Boolean(attendance[o.id]),
  }))
  const presentCount = ownerAttendanceList.filter((o) => o.present).length

  // Custom allocation calculations
  const customTablePaise = parseRupeesToPaise(customTableInput)
  const customFestivalPaise = parseRupeesToPaise(customFestivalInput)
  const customProfitPaise = parseRupeesToPaise(customProfitInput)
  const totalCustomPaise = customTablePaise + customFestivalPaise + customProfitPaise
  const remainingCustomPaise = netRakePaise - totalCustomPaise

  // Projected waterfall for preview
  const projectedAlloc = allocationMode === 'custom'
    ? {
        allocatedToTablePaise: customTablePaise,
        allocatedToFestivalPaise: customFestivalPaise,
        distributableRakePaise: customProfitPaise,
      }
    : allocateRakeToBuckets(
        netRakePaise,
        summary.tableRecoveryAccumulatedPaise,
        summary.tableRecoveryTargetPaise,
        summary.festivalFundAccumulatedPaise,
        summary.festivalFundTargetPaise
      )

  let projectedDistributions: Record<string, number> = {}
  if (projectedAlloc.distributableRakePaise > 0 && presentCount > 0) {
    try {
      const res = calculateOwnerDistribution({
        distributableRakePaise: projectedAlloc.distributableRakePaise,
        owners: ownerAttendanceList,
        settings,
      })
      projectedDistributions = res.ownerDistributions
    } catch {
      projectedDistributions = {}
    }
  }

  const handleToggleOwner = (ownerId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [ownerId]: !prev[ownerId],
    }))
    if (error) setError('')
  }

  const handleAddExpenseRow = () => {
    setExpenses((prev) => [...prev, { amountPaise: 0, description: '' }])
  }

  const handleRemoveExpenseRow = (index: number) => {
    setExpenses((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleExpenseChange = (index: number, field: 'description' | 'rupees', value: string) => {
    setExpenses((prev) =>
      prev.map((e, idx) => {
        if (idx !== index) return e
        if (field === 'description') {
          return { ...e, description: value }
        } else {
          return { ...e, amountPaise: parseRupeesToPaise(value) }
        }
      })
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (grossRakePaise <= 0) {
      setError('Gross rake must be greater than zero.')
      return
    }

    if (presentCount === 0) {
      setError('At least one owner must be physically present/participating in the game.')
      return
    }

    if (allocationMode === 'custom') {
      if (totalCustomPaise !== netRakePaise) {
        setError(
          `Custom allocation must sum exactly to Net Rake (${formatINR(netRakePaise)}). Current allocated: ${formatINR(totalCustomPaise)} (Difference: ${formatINR(Math.abs(remainingCustomPaise))}).`
        )
        return
      }
    }

    try {
      const newGame = await addGame({
        playedAt: new Date(playedAt).toISOString(),
        grossRakePaise,
        expenses: activeExpenses,
        owners: ownerAttendanceList,
        notes: notes.trim() || undefined,
        customAllocation: allocationMode === 'custom' ? {
          tableRecoveryPaise: customTablePaise,
          festivalFundPaise: customFestivalPaise,
          distributableProfitPaise: customProfitPaise,
        } : undefined,
      })

      setSavedSuccess({
        gameNumber: newGame.gameNumber,
        netRakePaise,
        distributablePaise: projectedAlloc.distributableRakePaise,
        allocatedToTablePaise: projectedAlloc.allocatedToTablePaise,
        allocatedToFestivalPaise: projectedAlloc.allocatedToFestivalPaise,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to save game.')
    }
  }

  const handleResetForm = () => {
    setGrossRakeInput('')
    setNotes('')
    setCustomTableInput('')
    setCustomFestivalInput('')
    setCustomProfitInput('')
    setAllocationMode('auto')
    setExpenses([{ amountPaise: 0, description: 'Electricity' }])
    setSavedSuccess(null)
    setError('')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={savedSuccess ? 'Session Saved' : 'Add Poker Game / Session'}
      subtitle={
        savedSuccess
          ? `Game #${savedSuccess.gameNumber} recorded successfully`
          : 'Record gross rake, session expenses, attendance, and bucket allocations'
      }
      maxWidth="lg"
    >
      {savedSuccess ? (
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center justify-center text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-100">
              Game #{savedSuccess.gameNumber} Logged & Verified
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Session net rake has been correctly processed through the waterfall ledger.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Net Rake</span>
              <span className="text-sm font-bold text-emerald-400">
                {formatINR(savedSuccess.netRakePaise)}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">To Table Recovery</span>
              <span className="text-sm font-bold text-indigo-400">
                {formatINR(savedSuccess.allocatedToTablePaise)}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">To Festival Fund</span>
              <span className="text-sm font-bold text-amber-400">
                {formatINR(savedSuccess.allocatedToFestivalPaise)}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Distributable</span>
              <span className="text-sm font-bold text-indigo-300">
                {formatINR(savedSuccess.distributablePaise)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={handleResetForm}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Add Another Game
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date & Gross Rake */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Date & Time Played <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* Gross Rake */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Gross Rake (₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-medium text-slate-500">₹</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="4,500"
                  value={grossRakeInput}
                  onChange={(e) => {
                    setGrossRakeInput(e.target.value)
                    if (error) setError('')
                  }}
                  className="w-full pl-8 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Owners Attendance (Section 3.1 & 14) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Owners Present / Playing <span className="text-rose-400">*</span>
              </label>
              <span
                className={`text-xs font-medium ${
                  presentCount === 0 ? 'text-rose-400 font-bold' : 'text-slate-400'
                }`}
              >
                {presentCount} of {owners.length} present (At least 1 required)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {owners.map((owner) => {
                const isPresent = Boolean(attendance[owner.id])
                return (
                  <button
                    type="button"
                    key={owner.id}
                    onClick={() => handleToggleOwner(owner.id)}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isPresent
                        ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-xs truncate">{owner.name}</span>
                      <span
                        className={`text-xs font-bold ${
                          isPresent ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      >
                        {isPresent ? '✓' : '✗'}
                      </span>
                    </div>
                    <span className="text-[10px]">
                      {isPresent ? 'Present (Player)' : 'Absent (10% Rule)'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Session Expenses (Section 7) */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Session Expenses
                </label>
                <p className="text-[11px] text-slate-400">
                  Deducted first from gross rake (electricity, refreshments, dealer, etc.)
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddExpenseRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-slate-800 hover:bg-slate-750 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            </div>

            <div className="space-y-2">
              {expenses.map((expense, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Electricity, Snacks, Cards"
                    value={expense.description}
                    onChange={(e) => handleExpenseChange(idx, 'description', e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="relative w-32 shrink-0">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={expense.amountPaise ? expense.amountPaise / 100 : ''}
                      onChange={(e) => handleExpenseChange(idx, 'rupees', e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-right"
                    />
                  </div>
                  {expenses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExpenseRow(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                      title="Remove expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {uncoveredExpensePaise > 0 && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Expenses exceed gross rake by {formatINR(uncoveredExpensePaise)}. Net rake will be ₹0 and remaining expense is recorded.
                </span>
              </div>
            )}
          </div>

          {/* Allocation Strategy: Auto Waterfall vs Custom Bucket Allocation */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Bucket Allocation Strategy</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Control how this game's Net Rake is assigned across buckets
                </p>
              </div>

              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAllocationMode('auto')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    allocationMode === 'auto'
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Auto Waterfall
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAllocationMode('custom')
                    if (!customProfitInput && !customTableInput && !customFestivalInput) {
                      setCustomProfitInput((netRakePaise / 100).toString())
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    allocationMode === 'custom'
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom Allocation
                </button>
              </div>
            </div>

            {allocationMode === 'custom' ? (
              <div className="p-3.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    Allocate Net Rake ({formatINR(netRakePaise)}) to:
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      remainingCustomPaise === 0
                        ? 'text-emerald-400'
                        : remainingCustomPaise > 0
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {remainingCustomPaise === 0
                      ? '✓ Fully Allocated'
                      : remainingCustomPaise > 0
                      ? `Remaining: ${formatINR(remainingCustomPaise)}`
                      : `Overallocated by: ${formatINR(Math.abs(remainingCustomPaise))}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">To Table Recovery (₹)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={customTableInput}
                        onChange={(e) => setCustomTableInput(e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">To Festival Fund (₹)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={customFestivalInput}
                        onChange={(e) => setCustomFestivalInput(e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">To Owner Profit (₹)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={customProfitInput}
                        onChange={(e) => setCustomProfitInput(e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTableInput('')
                      setCustomFestivalInput('')
                      setCustomProfitInput((netRakePaise / 100).toString())
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono"
                  >
                    ⚡ All to Profit
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTableInput((netRakePaise / 100).toString())
                      setCustomFestivalInput('')
                      setCustomProfitInput('')
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono"
                  >
                    ⚡ All to Table Recovery
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTableInput('')
                      setCustomFestivalInput((netRakePaise / 100).toString())
                      setCustomProfitInput('')
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono"
                  >
                    ⚡ All to Festival
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                Standard automatic waterfall: Fills Table Recovery (₹65k) → Festival Reserve (₹30k) → Distributable Profit.
              </p>
            )}
          </div>

          {/* Live Calculation Preview */}
          {grossRakePaise > 0 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Live Calculation Preview
              </h5>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Total Expense</span>
                  <div className="font-mono font-bold text-rose-400 mt-0.5">
                    {formatINR(totalExpensePaise)}
                  </div>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Net Rake</span>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">
                    {formatINR(netRakePaise)}
                  </div>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Distributable</span>
                  <div className="font-mono font-bold text-indigo-400 mt-0.5">
                    {formatINR(projectedAlloc.distributableRakePaise)}
                  </div>
                </div>
              </div>

              {projectedAlloc.distributableRakePaise > 0 && Object.keys(projectedDistributions).length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">
                    Projected Owner Shares (₹1,000 Equal + Attendance):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5 text-xs font-mono">
                    {owners.map((o) => (
                      <div
                        key={o.id}
                        className="p-1.5 bg-slate-900 rounded border border-slate-800 flex justify-between"
                      >
                        <span className="font-sans text-slate-300 truncate">{o.name}:</span>
                        <span className="font-bold text-slate-100">
                          {formatINR(projectedDistributions[o.id] || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Deep stack Friday session"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
            >
              Confirm & Save Session
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
