import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { GeneralExpense } from '../../lib/accounting/types'
import { parseRupeesToPaise, formatINR } from '../../lib/accounting/formatters'
import { AlertTriangle, CheckCircle2, Edit3 } from 'lucide-react'

interface EditExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  expense: GeneralExpense | null
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
}) => {
  const { owners, editExpense } = useLedger()

  const [type, setType] = useState<'session_expense' | 'monthly_expense' | 'credit_adjustment'>('monthly_expense')
  const [description, setDescription] = useState<string>('')
  const [amountRupees, setAmountRupees] = useState<string>('')
  const [expenseDate, setExpenseDate] = useState<string>('')
  const [paidByOwnerId, setPaidByOwnerId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (expense) {
      setType(expense.type)
      setDescription(expense.description)
      setAmountRupees(String(expense.amountPaise / 100))
      setExpenseDate(
        expense.expenseDate
          ? new Date(expense.expenseDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      )
      setPaidByOwnerId(expense.paidByOwnerId || '')
      setError('')
      setSuccessMsg(null)
    }
  }, [expense])

  if (!expense) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsedPaise = parseRupeesToPaise(amountRupees)
    if (parsedPaise <= 0) {
      setError('Amount must be greater than zero.')
      return
    }

    if (!description.trim()) {
      setError('Description is required.')
      return
    }

    setIsSubmitting(true)
    try {
      await editExpense(expense.id, {
        type,
        amountPaise: parsedPaise,
        description: description.trim(),
        expenseDate: expenseDate ? new Date(expenseDate).toISOString() : undefined,
        paidByOwnerId: paidByOwnerId || undefined,
      })

      setSuccessMsg(`Expense updated to ${formatINR(parsedPaise)}.`)
      setTimeout(() => {
        setIsSubmitting(false)
        onClose()
      }, 900)
    } catch (err: any) {
      setError(err.message || 'Failed to update expense.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Expense / Adjustment" maxWidth="md">
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

        {/* Transaction Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Type <span className="text-rose-400">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            required
          >
            <option value="monthly_expense">Monthly Expense (General equipment, bills)</option>
            <option value="credit_adjustment">Credit / Refund (Reimbursements, adjustments)</option>
            <option value="session_expense">Session Expense (Snacks, cards, table fees)</option>
          </select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Description <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. New poker chip sets"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Amount (₹) <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-slate-500 font-mono">₹</span>
            <input
              type="number"
              min="1"
              step="any"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="e.g. 1500"
              className="w-full pl-8 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Date</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Paid by organizer */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Paid Out-of-Pocket By</label>
          <select
            value={paidByOwnerId}
            onChange={(e) => setPaidByOwnerId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Paid from Activity Pool / Shared Funds</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                Paid by: {o.name} (Entitled to reimbursement)
              </option>
            ))}
          </select>
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
            <span>{isSubmitting ? 'Saving...' : 'Update Expense'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
