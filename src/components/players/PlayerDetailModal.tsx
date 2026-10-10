import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { useLedger, Player } from '../../lib/store/ledgerStore'
import { HistoricalRakeEntry, PlayerPayment } from '../../lib/accounting/types'
import { formatINR, formatDate, formatDateTime } from '../../lib/accounting/formatters'
import { PlusCircle, Wallet, Pencil, Trash2, Ban } from 'lucide-react'
import { EditHistoricalRakeModal } from './EditHistoricalRakeModal'
import { EditPaymentModal } from './EditPaymentModal'

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
  const { historicalRake, payments, deleteHistoricalRake, deletePayment, voidPayment } = useLedger()
  const [activeTab, setActiveTab] = useState<'rake' | 'payments'>('rake')

  // Editing state
  const [editingRakeEntry, setEditingRakeEntry] = useState<HistoricalRakeEntry | null>(null)
  const [editingPayment, setEditingPayment] = useState<PlayerPayment | null>(null)

  // Deletion & Void state
  const [deletingRakeId, setDeletingRakeId] = useState<string | null>(null)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [voidingPaymentId, setVoidingPaymentId] = useState<string | null>(null)

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

  const handleDeleteRakeConfirm = async () => {
    if (deletingRakeId) {
      await deleteHistoricalRake(deletingRakeId)
      setDeletingRakeId(null)
    }
  }

  const handleDeletePaymentConfirm = async () => {
    if (deletingPaymentId) {
      await deletePayment(deletingPaymentId)
      setDeletingPaymentId(null)
    }
  }

  const handleVoidPaymentConfirm = async (reason?: string) => {
    if (voidingPaymentId && reason) {
      await voidPayment(voidingPaymentId, reason)
      setVoidingPaymentId(null)
    }
  }

  return (
    <>
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
                    {playerRakeEntries.map((h) => {
                      const isVoided = h.status === 'voided'
                      return (
                        <div
                          key={h.id}
                          className={`p-3 flex items-center justify-between text-xs hover:bg-slate-900/50 transition-colors ${
                            isVoided ? 'opacity-60 bg-rose-950/10' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-100">
                                {formatINR(h.amountPaise)}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                                  h.entryType === 'game' || h.gameId
                                    ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/60'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {h.entryType === 'game' || h.gameId ? 'Session Activity' : 'Direct Entry'}
                              </span>
                              {isVoided && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase">
                                  Voided
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {formatDate(h.entryDate)} · {h.notes || 'No notes'}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingRakeEntry(h)}
                              title="Edit fee entry"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingRakeId(h.id)}
                              title="Delete fee entry"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
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
                          className={`p-3 flex items-center justify-between text-xs hover:bg-slate-900/50 transition-colors ${
                            isVoided ? 'opacity-60 bg-rose-950/10' : ''
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

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingPayment(p)}
                              title="Edit payment"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                            {!isVoided && (
                              <button
                                type="button"
                                onClick={() => setVoidingPaymentId(p.id)}
                                title="Void payment"
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeletingPaymentId(p.id)}
                              title="Delete payment"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* Edit Fee Entry Modal */}
      {editingRakeEntry && (
        <EditHistoricalRakeModal
          isOpen={Boolean(editingRakeEntry)}
          onClose={() => setEditingRakeEntry(null)}
          rakeEntry={editingRakeEntry}
        />
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <EditPaymentModal
          isOpen={Boolean(editingPayment)}
          onClose={() => setEditingPayment(null)}
          payment={editingPayment}
        />
      )}

      {/* Delete Fee Entry Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingRakeId)}
        onClose={() => setDeletingRakeId(null)}
        onConfirm={handleDeleteRakeConfirm}
        title="Delete Member Fee Entry"
        message="Are you sure you want to permanently delete this fee entry? Member outstanding balances and total fees generated will be recalculated immediately."
        confirmText="Delete Fee Entry"
        isDestructive
      />

      {/* Delete Payment Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingPaymentId)}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={handleDeletePaymentConfirm}
        title="Delete Member Payment"
        message="Are you sure you want to permanently delete this payment? Member outstanding balances and total collected amounts will be recalculated immediately."
        confirmText="Delete Payment"
        isDestructive
      />

      {/* Void Payment Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(voidingPaymentId)}
        onClose={() => setVoidingPaymentId(null)}
        onConfirm={handleVoidPaymentConfirm}
        title="Void Member Payment"
        message="Are you sure you want to void this payment? It will be excluded from financial calculations while keeping an audit trail."
        confirmText="Void Payment"
        isDestructive
        requireReason
        reasonPlaceholder="e.g. Member UPI payment bounced"
      />
    </>
  )
}

