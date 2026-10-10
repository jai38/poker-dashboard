import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { parseRupeesToPaise, formatINR } from '../../lib/accounting/formatters'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

interface QuickHistoricalRakeModalProps {
  isOpen: boolean
  onClose: () => void
  initialPlayerId?: string
}

export const QuickHistoricalRakeModal: React.FC<QuickHistoricalRakeModalProps> = ({
  isOpen,
  onClose,
  initialPlayerId,
}) => {
  const { players, addHistoricalRake, owners } = useLedger()

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayerId || '')
  const [newPlayerName, setNewPlayerName] = useState<string>('')
  const [rakeRupees, setRakeRupees] = useState<string>('')
  const [paidRupees, setPaidRupees] = useState<string>('')
  const [receivedByOwnerId, setReceivedByOwnerId] = useState<string>(owners[0]?.id || '')
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState<string>('Previous sessions')
  const [error, setError] = useState<string>('')
  const [savedSuccess, setSavedSuccess] = useState<any | null>(null)

  const rakePaise = parseRupeesToPaise(rakeRupees)
  const paidPaise = parseRupeesToPaise(paidRupees)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (rakePaise === 0) {
      setError('Fee amount cannot be zero. Enter a positive amount for fees or negative (e.g. -500) for discounts/rebates.')
      return
    }

    if (!selectedPlayerId && !newPlayerName.trim()) {
      setError('Please select an existing member or enter a new member name.')
      return
    }

    if (rakePaise > 0 && paidPaise > rakePaise) {
      setError('Paid amount cannot exceed fee amount. Overpayment is not supported.')
      return
    }

    if (rakePaise < 0 && paidPaise > 0) {
      setError('Cannot record a payment against a negative fee (discount/rebate).')
      return
    }

    try {
      await addHistoricalRake({
        playerId: selectedPlayerId || undefined,
        playerName: selectedPlayerId ? undefined : newPlayerName.trim(),
        amountPaise: rakePaise,
        paidAmountPaise: rakePaise > 0 && paidPaise > 0 ? paidPaise : undefined,
        entryDate: entryDate ? new Date(entryDate).toISOString() : undefined,
        notes: notes.trim() || (rakePaise < 0 ? 'Fee discount / rebate' : 'Manual fee entry'),
        receivedByOwnerId: rakePaise > 0 && paidPaise > 0 ? (receivedByOwnerId || undefined) : undefined,
      })

      const targetPlayerName = selectedPlayerId
        ? players.find((p) => p.id === selectedPlayerId)?.name || 'Member'
        : newPlayerName.trim()

      setSavedSuccess({
        playerName: targetPlayerName,
        rakePaise,
        paidPaise: rakePaise < 0 ? 0 : paidPaise,
        outstandingPaise: Math.max(0, rakePaise - paidPaise),
        isNegative: rakePaise < 0,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to save fee entry.')
    }
  }

  const handleResetAndClose = () => {
    setSavedSuccess(null)
    setSelectedPlayerId('')
    setNewPlayerName('')
    setRakeRupees('')
    setPaidRupees('')
    setNotes('Previous sessions')
    setError('')
    onClose()
  }

  if (savedSuccess) {
    return (
      <Modal isOpen={isOpen} onClose={handleResetAndClose} title={savedSuccess.isNegative ? 'Fee Rebate Applied' : 'Fee Entry Saved'} maxWidth="md">
        <div className="space-y-5">
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            savedSuccess.isNegative
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}>
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm">
                {savedSuccess.isNegative ? 'Fee Discount / Rebate Applied' : 'Fee Entry Saved'}
              </h4>
              <p className={`text-xs ${savedSuccess.isNegative ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
                {savedSuccess.isNegative
                  ? 'Deducted from member total generated fees and outstanding debt.'
                  : 'Added to total contributions and recovery pipeline.'}
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Member:</span>
              <span className="font-bold text-slate-100">{savedSuccess.playerName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Fee Adjustment:</span>
              <span className={`font-mono font-bold ${savedSuccess.isNegative ? 'text-amber-400' : 'text-indigo-400'}`}>
                {formatINR(savedSuccess.rakePaise)}
              </span>
            </div>
            {!savedSuccess.isNegative && (
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Paid:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatINR(savedSuccess.paidPaise)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Outstanding:</span>
              <span className="font-mono font-bold text-amber-400">
                {formatINR(savedSuccess.outstandingPaise)}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleResetAndClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleResetAndClose} title="Add Manual / Historical Fee Entry" maxWidth="md">
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs font-medium text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Member Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Member <span className="text-rose-400">*</span>
          </label>
          <select
            value={selectedPlayerId}
            onChange={(e) => {
              setSelectedPlayerId(e.target.value)
              if (e.target.value) setNewPlayerName('')
              if (error) setError('')
            }}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Select Existing Member or Add New --</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {!selectedPlayerId && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Or Enter New Member Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Karthik"
              value={newPlayerName}
              onChange={(e) => {
                setNewPlayerName(e.target.value)
                if (error) setError('')
              }}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Fee Generated & Paid Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Fee Amount (₹) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-medium text-slate-500">₹</span>
              <input
                type="number"
                step="any"
                placeholder="5,500 or -500"
                value={rakeRupees}
                onChange={(e) => {
                  setRakeRupees(e.target.value)
                  if (error) setError('')
                }}
                className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            {rakePaise < 0 ? (
              <p className="text-[11px] text-amber-400">
                Negative fee: Deducts {formatINR(Math.abs(rakePaise))} from member total fee & debt.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Tip: Enter negative (e.g. -500) for fee discount or rebate.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Already Paid (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-medium text-slate-500">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={rakePaise < 0 ? 'Disabled for discount' : '3,000'}
                value={rakePaise < 0 ? '' : paidRupees}
                disabled={rakePaise < 0}
                onChange={(e) => {
                  setPaidRupees(e.target.value)
                  if (error) setError('')
                }}
                className={`w-full pl-7 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 ${
                  rakePaise < 0 ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {paidPaise > 0 && (
          <div className="space-y-1.5 p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Paid To Organizer</span>
              <span className="text-[10px] text-indigo-400 font-normal">Personal Account</span>
            </label>
            <select
              value={receivedByOwnerId}
              onChange={(e) => setReceivedByOwnerId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
              <option value="">General Pool / Unassigned</option>
            </select>
          </div>
        )}

        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Date (Optional)</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Notes</label>
          <input
            type="text"
            placeholder="e.g. Previous sessions prior to ledger"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
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
            Save Fee Entry
          </button>
        </div>
      </form>
    </Modal>
  )
}
