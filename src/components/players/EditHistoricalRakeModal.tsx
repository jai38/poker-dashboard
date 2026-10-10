import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { HistoricalRakeEntry } from '../../lib/accounting/types'
import { parseRupeesToPaise, formatINR } from '../../lib/accounting/formatters'
import { AlertTriangle, CheckCircle2, Edit3 } from 'lucide-react'

interface EditHistoricalRakeModalProps {
  isOpen: boolean
  onClose: () => void
  rakeEntry: HistoricalRakeEntry | null
}

export const EditHistoricalRakeModal: React.FC<EditHistoricalRakeModalProps> = ({
  isOpen,
  onClose,
  rakeEntry,
}) => {
  const { players, editHistoricalRake } = useLedger()

  const [playerId, setPlayerId] = useState<string>('')
  const [amountRupees, setAmountRupees] = useState<string>('')
  const [entryDate, setEntryDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (rakeEntry) {
      setPlayerId(rakeEntry.playerId)
      setAmountRupees(String(rakeEntry.amountPaise / 100))
      setEntryDate(
        rakeEntry.entryDate
          ? new Date(rakeEntry.entryDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      )
      setNotes(rakeEntry.notes || '')
      setError('')
      setSuccessMsg(null)
    }
  }, [rakeEntry])

  if (!rakeEntry) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsedPaise = parseRupeesToPaise(amountRupees)
    if (parsedPaise <= 0) {
      setError('Fee amount must be greater than zero.')
      return
    }

    if (!playerId) {
      setError('Please select a member.')
      return
    }

    setIsSubmitting(true)
    try {
      await editHistoricalRake(rakeEntry.id, {
        playerId,
        amountPaise: parsedPaise,
        entryDate: entryDate ? new Date(entryDate).toISOString() : undefined,
        notes: notes.trim(),
      })

      const targetPlayer = players.find((p) => p.id === playerId)
      setSuccessMsg(`Fee entry updated to ${formatINR(parsedPaise)} for ${targetPlayer?.name || 'member'}.`)
      setTimeout(() => {
        setIsSubmitting(false)
        onClose()
      }, 900)
    } catch (err: any) {
      setError(err.message || 'Failed to update fee entry.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Member Fee Entry" maxWidth="md">
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs font-medium text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-medium text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Member Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Member <span className="text-rose-400">*</span>
          </label>
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            required
          >
            <option value="">Select a member...</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Fee Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Fee Amount (₹) <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-slate-500 font-mono">₹</span>
            <input
              type="number"
              min="1"
              step="any"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="e.g. 500"
              className="w-full pl-8 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        </div>

        {/* Entry Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Date</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Notes / Reference</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Adjusted manual rake entry"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : 'Update Fee Entry'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
