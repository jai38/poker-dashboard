import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR, formatDateTime } from '../../lib/accounting/formatters'
import { GameCalculationResult, GameRecord } from '../../lib/accounting/types'
import { AlertTriangle, Ban, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react'

interface GameDetailsModalProps {
  gameRecord: GameRecord | null
  gameResult?: GameCalculationResult
  isOpen: boolean
  onClose: () => void
}

export const GameDetailsModal: React.FC<GameDetailsModalProps> = ({
  gameRecord,
  gameResult,
  isOpen,
  onClose,
}) => {
  const { owners, voidGame } = useLedger()
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false)

  if (!gameRecord) return null

  const isVoided = gameRecord.status === 'voided'

  const handleVoidConfirm = async (reason?: string) => {
    if (!reason) return
    await voidGame(gameRecord.id, reason)
    onClose()
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Game #${gameRecord.gameNumber} Details`}
        subtitle={formatDateTime(gameRecord.playedAt)}
        maxWidth="lg"
      >
        <div className="space-y-6">
          {/* Status Header */}
          {isVoided ? (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Game Voided (Excluded from Accounting)
                </div>
                <p className="text-xs text-rose-200 mt-0.5">
                  Reason: {gameRecord.voidReason || 'No reason provided'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active Financial Record</span>
              </span>
              <span className="font-mono text-slate-400">ID: {gameRecord.id}</span>
            </div>
          )}

          {/* Rake & Net Pipeline */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400">Gross Rake</span>
              <div className="text-sm font-bold text-slate-100 mt-1 font-mono">
                {formatINR(gameRecord.grossRakePaise)}
              </div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400">Expenses</span>
              <div className="text-sm font-bold text-rose-400 mt-1 font-mono">
                {formatINR(gameResult?.totalExpensePaise || 0)}
              </div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400">Net Rake</span>
              <div className="text-sm font-bold text-emerald-400 mt-1 font-mono">
                {formatINR(gameResult?.netRakePaise || 0)}
              </div>
            </div>
          </div>

          {/* Itemized Session Expenses */}
          {gameRecord.expenses && gameRecord.expenses.length > 0 && (
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
              <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Session Expenses Deducted
              </h5>
              <div className="divide-y divide-slate-800/80 text-xs">
                {gameRecord.expenses.map((exp, idx) => (
                  <div key={idx} className="flex justify-between py-1.5">
                    <span className="text-slate-300">{exp.description || 'Expense'}</span>
                    <span className="font-mono font-medium text-rose-400">
                      - {formatINR(exp.amountPaise)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waterfall Allocation (Table, Festival, Distributable) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Waterfall Allocation for this Game
            </h5>
            <div className="flex justify-between text-xs py-1 border-b border-slate-800">
              <span className="text-slate-400">Allocated to Table Recovery:</span>
              <span className="font-mono text-amber-400 font-bold">
                {formatINR(gameResult?.tableRecoveryAllocatedPaise || 0)}
              </span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-800">
              <span className="text-slate-400">Allocated to Festival Fund:</span>
              <span className="font-mono text-purple-400 font-bold">
                {formatINR(gameResult?.festivalFundAllocatedPaise || 0)}
              </span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-slate-400">Remaining Distributable Rake:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {formatINR(gameResult?.distributableRakePaise || 0)}
              </span>
            </div>
          </div>

          {/* Owner Attendance & Entitlements */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Owner Attendance & Resulting Distribution
            </h5>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2">Owner</th>
                    <th className="py-2 text-center">Attendance</th>
                    <th className="py-2 text-right">Equal Share</th>
                    <th className="py-2 text-right">Excess Share</th>
                    <th className="py-2 text-right font-bold">Game Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {owners.map((owner) => {
                    const att = gameRecord.owners.find((o) => o.ownerId === owner.id)
                    const isPresent = att ? att.present : false
                    const equal = gameResult?.ownerEqualShare[owner.id] || 0
                    const excess = gameResult?.ownerExcessShare[owner.id] || 0
                    const total = gameResult?.ownerDistributions[owner.id] || 0

                    return (
                      <tr key={owner.id}>
                        <td className="py-2.5 font-sans font-medium text-slate-200">{owner.name}</td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPresent
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isPresent ? '✓ Present' : '✗ Absent (10%)'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-slate-400">{formatINR(equal)}</td>
                        <td className="py-2.5 text-right text-slate-400">{formatINR(excess)}</td>
                        <td className="py-2.5 text-right font-bold text-slate-100">
                          {formatINR(total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {gameRecord.notes && (
            <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="font-semibold text-slate-300">Notes: </span>
              {gameRecord.notes}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {!isVoided ? (
              <button
                type="button"
                onClick={() => setIsVoidDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Void Game</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500 italic">This game is voided.</span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isVoidDialogOpen}
        onClose={() => setIsVoidDialogOpen(false)}
        onConfirm={handleVoidConfirm}
        title={`Void Game #${gameRecord.gameNumber}`}
        message="Are you sure you want to void this game? Financial calculations will be immediately recalculated with this game excluded. Financial records are never hard-deleted."
        confirmText="Void Game"
        isDestructive
        requireReason
        reasonPlaceholder="e.g. Duplicate game entered by mistake"
      />
    </>
  )
}
