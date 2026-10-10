import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { OwnerSettlement } from '../../lib/accounting/types'
import { parseRupeesToPaise, formatINR } from '../../lib/accounting/formatters'
import { AlertTriangle, CheckCircle2, Edit3 } from 'lucide-react'

interface EditSettlementModalProps {
  isOpen: boolean
  onClose: () => void
  settlement: OwnerSettlement | null
}

export const EditSettlementModal: React.FC<EditSettlementModalProps> = ({
  isOpen,
  onClose,
  settlement,
}) => {
  const { owners, editOwnerSettlement } = useLedger()

  const [ownerId, setOwnerId] = useState<string>('')
  const [paidByOwnerId, setPaidByOwnerId] = useState<string>('')
  const [amountRupees, setAmountRupees] = useState<string>('')
  const [settledAt, setSettledAt] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (settlement) {
      setOwnerId(settlement.ownerId)
      setPaidByOwnerId(settlement.paidByOwnerId || '')
      setAmountRupees(String(settlement.amountPaise / 100))
      setSettledAt(
        settlement.settledAt
          ? new Date(settlement.settledAt).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      )
      setNotes(settlement.notes || '')
      setError('')
      setSuccessMsg(null)
    }
  }, [settlement])

  if (!settlement) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsedPaise = parseRupeesToPaise(amountRupees)
    if (parsedPaise <= 0) {
      setError('Settlement amount must be greater than zero.')
      return
    }

    if (!ownerId) {
      setError('Please select an organizer recipient.')
      return
    }

    setIsSubmitting(true)
    try {
      await editOwnerSettlement(settlement.id, {
        ownerId,
        amountPaise: parsedPaise,
        settledAt: settledAt ? new Date(settledAt).toISOString() : undefined,
        notes: notes.trim(),
        paidByOwnerId: paidByOwnerId || undefined,
      })

      const targetOwner = owners.find((o) => o.id === ownerId)
      setSuccessMsg(`Settlement updated to ${formatINR(parsedPaise)} for ${targetOwner?.name || 'organizer'}.`)
      setTimeout(() => {
        setIsSubmitting(false)
        onClose()
      }, 900)
    } catch (err: any) {
      setError(err.message || 'Failed to update settlement.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Organizer Settlement" maxWidth="md">
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

        {/* Recipient Organizer */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Recipient Organizer <span className="text-rose-400">*</span>
          </label>
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            required
          >
            <option value="">Select recipient...</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        {/* Paid by Organizer / Source */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Paid From / Transferred By
          </label>
          <select
            value={paidByOwnerId}
            onChange={(e) => setPaidByOwnerId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Activity Pool / Central Account</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} (Direct Transfer)
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Payout Amount (₹) <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-slate-500 font-mono">₹</span>
            <input
              type="number"
              min="1"
              step="any"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="e.g. 2000"
              className="w-full pl-8 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Settlement Date</label>
          <input
            type="date"
            value={settledAt}
            onChange={(e) => setSettledAt(e.target.value)}
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
            placeholder="e.g. UPI P2P Equalization"
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
            <span>{isSubmitting ? 'Saving...' : 'Update Settlement'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
