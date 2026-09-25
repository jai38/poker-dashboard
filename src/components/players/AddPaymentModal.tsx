import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { useLedger, Player } from '../../lib/store/ledgerStore'
import { parseRupeesToPaise, formatINR } from '../../lib/accounting/formatters'
import { AlertTriangle, CheckCircle2, Wallet } from 'lucide-react'

interface AddPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  initialPlayerId?: string
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  initialPlayerId,
}) => {
  const { players, historicalRake, payments, addPayment, owners } = useLedger()

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayerId || '')
  const [receivedByOwnerId, setReceivedByOwnerId] = useState<string>(owners[0]?.id || '')
  const [amountRupees, setAmountRupees] = useState<string>('')
  const [paidAt, setPaidAt] = useState<string>(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId)

  // Compute selected player balances
  const playerGeneratedPaise = selectedPlayer
    ? historicalRake
        .filter((h) => h.playerId === selectedPlayer.id && h.status === 'active')
        .reduce((sum, h) => sum + h.amountPaise, 0)
    : 0

  const playerPaidPaise = selectedPlayer
    ? payments
        .filter((p) => p.playerId === selectedPlayer.id && p.status === 'active')
        .reduce((sum, p) => sum + p.amountPaise, 0)
    : 0

  const playerOutstandingPaise = Math.max(0, playerGeneratedPaise - playerPaidPaise)
  const amountPaise = parseRupeesToPaise(amountRupees)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedPlayerId) {
      setError('Please select a member.')
      return
    }

    if (amountPaise <= 0) {
      setError('Payment amount must be greater than zero.')
      return
    }

    if (amountPaise > playerOutstandingPaise) {
      setError(
        `Payment (${formatINR(amountPaise)}) exceeds outstanding balance (${formatINR(
          playerOutstandingPaise
        )}). Overpayment is not supported in V1.`
      )
      return
    }

    try {
      await addPayment({
        playerId: selectedPlayerId,
        amountPaise,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
        notes: notes.trim(),
        receivedByOwnerId: receivedByOwnerId || undefined,
      })

      const receiverName = owners.find((o) => o.id === receivedByOwnerId)?.name || 'Activity Pool'
      setSuccessMsg(
        `Recorded ${formatINR(amountPaise)} payment for ${selectedPlayer?.name} (Received by: ${receiverName}). Remaining outstanding: ${formatINR(
          playerOutstandingPaise - amountPaise
        )}.`
      )
      setTimeout(() => {
        handleResetAndClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to record payment.')
    }
  }

  const handleResetAndClose = () => {
    setSuccessMsg(null)
    setAmountRupees('')
    setNotes('')
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleResetAndClose} title="Record Member Payment" maxWidth="md">
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
            value={selectedPlayerId}
            onChange={(e) => {
              setSelectedPlayerId(e.target.value)
              if (error) setError('')
            }}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            required
          >
            <option value="">-- Choose Member --</option>
            {players.map((p) => {
              const gen = historicalRake
                .filter((h) => h.playerId === p.id && h.status === 'active')
                .reduce((s, h) => s + h.amountPaise, 0)
              const paid = payments
                .filter((pay) => pay.playerId === p.id && pay.status === 'active')
                .reduce((s, pay) => s + pay.amountPaise, 0)
              const out = Math.max(0, gen - paid)

              return (
                <option key={p.id} value={p.id}>
                  {p.name} (Due: {formatINR(out)})
                </option>
              )
            })}
          </select>
        </div>

        {/* Member Account Overview */}
        {selectedPlayer && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Generated</span>
              <span className="text-slate-200 font-bold">{formatINR(playerGeneratedPaise)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Paid</span>
              <span className="text-emerald-400 font-bold">{formatINR(playerPaidPaise)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Outstanding</span>
              <span className="text-amber-400 font-bold">{formatINR(playerOutstandingPaise)}</span>
            </div>
          </div>
        )}

        {/* Payment Amount */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">
              Payment Amount (₹) <span className="text-rose-400">*</span>
            </label>
            {playerOutstandingPaise > 0 && (
              <button
                type="button"
                onClick={() => setAmountRupees((playerOutstandingPaise / 100).toString())}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Pay Full ({formatINR(playerOutstandingPaise)})
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm font-medium text-slate-500">₹</span>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 2,000"
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

        {/* Received By Organizer Account */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span>Received By Organizer <span className="text-rose-400">*</span></span>
            <span className="text-[10px] text-indigo-400 font-normal">Personal UPI / Bank</span>
          </label>
          <select
            value={receivedByOwnerId}
            onChange={(e) => setReceivedByOwnerId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} (Personal UPI / Bank)
              </option>
            ))}
            <option value="">Shared Activity Pool / Unassigned</option>
          </select>
          <p className="text-[11px] text-slate-400">
            Tracks who physically holds this money so organizer pool & expense balances square up accurately.
          </p>
        </div>

        {/* Paid Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Payment Date</label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Payment Notes / Ref</label>
          <input
            type="text"
            placeholder="e.g. UPI transfer, Cash handed over"
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
            disabled={Boolean(successMsg)}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors shadow-sm"
          >
            Record Payment
          </button>
        </div>
      </form>
    </Modal>
  )
}
