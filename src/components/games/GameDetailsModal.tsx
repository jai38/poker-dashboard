import React, { useState } from 'react'
import { Modal } from '../common/Modal'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR, formatDateTime, parseRupeesToPaise } from '../../lib/accounting/formatters'
import { GameCalculationResult, GameRecord } from '../../lib/accounting/types'
import { AlertTriangle, Ban, Calendar, CheckCircle2, Plus, Receipt, ShieldAlert, Trash2 } from 'lucide-react'

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
  const { owners, voidGame, addSessionExpense, removeSessionExpense, games, summary } = useLedger()
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false)

  // Expense form states
  const [isAddingExpense, setIsAddingExpense] = useState(false)
  const [expenseDesc, setExpenseDesc] = useState('')
  const [expenseRupees, setExpenseRupees] = useState('')
  const [expensePaidBy, setExpensePaidBy] = useState(owners[0]?.id || '')
  const [expenseError, setExpenseError] = useState('')
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false)

  if (!gameRecord) return null

  // Always use the real-time record from store if present
  const liveGame = games.find((g) => g.id === gameRecord.id) || gameRecord
  const liveGameResult = summary.gameResults.find((gr) => gr.gameNumber === liveGame.gameNumber) || gameResult

  const isVoided = liveGame.status === 'voided'

  const handleVoidConfirm = async (reason?: string) => {
    if (!reason) return
    await voidGame(liveGame.id, reason)
    onClose()
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setExpenseError('')
    const amountPaise = parseRupeesToPaise(expenseRupees)
    if (amountPaise <= 0) {
      setExpenseError('Please enter an expense amount greater than ₹0.')
      return
    }
    if (!expenseDesc.trim()) {
      setExpenseError('Please enter an expense description.')
      return
    }

    try {
      setIsSubmittingExpense(true)
      await addSessionExpense(liveGame.id, {
        description: expenseDesc.trim(),
        amountPaise,
        paidByOwnerId: expensePaidBy || undefined,
      })
      setExpenseDesc('')
      setExpenseRupees('')
      setIsAddingExpense(false)
    } catch (err: any) {
      setExpenseError(err.message || 'Failed to add expense.')
    } finally {
      setIsSubmittingExpense(false)
    }
  }

  const handleRemoveExpense = async (expenseId: string) => {
    if (window.confirm('Remove this session expense?')) {
      await removeSessionExpense(liveGame.id, expenseId)
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Game #${liveGame.gameNumber} Details`}
        subtitle={formatDateTime(liveGame.playedAt)}
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
                {formatINR(liveGame.grossRakePaise)}
              </div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400">Expenses</span>
              <div className="text-sm font-bold text-rose-400 mt-1 font-mono">
                {formatINR(liveGameResult?.totalExpensePaise || 0)}
              </div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400">Net Rake</span>
              <div className="text-sm font-bold text-emerald-400 mt-1 font-mono">
                {formatINR(liveGameResult?.netRakePaise || 0)}
              </div>
            </div>
          </div>

          {/* Itemized Session Expenses */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-rose-400" />
                <span>Session Expenses Deducted</span>
              </h5>
              {!isVoided && !isAddingExpense && (
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Expense</span>
                </button>
              )}
            </div>

            {liveGame.expenses && liveGame.expenses.length > 0 ? (
              <div className="divide-y divide-slate-800/80 text-xs">
                {liveGame.expenses.map((exp, idx) => {
                  const payer = owners.find((o) => o.id === exp.paidByOwnerId)
                  return (
                    <div key={exp.id || idx} className="flex items-center justify-between py-2 group">
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-medium">{exp.description || 'Session Expense'}</span>
                        {payer && (
                          <span className="text-[11px] text-slate-400">
                            Paid by: <span className="text-slate-300 font-medium">{payer.name}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-400">
                          - {formatINR(exp.amountPaise)}
                        </span>
                        {!isVoided && exp.id && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(exp.id!)}
                            title="Remove expense"
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-2 text-xs text-slate-500 italic">
                No session expenses recorded for this game yet.
              </div>
            )}

            {/* Inline Add Expense Form */}
            {isAddingExpense && (
              <form onSubmit={handleAddExpense} className="pt-2 border-t border-slate-800 space-y-2.5">
                <div className="text-xs font-semibold text-slate-200">Add Session Expense</div>
                {expenseError && (
                  <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded text-rose-400 text-xs">
                    {expenseError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase text-slate-400 font-medium mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Refreshments, Electricity, Food"
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-medium mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={expenseRupees}
                      onChange={(e) => setExpenseRupees(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-medium mb-1">Paid By Owner</label>
                  <select
                    value={expensePaidBy}
                    onChange={(e) => setExpensePaidBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500"
                  >
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingExpense(false)
                      setExpenseError('')
                    }}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingExpense}
                    className="px-3 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingExpense ? 'Adding...' : 'Save Expense'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Waterfall Allocation (Table, Festival, Distributable) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Waterfall Allocation for this Game
            </h5>
            <div className="flex justify-between text-xs py-1 border-b border-slate-800">
              <span className="text-slate-400">Allocated to Table Recovery:</span>
              <span className="font-mono text-amber-400 font-bold">
                {formatINR(liveGameResult?.tableRecoveryAllocatedPaise || 0)}
              </span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-800">
              <span className="text-slate-400">Allocated to Festival Fund:</span>
              <span className="font-mono text-purple-400 font-bold">
                {formatINR(liveGameResult?.festivalFundAllocatedPaise || 0)}
              </span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-slate-400">Remaining Distributable Rake:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {formatINR(liveGameResult?.distributableRakePaise || 0)}
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
                    const att = liveGame.owners.find((o) => o.ownerId === owner.id)
                    const isPresent = att ? att.present : false
                    const equal = liveGameResult?.ownerEqualShare[owner.id] || 0
                    const excess = liveGameResult?.ownerExcessShare[owner.id] || 0
                    const total = liveGameResult?.ownerDistributions[owner.id] || 0

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

          {liveGame.notes && (
            <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="font-semibold text-slate-300">Notes: </span>
              {liveGame.notes}
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
