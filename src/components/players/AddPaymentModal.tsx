import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { parseRupeesToPaise, formatINR, localDateInputValue, localDateInputToISO } from '../../lib/accounting/formatters'
import { AlertTriangle, CheckCircle2, Wallet, ArrowRightLeft, Plus, Trash2, Info } from 'lucide-react'

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
  const { players, historicalRake, payments, addPayment, transferBetweenMembers, owners, addBucketTransfer, summary } = useLedger()

  const [fundingSource, setFundingSource] = useState<'new_money' | 'member_transfer'>('new_money')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayerId || '')
  const [receivedByOwnerId, setReceivedByOwnerId] = useState<string>(owners[0]?.id || '')
  const [amountRupees, setAmountRupees] = useState<string>('')
  const [festivalRupees, setFestivalRupees] = useState<string>('')
  const [paidAt, setPaidAt] = useState<string>(localDateInputValue())
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Source transfers when fundingSource === 'member_transfer'
  const [sourceTransfers, setSourceTransfers] = useState<Array<{ playerId: string; amountRupees: string }>>([
    { playerId: '', amountRupees: '' },
  ])

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId)
  const collector = owners.find((o) => o.id === receivedByOwnerId) || owners[0]

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
  const festivalPaise = parseRupeesToPaise(festivalRupees)
  const remainingTablePaise = Math.max(0, amountPaise - festivalPaise)
  const activeOwnerCount = owners.filter((o) => o.isActive).length || owners.length || 1
  const sharePerOwnerPaise = Math.floor(remainingTablePaise / activeOwnerCount)
  // Owner pool available to fund a Festival Jar allocation (table + profit).
  const availablePoolPaise = summary.tableRecoveryAccumulatedPaise + summary.totalDistributableRakePaise

  // Source member allocation computations
  const totalAllocatedPaise = sourceTransfers.reduce(
    (sum, s) => sum + parseRupeesToPaise(s.amountRupees),
    0
  )
  const differencePaise = amountPaise - totalAllocatedPaise

  const handleAddSource = () => {
    setSourceTransfers((prev) => [...prev, { playerId: '', amountRupees: '' }])
  }

  const handleRemoveSource = (index: number) => {
    setSourceTransfers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateSource = (index: number, field: 'playerId' | 'amountRupees', value: string) => {
    setSourceTransfers((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
    if (error) setError('')
  }

  const handleAutoFillSource = (index: number) => {
    if (amountPaise <= 0) return
    // If only 1 source, fill the entire amount; else fill remaining
    if (sourceTransfers.length === 1) {
      handleUpdateSource(index, 'amountRupees', amountRupees)
    } else {
      const currentVal = parseRupeesToPaise(sourceTransfers[index].amountRupees)
      const maxFill = Math.max(0, differencePaise + currentVal)
      handleUpdateSource(index, 'amountRupees', (maxFill / 100).toString())
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedPlayerId) {
      setError('Please select a recipient member.')
      return
    }

    if (amountPaise <= 0) {
      setError('Payment amount must be greater than zero.')
      return
    }

    if (fundingSource === 'new_money') {
      if (festivalPaise > amountPaise) {
        setError('Festival Jar allocation cannot exceed total payment amount.')
        return
      }

      // Pre-validate the Festival Jar allocation against the available owner pool
      // BEFORE recording the payment, so a failing allocation can't leave an
      // orphaned payment behind (which previously tempted a duplicate retry).
      if (festivalPaise > 0 && festivalPaise > availablePoolPaise) {
        setError(
          `Festival Jar allocation (${formatINR(festivalPaise)}) exceeds the available owner pool (${formatINR(
            availablePoolPaise
          )}). Lower the Festival amount.`
        )
        return
      }

      try {
        await addPayment({
          playerId: selectedPlayerId,
          amountPaise,
          paidAt: paidAt ? localDateInputToISO(paidAt) : undefined,
          notes: notes.trim(),
          receivedByOwnerId: receivedByOwnerId || undefined,
        })

        const receiverName = collector?.name || 'Activity Pool'

        if (festivalPaise > 0) {
          await addBucketTransfer({
            fromBucket: 'table_recovery',
            toBucket: 'festival_fund',
            amountPaise: festivalPaise,
            notes: `Festival Jar allocation from ${selectedPlayer?.name || 'player'} payment (received by ${receiverName})`,
            transferredAt: paidAt ? localDateInputToISO(paidAt) : undefined,
            deductedFromOwnerId: receivedByOwnerId || undefined,
          })
        }

        const newRemaining = playerOutstandingPaise - amountPaise
        setSuccessMsg(
          `Recorded ${formatINR(amountPaise)} payment for ${selectedPlayer?.name} (Received by: ${receiverName}). ` +
            (newRemaining >= 0
              ? `Remaining outstanding: ${formatINR(newRemaining)}.`
              : `Member now holds a credit of ${formatINR(-newRemaining)}.`)
        )
        setTimeout(() => {
          handleResetAndClose()
        }, 1500)
      } catch (err: any) {
        setError(err.message || 'Failed to record payment.')
      }
    } else {
      // Member Transfer
      if (sourceTransfers.length === 0) {
        setError('Please select at least one source member to transfer from.')
        return
      }

      for (let i = 0; i < sourceTransfers.length; i++) {
        const s = sourceTransfers[i]
        if (!s.playerId) {
          setError(`Please select a member for transfer source #${i + 1}.`)
          return
        }
        if (s.playerId === selectedPlayerId) {
          setError(`Source member #${i + 1} cannot be the same as the recipient member (${selectedPlayer?.name}).`)
          return
        }
        if (parseRupeesToPaise(s.amountRupees) <= 0) {
          setError(`Please enter a valid amount greater than ₹0 for source member #${i + 1}.`)
          return
        }
      }

      if (totalAllocatedPaise !== amountPaise) {
        setError(
          `Total transferred from member(s) (${formatINR(totalAllocatedPaise)}) must exactly equal the payment amount (${formatINR(amountPaise)}). Difference: ${formatINR(Math.abs(amountPaise - totalAllocatedPaise))}.`
        )
        return
      }

      try {
        await transferBetweenMembers({
          toPlayerId: selectedPlayerId,
          sources: sourceTransfers.map((s) => ({
            fromPlayerId: s.playerId,
            amountPaise: parseRupeesToPaise(s.amountRupees),
          })),
          transferDate: paidAt ? localDateInputToISO(paidAt) : undefined,
          notes: notes.trim(),
        })

        const sourceNames = sourceTransfers
          .map((s) => players.find((p) => p.id === s.playerId)?.name)
          .filter(Boolean)
          .join(', ')

        setSuccessMsg(
          `Transferred ${formatINR(amountPaise)} to ${selectedPlayer?.name} from ${sourceNames}. Remaining outstanding: ${formatINR(
            playerOutstandingPaise - amountPaise
          )}.`
        )
        setTimeout(() => {
          handleResetAndClose()
        }, 1500)
      } catch (err: any) {
        setError(err.message || 'Failed to record member transfer.')
      }
    }
  }

  const handleResetAndClose = () => {
    setSuccessMsg(null)
    setAmountRupees('')
    setFestivalRupees('')
    setNotes('')
    setError('')
    setFundingSource('new_money')
    setSourceTransfers([{ playerId: '', amountRupees: '' }])
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

        {/* Payment Source Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 block">Payment Source</label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => {
                setFundingSource('new_money')
                if (error) setError('')
              }}
              className={`py-2 px-3 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                fundingSource === 'new_money'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>💵 New Money (Inflow)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFundingSource('member_transfer')
                if (error) setError('')
              }}
              className={`py-2 px-3 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                fundingSource === 'member_transfer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>🔄 Transfer from Member</span>
            </button>
          </div>
        </div>

        {/* Member Selector (Recipient) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Recipient Member <span className="text-rose-400">*</span>
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
                onClick={() => {
                  const fullVal = (playerOutstandingPaise / 100).toString()
                  setAmountRupees(fullVal)
                  if (fundingSource === 'member_transfer' && sourceTransfers.length === 1) {
                    handleUpdateSource(0, 'amountRupees', fullVal)
                  }
                }}
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
              placeholder="e.g. 1,000"
              value={amountRupees}
              onChange={(e) => {
                const val = e.target.value
                setAmountRupees(val)
                if (fundingSource === 'member_transfer' && sourceTransfers.length === 1 && (!sourceTransfers[0].amountRupees || sourceTransfers[0].amountRupees === amountRupees)) {
                  handleUpdateSource(0, 'amountRupees', val)
                }
                if (error) setError('')
              }}
              className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        </div>

        {/* SECTION A: NEW MONEY MODE */}
        {fundingSource === 'new_money' && (
          <>
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

            {/* Put into Festival Jar (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Put into Festival Jar? (₹) <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                {amountPaise > 0 && (
                  <span className="text-[11px] text-purple-400 font-mono">
                    Community Party Kitty
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-medium text-slate-500">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 1,000 (leave 0 or blank for none)"
                  value={festivalRupees}
                  onChange={(e) => {
                    setFestivalRupees(e.target.value)
                    if (error) setError('')
                  }}
                  className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Money in the Festival Jar is marked as used for parties/events and is not in anyone's personal hand.
              </p>
            </div>

            {/* Live 4-Way Breakdown Preview */}
            {amountPaise > 0 && (
              <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>💰</span>
                    <span>How this {formatINR(amountPaise)} is Split</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Equal {activeOwnerCount}-Way
                  </span>
                </div>

                {festivalPaise > 0 && (
                  <div className="flex justify-between items-center bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 rounded-lg text-purple-300 font-mono text-xs">
                    <span>🎪 Festival Jar (Used / Expended):</span>
                    <span className="font-bold">{formatINR(festivalPaise)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg text-amber-300 font-mono text-xs">
                  <span>🎱 Table Reimbursement:</span>
                  <span className="font-bold">
                    {formatINR(remainingTablePaise)} ({formatINR(sharePerOwnerPaise)} each)
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="text-slate-200 font-medium">
                    • <span className="text-indigo-300 font-semibold">{collector?.name || 'Collector'}</span> keeps{' '}
                    <span className="text-emerald-400 font-mono font-bold">{formatINR(sharePerOwnerPaise)}</span>
                    {festivalPaise > 0 ? (
                      <span className="text-purple-300">
                        {' '}(−{formatINR(festivalPaise)} used in Festival Jar)
                      </span>
                    ) : null}
                  </div>
                  {owners
                    .filter((o) => o.id !== (receivedByOwnerId || collector?.id))
                    .map((other) => (
                      <div key={other.id} className="text-slate-300">
                        • <span className="text-indigo-300 font-semibold">{collector?.name || 'Collector'}</span> owes{' '}
                        <span className="font-semibold text-slate-200">{other.name}</span>:{' '}
                        <span className="text-amber-400 font-mono font-bold">
                          {formatINR(sharePerOwnerPaise)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* SECTION B: MEMBER TRANSFER MODE */}
        {fundingSource === 'member_transfer' && (
          <div className="space-y-3 p-3.5 bg-slate-950/70 border border-indigo-500/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Deduct from Which Member(s)?</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select member(s) whose balance will be charged to cover {selectedPlayer?.name || 'recipient'}'s payment.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSource}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/20 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>+ Split with another</span>
              </button>
            </div>

            <div className="space-y-2">
              {sourceTransfers.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <select
                      value={st.playerId}
                      onChange={(e) => handleUpdateSource(idx, 'playerId', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                      required
                    >
                      <option value="">-- Select Source Member --</option>
                      {players
                        .filter((p) => p.id !== selectedPlayerId)
                        .map((p) => {
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

                  <div className="w-32 relative">
                    <span className="absolute left-2.5 top-1.5 text-xs font-medium text-slate-500">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="Amount"
                      value={st.amountRupees}
                      onChange={(e) => handleUpdateSource(idx, 'amountRupees', e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  {amountPaise > 0 && (!st.amountRupees || parseRupeesToPaise(st.amountRupees) !== amountPaise) && (
                    <button
                      type="button"
                      onClick={() => handleAutoFillSource(idx)}
                      title="Auto fill full amount"
                      className="px-2 py-1.5 text-[10px] font-mono font-medium rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 shrink-0"
                    >
                      Fill
                    </button>
                  )}

                  {sourceTransfers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSource(idx)}
                      title="Remove source member"
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Allocation Status Indicator */}
            {amountPaise > 0 && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  totalAllocatedPaise === amountPaise
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : totalAllocatedPaise < amountPaise
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                <div className="font-mono">
                  <span>Deducted: </span>
                  <span className="font-bold">{formatINR(totalAllocatedPaise)}</span>
                  <span> / {formatINR(amountPaise)}</span>
                </div>

                <div className="text-[11px] font-medium">
                  {totalAllocatedPaise === amountPaise ? (
                    <span>✓ Exact match</span>
                  ) : totalAllocatedPaise < amountPaise ? (
                    <span>Needs {formatINR(amountPaise - totalAllocatedPaise)} more</span>
                  ) : (
                    <span>Over allocated by {formatINR(totalAllocatedPaise - amountPaise)}</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-1.5 text-[11px] text-indigo-300/80 bg-indigo-950/30 p-2 rounded-lg border border-indigo-900/30">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400" />
              <span>
                Internal member transfer: {selectedPlayer?.name || 'Recipient'} gets credited, and the selected member(s) will have their dues increased by this amount. No physical cash enters organizer accounts.
              </span>
            </div>
          </div>
        )}

        {/* Paid Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            {fundingSource === 'member_transfer' ? 'Transfer Date' : 'Payment Date'}
          </label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Notes / Reference</label>
          <input
            type="text"
            placeholder={
              fundingSource === 'member_transfer'
                ? 'e.g. Settle private debt, transferred balance'
                : 'e.g. UPI transfer, Cash handed over'
            }
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
            className={`px-5 py-2 text-sm font-semibold rounded-lg text-white transition-colors shadow-sm disabled:opacity-50 ${
              fundingSource === 'member_transfer'
                ? 'bg-indigo-600 hover:bg-indigo-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {fundingSource === 'member_transfer' ? 'Record Transfer' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
