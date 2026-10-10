import React from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR, formatDateTime } from '../../lib/accounting/formatters'
import {
  Sparkles,
  ArrowRightLeft,
  Info,
  CheckCircle2,
  Users,
  Wallet,
  Coins,
  ArrowRight,
  TrendingDown,
} from 'lucide-react'

interface FestivalCalculationModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenTransferModal?: () => void
  onViewTransfersTab?: () => void
}

export const FestivalCalculationModal: React.FC<FestivalCalculationModalProps> = ({
  isOpen,
  onClose,
  onOpenTransferModal,
  onViewTransfersTab,
}) => {
  const { summary, owners, settings, transfers } = useLedger()

  const activeTransfers = transfers.filter((t) => t.status === 'active')
  const transfersIn = activeTransfers.filter((t) => t.toBucket === 'festival_fund')
  const transfersOut = activeTransfers.filter((t) => t.fromBucket === 'festival_fund')

  const totalInPaise = transfersIn.reduce((sum, t) => sum + t.amountPaise, 0)
  const totalOutPaise = transfersOut.reduce((sum, t) => sum + t.amountPaise, 0)
  const netTransfersPaise = totalInPaise - totalOutPaise

  const dedicatedOwner = owners.find((o) => o.id === settings.festivalFundDeductedOwnerId)

  const bucketLabel = (bucket: string) => {
    switch (bucket) {
      case 'festival_fund':
        return 'Festival Jar'
      case 'table_recovery':
        return 'Equipment Reserve (Table Share)'
      case 'owner_profit':
        return 'Partner Distributable Profit'
      default:
        return bucket
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Festival Jar (Event Fund) Calculations & Breakdown"
      subtitle="Complete ledger math, fund allocations, and partner cash custody deductions"
      maxWidth="2xl"
    >
      <div className="space-y-5 text-slate-200">
        {/* Top Summary Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-4 h-4 text-purple-300" />
              </span>
              <span className="text-xs uppercase font-sans font-bold tracking-wider text-purple-300">
                Current Festival Jar Balance
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold font-sans">
                Expended / Used
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-300">
                {formatINR(summary.festivalFundAccumulatedPaise)}
              </span>
              <span className="text-xs text-slate-400 font-sans">
                Target: {formatINR(summary.festivalFundTargetPaise)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Money in this jar is marked as spent for celebrations, food, and team events. It is
              not held in any partner's personal custody.
            </p>
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0">
            {onOpenTransferModal && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenTransferModal()
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Add / Transfer</span>
              </button>
            )}
            {onViewTransfersTab && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onViewTransfersTab()
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5 text-purple-400" />
                <span>View All Transfers</span>
              </button>
            )}
          </div>
        </div>

        {/* Section 1: Waterfall Ledger Math */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold font-mono">
              1
            </span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Step 1: Ledger Inflow &amp; Outflow Calculation
            </h4>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">1. Direct Allocations from Game Sessions:</span>
              <span className="font-mono font-semibold text-slate-300">₹0</span>
            </div>
            <p className="text-[11px] text-slate-500 italic -mt-1 pb-1">
              * By rule, game net rake first funds the Equipment Reserve (Table Share) target (
              {formatINR(summary.tableRecoveryTargetPaise)}). Only after Table Recovery is 100%
              fulfilled does game rake naturally spill into the Festival Fund.
            </p>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">+</span>
                <span>Transfers &amp; Allocations IN (from Table Share / Member Payments):</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">
                +{formatINR(totalInPaise)}
              </span>
            </div>

            {transfersIn.length > 0 && (
              <div className="pl-4 space-y-1 text-[11px] text-slate-400 font-mono">
                {transfersIn.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <span className="font-sans truncate max-w-[260px] sm:max-w-md">
                      • {t.notes || `From ${bucketLabel(t.fromBucket)}`} ({formatDateTime(t.transferredAt)})
                    </span>
                    <span className="text-emerald-300">+{formatINR(t.amountPaise)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="text-rose-400 font-bold">-</span>
                <span>Transfers OUT (Reallocated to Table Share or Partner Profit):</span>
              </span>
              <span className="font-mono font-bold text-rose-400">
                -{formatINR(totalOutPaise)}
              </span>
            </div>

            {transfersOut.length > 0 && (
              <div className="pl-4 space-y-1 text-[11px] text-slate-400 font-mono">
                {transfersOut.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <span className="font-sans truncate max-w-[260px] sm:max-w-md">
                      • {t.notes || `Transferred to ${bucketLabel(t.toBucket)}`} ({formatDateTime(t.transferredAt)})
                    </span>
                    <span className="text-rose-300">-{formatINR(t.amountPaise)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-700/80 font-bold text-sm">
              <span className="text-slate-200">Net Current Festival Jar Balance:</span>
              <span className="font-mono text-amber-300">
                {formatINR(summary.festivalFundAccumulatedPaise)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Person-Wise Cash Custody Deduction */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold font-mono">
                2
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Step 2: Partner Cash Custody Impact (Person-Wise)
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Mode:{' '}
              {dedicatedOwner ? (
                <span className="text-purple-400 font-semibold">{dedicatedOwner.name} only</span>
              ) : (
                <span className="text-slate-300">Auto-split proportional</span>
              )}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              When cash is placed in the Festival Jar, it is deducted from the physical collected cash
              held by partners so they are not liable to equalize or distribute it.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="py-2 px-2 font-sans">Partner</th>
                    <th className="py-2 px-2 text-right">Cash Collected</th>
                    <th className="py-2 px-2 text-right text-purple-400">Festival Jar Deducted</th>
                    <th className="py-2 px-2 text-right">Bills Paid</th>
                    <th className="py-2 px-2 text-right text-emerald-400 font-sans">Net Cash in Hand</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {owners.map((owner) => {
                    const ent = summary.ownerEntitlements[owner.id]
                    const cash = ent?.cashCollectedPaise || 0
                    const fest = ent?.festivalFundDepositedPaise || 0
                    const exp = ent?.expensesPaidPaise || 0
                    const netHeld = ent?.netCashHeldPaise || 0

                    return (
                      <tr key={owner.id} className="hover:bg-slate-800/20">
                        <td className="py-2 px-2 font-sans font-semibold text-slate-200">
                          {owner.name}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-300">{formatINR(cash)}</td>
                        <td className="py-2 px-2 text-right text-purple-400 font-bold">
                          {fest > 0 ? `-${formatINR(fest)}` : '₹0'}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-400">
                          {exp > 0 ? `-${formatINR(exp)}` : '₹0'}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-slate-100">
                          <span className={netHeld > 0 ? 'text-emerald-400' : 'text-slate-300'}>
                            {formatINR(netHeld)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700 text-xs font-bold bg-slate-900/50">
                    <td className="py-2 px-2 font-sans text-slate-300">Total</td>
                    <td className="py-2 px-2 text-right text-slate-300">
                      {formatINR(summary.totalRakeCollectedPaise)}
                    </td>
                    <td className="py-2 px-2 text-right text-purple-400">
                      -{formatINR(summary.festivalFundAccumulatedPaise)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-400">
                      -{formatINR(summary.totalAllExpensesPaise)}
                    </td>
                    <td className="py-2 px-2 text-right text-emerald-400 font-sans">
                      {formatINR(
                        Object.values(summary.ownerEntitlements).reduce(
                          (sum, e) => sum + (e.netCashHeldPaise || 0),
                          0
                        )
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Formula for Net Cash in Hand:</span>
              </div>
              <p className="font-mono text-[10px] text-indigo-200/90 pl-5">
                Net Cash Held = Cash Collected − Expenses Paid − Festival Jar Deducted − Settlements Paid
              </p>
            </div>
          </div>
        </div>

        {/* Footer info & close */}
        <div className="pt-2 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-sans">
            Festival Fund Target: {formatINR(summary.festivalFundTargetPaise)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
