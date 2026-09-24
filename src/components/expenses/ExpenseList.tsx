import React, { useState } from 'react'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR, formatDate } from '../../lib/accounting/formatters'
import { AddExpenseModal } from './AddExpenseModal'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { Receipt, PlusCircle, Ban, AlertCircle } from 'lucide-react'

export const ExpenseList: React.FC = () => {
  const { expenses, games, voidExpense, summary } = useLedger()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [voidingExpenseId, setVoidingExpenseId] = useState<string | null>(null)

  const sortedExpenses = expenses.slice().reverse()

  const handleVoidConfirm = async (reason?: string) => {
    if (!voidingExpenseId || !reason) return
    await voidExpense(voidingExpenseId, reason)
    setVoidingExpenseId(null)
  }

  const getTypeBadge = (type: string) => {
    if (type === 'monthly_expense') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          Monthly Expense
        </span>
      )
    }
    if (type === 'credit_adjustment') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Credit / Refund
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        Session Expense
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-400" />
            <span>Expenses & General Adjustments</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            General table maintenance, monthly electricity bills, adjustments, and refunds (separate from per-game session deductions).
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Add Expense</span>
        </button>
      </div>

      {/* Expense Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Total Monthly Expenses
          </span>
          <div className="text-lg font-bold text-rose-400 font-mono">
            {formatINR(summary.totalGeneralExpensesPaise)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Shared general maintenance</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Total Credits & Adjustments
          </span>
          <div className="text-lg font-bold text-emerald-400 font-mono">
            {formatINR(summary.totalCreditsAdjustmentsPaise)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Reimbursements and refunds</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Net General Adjustment
          </span>
          <div className="text-lg font-bold text-slate-100 font-mono">
            {formatINR(summary.netGeneralAdjustmentPaise)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Net general expense balance</span>
        </div>
      </div>

      {/* Expenses Table (Section 23) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {sortedExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">No general expenses recorded</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Per-game session expenses are entered directly in games. Record month-end electricity bills or table supplies here.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Add First Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Associated Game</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sortedExpenses.map((exp) => {
                  const isVoided = exp.status === 'voided'
                  const associatedGame = exp.gameId ? games.find((g) => g.id === exp.gameId) : null

                  return (
                    <tr
                      key={exp.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isVoided ? 'opacity-60 bg-rose-950/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {formatDate(exp.expenseDate)}
                      </td>
                      <td className="py-3 px-4">{getTypeBadge(exp.type)}</td>
                      <td className="py-3 px-4 text-slate-200 font-medium">
                        {exp.description}
                        {isVoided && exp.voidReason && (
                          <div className="text-[10px] text-rose-400 mt-0.5">
                            Void Reason: {exp.voidReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {associatedGame ? (
                          <span className="font-mono text-indigo-400">
                            Game #{associatedGame.gameNumber}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">No game (Monthly)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            exp.type === 'credit_adjustment' ? 'text-emerald-400' : 'text-rose-400'
                          }
                        >
                          {exp.type === 'credit_adjustment' ? '+ ' : '- '}
                          {formatINR(exp.amountPaise)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isVoided
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isVoided ? 'Voided' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!isVoided ? (
                          <button
                            onClick={() => setVoidingExpenseId(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                            title="Void Expense"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[10px]">Voided</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <AddExpenseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(voidingExpenseId)}
        onClose={() => setVoidingExpenseId(null)}
        onConfirm={handleVoidConfirm}
        title="Void Expense Entry"
        message="Are you sure you want to void this expense? It will be marked voided and excluded from accounting totals."
        confirmText="Void Expense"
        isDestructive
        requireReason
        reasonPlaceholder="e.g. Invoiced to wrong table or refund entered"
      />
    </div>
  )
}
