import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { PlayerPayment } from '../../lib/accounting/types'
import { parseRupeesToPaise, formatINR, localDateInputToISO } from '../../lib/accounting/formatters'
import { AlertTriangle, CheckCircle2, Edit3 } from 'lucide-react'

interface EditPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  payment: PlayerPayment | null
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
}) => {
  const { players, owners, editPayment } = useLedger()

  const [playerId, setPlayerId] = useState<string>('')
  const [receivedByOwnerId, setReceivedByOwnerId] = useState<string>('')
  const [amountRupees, setAmountRupees] = useState<string>('')
  const [paidAt, setPaidAt] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (payment) {
      setPlayerId(payment.playerId)
      setReceivedByOwnerId(payment.receivedByOwnerId || '')
      setAmountRupees(String(payment.amountPaise / 100))
      setPaidAt(
        payment.paidAt
          ? new Date(payment.paidAt).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      )
      setNotes(payment.notes || '')
      setError('')
      setSuccessMsg(null)
    }
  }, [payment])

  if (!payment) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsedPaise = parseRupeesToPaise(amountRupees)
    if (parsedPaise <= 0) {
      setError('Payment amount must be greater than zero.')
      return
    }

    if (!playerId) {
      setError('Please select a member.')
      return
    }

    setIsSubmitting(true)
    try {
      await editPayment(payment.id, {
        playerId,
        amountPaise: parsedPaise,
        paidAt: paidAt ? localDateInputToISO(paidAt) : undefined,
        notes: notes.trim(),
        receivedByOwnerId: receivedByOwnerId || undefined,
      })

      const targetPlayer = players.find((p) => p.id === playerId)
      setSuccessMsg(`Payment updated to ${formatINR(parsedPaise)} for ${targetPlayer?.name || 'member'}.`)
      setTimeout(() => {
        setIsSubmitting(false)
        onClose()
      }, 900)
    } catch (err: any) {
      setError(err.message || 'Failed to update payment.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Member Payment" maxWidth="md">
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

        {/* Payment Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Payment Amount (₹) <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-slate-500 font-mono">₹</span>
            <input
              type="number"
              min="1"
              step="any"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full pl-8 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Payment Date</label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Collector Organizer */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Collected By (Custody)
          </label>
          <select
            value={receivedByOwnerId}
            onChange={(e) => setReceivedByOwnerId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Direct / Bank Account (Unassigned)</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} (Cash / UPI Custody)
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Notes / Reference</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. GPay / Cash payment"
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
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : 'Update Payment'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
