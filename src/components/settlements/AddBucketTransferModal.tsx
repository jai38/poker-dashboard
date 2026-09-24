import React, { useState } from 'react'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR, parseRupeesToPaise } from '../../lib/accounting/formatters'
import { ArrowRightLeft, X, AlertCircle } from 'lucide-react'

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

  if (!isOpen) return null

  const tableBalance = summary.tableRecoveryAccumulatedPaise
  const festivalBalance = summary.festivalFundAccumulatedPaise
  const availableInSource = fromBucket === 'table_recovery' ? tableBalance : festivalBalance

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

    const parsedAmount = parseRupeesToPaise(amountRupees)
    if (parsedAmount <= 0) {
      setError('Amount must be greater than ₹0.')
      return
    }

    if (parsedAmount > availableInSource) {
      setError(`Cannot transfer more than available balance in ${fromBucket === 'table_recovery' ? 'Table Recovery' : 'Festival Fund'} (${formatINR(availableInSource)}).`)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Reallocate / Transfer Funds</h3>
              <p className="text-[11px] text-slate-400">Manage custom allocation between ledger buckets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                Table Recovery Balance
              </span>
              <span className="text-sm font-bold text-indigo-300">
                {formatINR(tableBalance)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider block">
                Festival Fund Balance
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
                <option value="table_recovery">Table Recovery ({formatINR(tableBalance)})</option>
                <option value="festival_fund">Festival Fund ({formatINR(festivalBalance)})</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Transfer To</label>
              <select
                value={toBucket}
                onChange={(e) => setToBucket(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="owner_profit">Owner Distributable Profit</option>
                {fromBucket !== 'festival_fund' && (
                  <option value="festival_fund">Festival Fund</option>
                )}
                {fromBucket !== 'table_recovery' && (
                  <option value="table_recovery">Table Recovery</option>
                )}
              </select>
            </div>
          </div>

          {toBucket === 'owner_profit' && (
            <p className="text-[11px] text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
              Funds allocated to <strong>Owner Distributable Profit</strong> are divided equally among all 4 table partners and immediately reflected on their balance sheets.
            </p>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Amount to Allocate (₹)</label>
              <button
                type="button"
                onClick={() => setAmountRupees((availableInSource / 100).toString())}
                className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300"
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
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Notes / Audit Reason</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Partners agreed to allocate ₹10k to festival reserve"
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
      </div>
    </div>
  )
}
