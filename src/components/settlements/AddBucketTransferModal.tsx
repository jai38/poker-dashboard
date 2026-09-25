import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR, parseRupeesToPaise } from '../../lib/accounting/formatters'
import { ArrowRightLeft, AlertCircle } from 'lucide-react'

interface AddBucketTransferModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AddBucketTransferModal: React.FC<AddBucketTransferModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { summary, addBucketTransfer } = useLedger()

  const [fromBucket, setFromBucket] = useState<'table_recovery' | 'festival_fund'>('table_recovery')
  const [toBucket, setToBucket] = useState<'table_recovery' | 'festival_fund' | 'owner_profit'>('owner_profit')
  const [amountRupees, setAmountRupees] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const tableBalance = summary.tableRecoveryAccumulatedPaise
  const festivalBalance = summary.festivalFundAccumulatedPaise
  const availableInSource = fromBucket === 'table_recovery' ? tableBalance : festivalBalance
  const parsedAmount = parseRupeesToPaise(amountRupees || '0')

  const handleFromChange = (newFrom: 'table_recovery' | 'festival_fund') => {
    setFromBucket(newFrom)
    if (newFrom === 'festival_fund' && toBucket === 'festival_fund') {
      setToBucket('owner_profit')
    } else if (newFrom === 'table_recovery' && toBucket === 'table_recovery') {
      setToBucket('owner_profit')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (parsedAmount <= 0) {
      setError('Amount must be greater than ₹0.')
      return
    }

    if (parsedAmount > availableInSource) {
      setError(`Cannot transfer more than available balance in ${fromBucket === 'table_recovery' ? 'Equipment Reserve' : 'Event Fund'} (${formatINR(availableInSource)}).`)
      return
    }

    if (fromBucket === toBucket) {
      setError('Source and destination buckets must be different.')
      return
    }

    setIsSubmitting(true)
    try {
      await addBucketTransfer({
        fromBucket,
        toBucket,
        amountPaise: parsedAmount,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to reallocate funds.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reallocate / Transfer Funds"
      subtitle="Manage custom allocation between ledger buckets"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Balances Card */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs font-mono">
            <div>
              <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider block">
                Equipment Reserve Balance
              </span>
              <span className="text-sm font-bold text-indigo-300">
                {formatINR(tableBalance)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider block">
                Event Fund Balance
              </span>
              <span className="text-sm font-bold text-amber-300">
                {formatINR(festivalBalance)}
              </span>
            </div>
          </div>

          {/* From & To Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Transfer From</label>
              <select
                value={fromBucket}
                onChange={(e) => handleFromChange(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="table_recovery">Equipment Reserve / Table Share ({formatINR(tableBalance)})</option>
                <option value="festival_fund">Event Fund / Festival ({formatINR(festivalBalance)})</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Transfer / Allocate To</label>
              <select
                value={toBucket}
                onChange={(e) => setToBucket(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="owner_profit">Divide of All — Share Equally Among All 4 Organizers</option>
                {fromBucket !== 'festival_fund' && (
                  <option value="festival_fund">Event Fund (Festival Reserve)</option>
                )}
                {fromBucket !== 'table_recovery' && (
                  <option value="table_recovery">Equipment Reserve (Table Share)</option>
                )}
              </select>
            </div>
          </div>

          {toBucket === 'owner_profit' ? (
            <div className="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg space-y-1">
              <p className="font-semibold text-emerald-200">
                ✨ Divide of All (Share Among Us):
              </p>
              <p className="text-emerald-300/90">
                Allocating {formatINR(parsedAmount || 0)} will distribute {formatINR(Math.floor((parsedAmount || 0) / 4))} equally to each of the 4 organizers.
                Any organizer holding physical cash will automatically receive peer-to-peer transfer instructions to pay the other organizers their equal share.
              </p>
            </div>
          ) : toBucket === 'festival_fund' ? (
            <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 p-3 rounded-lg">
              <p className="font-semibold text-amber-200">
                🎉 Event Fund (Festival Reserve):
              </p>
              <p className="text-amber-300/90">
                Funds will be reserved for upcoming festivals, celebrations, and team events.
              </p>
            </div>
          ) : (
            <div className="text-[11px] text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-lg">
              <p className="font-semibold text-indigo-200">
                🛠️ Equipment Reserve (Table Share):
              </p>
              <p className="text-indigo-300/90">
                Funds will be allocated towards equipment upkeep, table recovery, and infrastructure.
              </p>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Amount to Allocate (₹)</label>
              <button
                type="button"
                onClick={() => setAmountRupees((availableInSource / 100).toString())}
                className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Max: {formatINR(availableInSource)}
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-slate-500">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 font-medium">Quick Amount:</span>
              {[1000, 2000, 5000].map((preset) => {
                const presetPaise = preset * 100
                if (presetPaise > availableInSource) return null
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmountRupees(preset.toString())}
                    className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
                  >
                    ₹{preset.toLocaleString('en-IN')}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setAmountRupees((availableInSource / 100).toString())}
                className="px-2 py-0.5 text-[10px] font-mono rounded bg-indigo-950/70 hover:bg-indigo-900/70 border border-indigo-500/40 text-indigo-300 transition-colors"
              >
                Max Balance
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Notes / Audit Reason</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Organizers agreed to allocate ₹10k to event reserve"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Transferring...' : 'Confirm Reallocation'}</span>
            </button>
          </div>
        </form>
    </Modal>
  )
}
