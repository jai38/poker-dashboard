import React, { useState } from 'react'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR, formatDateTime } from '../../lib/accounting/formatters'
import { RecordSettlementModal } from './RecordSettlementModal'
import { Scale, CheckCircle2, AlertCircle, PlusCircle, ArrowRight } from 'lucide-react'

export const OwnerSettlementView: React.FC = () => {
  const { owners, summary, settlements } = useLedger()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | undefined>(undefined)

  const handleOpenForOwner = (ownerId?: string) => {
    setSelectedOwnerId(ownerId)
    setIsModalOpen(true)
  }

  const activeSettlements = settlements.filter((s) => s.status === 'active')

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            <span>Owner Settlements & Entitlements</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Reconciliation between game distributable rake, individual owner entitlements, and cash actually paid out.
          </p>
        </div>

        <button
          onClick={() => handleOpenForOwner(undefined)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Payout / Settlement</span>
        </button>
      </div>

      {/* Reconciliation Callout (Section 24) */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          summary.reconciled
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
            : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {summary.reconciled ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
          )}
          <div>
            <h4 className="text-sm font-semibold">
              {summary.reconciled
                ? 'Exact Reconciliation: Distributable Rake === Owner Entitlements'
                : 'Reconciliation Mismatch'}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Total Distributable Rake ({formatINR(summary.totalDistributableRakePaise)}) = Total Owner Entitlements ({formatINR(summary.totalOwnerEntitlementPaise)}). Diff: {formatINR(summary.reconciliationDiffPaise)}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono shrink-0">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Total Entitled</span>
            <span className="font-bold text-slate-100">{formatINR(summary.totalOwnerEntitlementPaise)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Total Settled</span>
            <span className="font-bold text-emerald-400">{formatINR(summary.totalOwnerSettledPaise)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Remaining Due</span>
            <span className="font-bold text-amber-400">{formatINR(summary.remainingOwnerSettlementPaise)}</span>
          </div>
        </div>
      </div>

      {/* Cumulative Owner Entitlement Table (Section 24) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Cumulative Owner Balance Table
          </h3>
          <span className="text-xs text-slate-500 font-mono">4 Configured Owners</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4 text-right">Equal Share (₹1,000 Bucket)</th>
                <th className="py-3 px-4 text-right">Excess Share (Attendance)</th>
                <th className="py-3 px-4 text-right">Gross Entitlement</th>
                <th className="py-3 px-4 text-right text-emerald-400">Already Settled</th>
                <th className="py-3 px-4 text-right text-amber-400">Remaining Balance</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {owners.map((owner) => {
                const ent = summary.ownerEntitlements[owner.id]
                const remaining = ent?.remainingEntitlementPaise || 0

                return (
                  <tr key={owner.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                        ♠
                      </div>
                      <span>{owner.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {formatINR(ent?.equalSharePaise || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {formatINR(ent?.excessSharePaise || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                      {formatINR(ent?.grossEntitlementPaise || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-400">
                      {formatINR(ent?.settledPaise || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                      {formatINR(remaining)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <button
                        onClick={() => handleOpenForOwner(owner.id)}
                        disabled={remaining === 0}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white transition-colors"
                      >
                        Settle
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-800 bg-slate-950/80 font-bold text-xs font-mono">
                <td className="py-3.5 px-4 font-sans text-slate-200">Total</td>
                <td className="py-3.5 px-4 text-right text-slate-300">
                  {formatINR(
                    Object.values(summary.ownerEntitlements).reduce(
                      (s, e) => s + e.equalSharePaise,
                      0
                    )
                  )}
                </td>
                <td className="py-3.5 px-4 text-right text-slate-300">
                  {formatINR(
                    Object.values(summary.ownerEntitlements).reduce(
                      (s, e) => s + e.excessSharePaise,
                      0
                    )
                  )}
                </td>
                <td className="py-3.5 px-4 text-right text-indigo-300">
                  {formatINR(summary.totalOwnerEntitlementPaise)}
                </td>
                <td className="py-3.5 px-4 text-right text-emerald-400">
                  {formatINR(summary.totalOwnerSettledPaise)}
                </td>
                <td className="py-3.5 px-4 text-right text-amber-400">
                  {formatINR(summary.remainingOwnerSettlementPaise)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Settlement Transactions History (Section 25) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Recorded Owner Payout Transactions
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {activeSettlements.length} Transactions
          </span>
        </div>

        {activeSettlements.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No settlement payouts recorded yet. When owners take out their entitled profit, record it using the button above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-medium">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Payout Method / Notes</th>
                  <th className="py-3 px-4 text-right font-mono">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {activeSettlements.map((s) => {
                  const owner = owners.find((o) => o.id === s.ownerId)
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-400">{formatDateTime(s.settledAt)}</td>
                      <td className="py-3 px-4 font-sans font-semibold text-slate-200">
                        {owner?.name || s.ownerId}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-sans">{s.notes || 'Settlement'}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {formatINR(s.amountPaise)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <RecordSettlementModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialOwnerId={selectedOwnerId}
        />
      )}
    </div>
  )
}
