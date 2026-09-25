import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { useLedger, Player } from '../../lib/store/ledgerStore'
import { formatINR, formatDate, formatDateTime } from '../../lib/accounting/formatters'
import { PlusCircle, Wallet, History, AlertCircle, Ban } from 'lucide-react'

interface PlayerDetailModalProps {
  player: Player | null
  isOpen: boolean
  onClose: () => void
  onOpenAddRake: (playerId: string) => void
  onOpenAddPayment: (playerId: string) => void
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  isOpen,
  onClose,
  onOpenAddRake,
  onOpenAddPayment,
}) => {
  const { historicalRake, payments, voidPayment } = useLedger()
  const [activeTab, setActiveTab] = useState<'rake' | 'payments'>('rake')

  if (!player) return null

  const playerRakeEntries = historicalRake
    .filter((h) => h.playerId === player.id)
    .slice()
    .reverse()

  const playerPayments = payments
    .filter((p) => p.playerId === player.id)
    .slice()
    .reverse()

  const totalGeneratedPaise = playerRakeEntries
    .filter((h) => h.status === 'active')
    .reduce((sum, h) => sum + h.amountPaise, 0)

  const totalPaidPaise = playerPayments
    .filter((p) => p.status === 'active')
    .reduce((sum, p) => sum + p.amountPaise, 0)

  const outstandingPaise = Math.max(0, totalGeneratedPaise - totalPaidPaise)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Member Ledger: ${player.name}`}
      subtitle="Complete member transaction history and balance"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Balance Summary Cards */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Generated</span>
            <div className="text-base font-bold text-slate-100 mt-1 font-mono">
              {formatINR(totalGeneratedPaise)}
            </div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Paid</span>
            <div className="text-base font-bold text-emerald-400 mt-1 font-mono">
              {formatINR(totalPaidPaise)}
            </div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400">Outstanding</span>
            <div
              className={`text-base font-bold mt-1 font-mono ${
                outstandingPaise > 0 ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              {formatINR(outstandingPaise)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onClose()
              onOpenAddRake(player.id)
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Add Fee</span>
          </button>
          <button
            onClick={() => {
              onClose()
              onOpenAddPayment(player.id)
            }}
            disabled={outstandingPaise === 0}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>+ Record Payment</span>
          </button>
        </div>

        {/* Tab switch: Fee entries vs Payments */}
        <div>
          <div className="flex border-b border-slate-800 text-xs font-medium mb-3">
            <button
              onClick={() => setActiveTab('rake')}
              className={`pb-2 px-3 border-b-2 font-semibold transition-colors ${
                activeTab === 'rake'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Fee Entries ({playerRakeEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-2 px-3 border-b-2 font-semibold transition-colors ${
                activeTab === 'payments'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Payments Received ({playerPayments.length})
            </button>
          </div>

          {activeTab === 'rake' ? (
            <div className="space-y-2">
              {playerRakeEntries.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/50 rounded-lg border border-slate-800">
                  No fee entries recorded for this member.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                  {playerRakeEntries.map((h) => (
                    <div key={h.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-100">
                            {formatINR(h.amountPaise)}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                            h.entryType === 'game' || h.gameId
                              ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/60'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {h.entryType === 'game' || h.gameId ? 'Session Activity' : 'Direct Entry'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatDate(h.entryDate)} · {h.notes || 'No notes'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {playerPayments.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/50 rounded-lg border border-slate-800">
                  No payments recorded yet for this member.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                  {playerPayments.map((p) => {
                    const isVoided = p.status === 'voided'
                    return (
                      <div
                        key={p.id}
                        className={`p-3 flex items-center justify-between text-xs ${
                          isVoided ? 'opacity-60' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400">
                              {formatINR(p.amountPaise)}
                            </span>
                            {isVoided && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase">
                                Voided
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {formatDateTime(p.paidAt)} · {p.notes || 'Payment'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
