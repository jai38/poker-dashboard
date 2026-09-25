import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { parseRupeesToPaise, formatINR } from '../../lib/accounting/formatters'
import { AlertTriangle, Scale } from 'lucide-react'

interface RecordSettlementModalProps {
  isOpen: boolean
  onClose: () => void
  initialOwnerId?: string
  initialPayerId?: string
  initialAmountPaise?: number
}

export const RecordSettlementModal: React.FC<RecordSettlementModalProps> = ({
  isOpen,
  onClose,
  initialOwnerId,
  initialPayerId,
  initialAmountPaise,
}) => {
  const { owners, summary, recordOwnerSettlement } = useLedger()

  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(initialOwnerId || owners[0]?.id || '')
  const [paidByOwnerId, setPaidByOwnerId] = useState<string>(initialPayerId || '')
  const [amountRupees, setAmountRupees] = useState<string>(
    initialAmountPaise ? (initialAmountPaise / 100).toString() : ''
  )
  const [settledAt, setSettledAt] = useState<string>(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState<string>(
    initialPayerId
      ? `P2P transfer from ${owners.find((o) => o.id === initialPayerId)?.name || 'Organizer'}`
      : ''
  )
  const [error, setError] = useState<string>('')

  const selectedOwner = owners.find((o) => o.id === selectedOwnerId)
  const ownerEnt = selectedOwnerId ? summary.ownerEntitlements[selectedOwnerId] : null

  const entitlementPaise = ownerEnt?.grossEntitlementPaise || 0
  const settledPaise = ownerEnt?.settledPaise || 0
  const remainingPaise = ownerEnt?.remainingEntitlementPaise || 0

  const amountPaise = parseRupeesToPaise(amountRupees)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedOwnerId) {
      setError('Please select an organizer.')
      return
    }

    if (amountPaise <= 0) {
      setError('Settlement amount must be greater than zero.')
      return
    }

    const maxAllowedPaise = Math.max(remainingPaise, ownerEnt?.netPositionPaise || 0)

    if (maxAllowedPaise > 0 && amountPaise > maxAllowedPaise) {
      setError(
        `Settlement amount (${formatINR(amountPaise)}) exceeds organizer's receivable balance (${formatINR(
          maxAllowedPaise
        )}).`
      )
      return
    }

    try {
      await recordOwnerSettlement({
        ownerId: selectedOwnerId,
        amountPaise,
        settledAt: new Date(settledAt).toISOString(),
        notes: notes.trim(),
        paidByOwnerId: paidByOwnerId || undefined,
      })
      handleResetAndClose()
    } catch (err: any) {
      setError(err.message || 'Failed to record organizer settlement.')
    }
  }

  const handleResetAndClose = () => {
    setAmountRupees('')
    setNotes('')
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleResetAndClose} title="Record Organizer Settlement" maxWidth="md">
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs font-medium text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Organizer Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Organizer <span className="text-rose-400">*</span>
          </label>
          <select
            value={selectedOwnerId}
            onChange={(e) => {
              setSelectedOwnerId(e.target.value)
              if (error) setError('')
            }}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            required
          >
            {owners.map((o) => {
              const ent = summary.ownerEntitlements[o.id]
              return (
                <option key={o.id} value={o.id}>
                  {o.name} (Remaining: {formatINR(ent?.remainingEntitlementPaise || 0)})
                </option>
              )
            })}
          </select>
        </div>

        {/* Paid By (Source of Funds / P2P Payer) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span>Paid By (Source of Funds)</span>
            <span className="text-[10px] text-indigo-400 font-normal">P2P or Activity Pool</span>
          </label>
          <select
            value={paidByOwnerId}
            onChange={(e) => setPaidByOwnerId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Shared Activity Cash Pool</option>
            {owners
              .filter((o) => o.id !== selectedOwnerId)
              .map((o) => {
                const ent = summary.ownerEntitlements[o.id]
                return (
                  <option key={o.id} value={o.id}>
                    Transferred by {o.name} (Cash in hand: {formatINR(ent?.netCashHeldPaise || 0)})
                  </option>
                )
              })}
          </select>
          {paidByOwnerId && (
            <p className="text-[11px] text-indigo-300">
              Direct Peer-to-Peer Settlement: Decrements {owners.find((o) => o.id === paidByOwnerId)?.name}'s cash custody and settles {selectedOwner?.name}'s entitlement.
            </p>
          )}
        </div>

        {/* Owner Entitlement Status (Section 25) */}
        {selectedOwner && (
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Calculated Entitlement:</span>
              <span className="font-mono font-bold text-slate-100">{formatINR(entitlementPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Already Settled / Taken:</span>
              <span className="font-mono font-bold text-emerald-400">{formatINR(settledPaise)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-300 font-semibold">Remaining Entitlement:</span>
              <span className="font-mono font-bold text-indigo-400">{formatINR(remainingPaise)}</span>
            </div>
          </div>
        )}

        {/* Amount */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">
              Settlement Amount (₹) <span className="text-rose-400">*</span>
            </label>
            {remainingPaise > 0 && (
              <button
                type="button"
                onClick={() => setAmountRupees((remainingPaise / 100).toString())}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Settle Full ({formatINR(remainingPaise)})
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm font-medium text-slate-500">₹</span>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 5,000"
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

        {/* Settled Date */}
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
          <label className="text-xs font-medium text-slate-300">Notes / Payout Method</label>
          <input
            type="text"
            placeholder="e.g. Bank transfer, Cash payout"
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
            disabled={remainingPaise === 0}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors shadow-sm"
          >
            Record Settlement
          </button>
        </div>
      </form>
    </Modal>
  )
}
