import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { parseRupeesToPaise, formatINR } from '../../lib/accounting/formatters'
import { AlertTriangle } from 'lucide-react'

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
  const { games, addExpense, owners } = useLedger()

  const [type, setType] = useState<'monthly_expense' | 'credit_adjustment' | 'session_expense'>(
    'monthly_expense'
  )
  const [description, setDescription] = useState('')
  const [amountRupees, setAmountRupees] = useState('')
  const [paidByOwnerId, setPaidByOwnerId] = useState<string>('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [gameId, setGameId] = useState<string>('')
  const [error, setError] = useState('')

  const amountPaise = parseRupeesToPaise(amountRupees)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!description.trim()) {
      setError('Description is required.')
      return
    }

    if (amountPaise <= 0) {
      setError('Amount must be greater than zero.')
      return
    }

    try {
      await addExpense({
        type,
        amountPaise,
        description: description.trim(),
        expenseDate: new Date(expenseDate).toISOString(),
        gameId: gameId || null,
        paidByOwnerId: paidByOwnerId || undefined,
      })
      handleResetAndClose()
    } catch (err: any) {
      setError(err.message || 'Failed to record expense.')
    }
  }

  const handleResetAndClose = () => {
    setDescription('')
    setAmountRupees('')
    setPaidByOwnerId('')
    setGameId('')
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleResetAndClose} title="Add General Expense or Adjustment" maxWidth="md">
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs font-medium text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Expense Type (Section 8 & 23) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Transaction Type <span className="text-rose-400">*</span>
          </label>
          <select
            value={type}
            onChange={(e: any) => setType(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="monthly_expense">Monthly / General Expense (e.g. Utilities, Equipment supplies)</option>
            <option value="credit_adjustment">Credit / Adjustment (e.g. Deposit refund, Organizer reimbursement)</option>
            <option value="session_expense">Session Expense</option>
          </select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Description <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. September utility adjustment"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              if (error) setError('')
            }}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            required
            autoFocus
          />
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Amount (₹) <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm font-medium text-slate-500">₹</span>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="1,200"
              value={amountRupees}
              onChange={(e) => {
                setAmountRupees(e.target.value)
                if (error) setError('')
              }}
              className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        </div>

        {/* Paid By Organizer (Custody & Reimbursement) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span>Paid By</span>
            <span className="text-[10px] text-indigo-400 font-normal">Out of pocket or activity pool</span>
          </label>
          <select
            value={paidByOwnerId}
            onChange={(e) => setPaidByOwnerId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Shared Activity Cash Pool</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                Paid by {o.name} (Reimbursable Out of Pocket)
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            If an organizer paid from their own pocket, the settlement engine will reimburse them during organizer payouts.
          </p>
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

        {/* Associated Session (Optional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Associated Session (Optional)</label>
          <select
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">No session association (General / Monthly)</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                Session #{g.gameNumber} ({new Date(g.playedAt).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleResetAndClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
          >
            Save Entry
          </button>
        </div>
      </form>
    </Modal>
  )
}
