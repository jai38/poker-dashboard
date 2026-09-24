import React, { useState } from 'react'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR, formatDateTime } from '../../lib/accounting/formatters'
import { RecordSettlementModal } from './RecordSettlementModal'
import { EditOwnersModal } from './EditOwnersModal'
import { AddBucketTransferModal } from './AddBucketTransferModal'
import {
  Scale,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  Users,
  ArrowRightLeft,
  Wallet,
  PiggyBank,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

export const OwnerSettlementView: React.FC = () => {
  const { owners, summary, settlements } = useLedger()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditOwnersOpen, setIsEditOwnersOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | undefined>(undefined)
  const [selectedPayerId, setSelectedPayerId] = useState<string | undefined>(undefined)
  const [selectedAmountPaise, setSelectedAmountPaise] = useState<number | undefined>(undefined)

  const handleOpenForOwner = (ownerId?: string, payerId?: string, amountPaise?: number) => {
    setSelectedOwnerId(ownerId)
    setSelectedPayerId(payerId)
    setSelectedAmountPaise(amountPaise)
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
            <span>Owner Settlements, Cash Custody & Entitlements</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tracks physical cash collected in partner accounts vs. profit entitlements, out-of-pocket expenses, and actionable peer-to-peer transfers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shadow-sm transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reallocate / Transfer Funds</span>
          </button>

          <button
            onClick={() => setIsEditOwnersOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Edit Owner Names</span>
          </button>

          <button
            onClick={() => handleOpenForOwner(undefined)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Settlement / P2P</span>
          </button>
        </div>
      </div>

      {/* Reconciliation Callout */}
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

      {/* Peer-to-Peer Transfer Recommendations Matrix */}
      {summary.recommendedTransfers && summary.recommendedTransfers.length > 0 ? (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Actionable Peer-to-Peer Settlement Transfers
              </h3>
            </div>
            <span className="text-xs text-indigo-300 bg-indigo-950/70 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-medium self-start sm:self-auto">
              {summary.recommendedTransfers.length} Direct Transfer{summary.recommendedTransfers.length > 1 ? 's' : ''} to balance all partners
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Player payments were deposited into individual partner UPI/bank accounts. To equalize partner profit entitlements and reimburse out-of-pocket expenses with minimum transactions, execute these direct transfers:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.recommendedTransfers.map((t, idx) => {
              const fromOwner = owners.find((o) => o.id === t.fromOwnerId)
              const toOwner = owners.find((o) => o.id === t.toOwnerId)
              return (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-colors flex flex-col justify-between gap-3 shadow-inner"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm text-slate-200 truncate">
                        {fromOwner?.name || t.fromOwnerId}
                      </span>
                      <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="font-semibold text-sm text-emerald-400 truncate">
                        {toOwner?.name || t.toOwnerId}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-base text-amber-400 shrink-0">
                      {formatINR(t.amountPaise)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-400 truncate">
                      {t.purpose || 'Partner profit settlement'}
                    </span>
                    <button
                      onClick={() => handleOpenForOwner(t.toOwnerId, t.fromOwnerId, t.amountPaise)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors shrink-0"
                    >
                      <span>Record Transfer</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>All peer-to-peer partner profit distributions and cash holdings are fully balanced.</span>
          </div>
        </div>
      )}

      {/* Table Recovery & Festival Reserves Held in Partner Custody */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Table Recovery & Festival Fund Reserves Held in Partner Accounts
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-amber-400">
            {formatINR(summary.tableRecoveryAccumulatedPaise + summary.festivalFundAccumulatedPaise)} Total Reserves
          </span>
        </div>

        <p className="text-xs text-slate-400">
          After distributing earned partner profits, remaining cash collected from players is reserved for Table Recovery and Festival Fund. Here is who currently holds this reserve money:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {owners.map((owner) => {
            const ent = summary.ownerEntitlements[owner.id]
            const reserveHeld = ent?.tableReservesHeldPaise || 0
            return (
              <div key={owner.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-300">{owner.name}</span>
                  <Wallet className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="font-mono font-bold text-base text-slate-100">
                  {formatINR(reserveHeld)}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {reserveHeld > 0 ? 'Holding table reserve funds' : 'No reserve funds held'}
                </span>
              </div>
            )
          })}
          {summary.unassignedCashPaise > 0 && (
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-300">Unassigned / Shared Pool</span>
                <Wallet className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="font-mono font-bold text-base text-amber-400">
                {formatINR(summary.unassignedCashPaise)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Payments recorded without assigned partner
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cumulative Partner Cards (sm:hidden) */}
      <div className="block sm:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Partner Cash Custody & Entitlements
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">4 Partners</span>
        </div>

        {owners.map((owner) => {
          const ent = summary.ownerEntitlements[owner.id]
          const remaining = ent?.remainingEntitlementPaise || 0
          const netCashHeld = ent?.netCashHeldPaise || 0
          const netPosition = ent?.netPositionPaise || 0

          return (
            <div
              key={owner.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                    ♠
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-100">{owner.name}</h4>
                    <span className="text-[10px] text-slate-400">
                      Cash Collected: {formatINR(ent?.cashCollectedPaise || 0)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-sans">Net Cash in Hand</span>
                  <span className="text-sm font-mono font-bold text-slate-100">
                    {formatINR(netCashHeld)}
                  </span>
                </div>
              </div>

              {/* Net Position Callout */}
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  netPosition > 0
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                    : netPosition < 0
                    ? 'bg-purple-950/20 border-purple-500/30 text-purple-300'
                    : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  {netPosition > 0 ? (
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                  ) : netPosition < 0 ? (
                    <TrendingDown className="w-4 h-4 text-purple-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>
                    {netPosition > 0
                      ? 'Net Position: Partner is Owed'
                      : netPosition < 0
                      ? 'Net Position: Holding Excess Table Cash'
                      : 'Net Position: Fully Settled'}
                  </span>
                </div>
                <span className="font-mono font-bold">
                  {formatINR(Math.abs(netPosition))}
                </span>
              </div>

              {/* Shares & Custody Breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 text-center text-xs">
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/50">
                  <span className="text-[10px] text-slate-400 block font-sans">Profit Entitled</span>
                  <span className="font-mono text-slate-200 font-semibold">{formatINR(ent?.grossEntitlementPaise || 0)}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/50">
                  <span className="text-[10px] text-slate-400 block font-sans">Expenses Paid</span>
                  <span className="font-mono text-slate-200 font-semibold">{formatINR(ent?.expensesPaidPaise || 0)}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/50">
                  <span className="text-[10px] text-slate-400 block font-sans">Settled / Taken</span>
                  <span className="font-mono text-emerald-400 font-semibold">{formatINR(ent?.settledPaise || 0)}</span>
                </div>
              </div>

              <button
                onClick={() => handleOpenForOwner(owner.id)}
                className="w-full py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm min-h-[40px]"
              >
                <span>Record Payout / Settlement for {owner.name}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Cumulative Owner Balance & Custody Table for Desktop (hidden sm:block) */}
      <div className="hidden sm:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Cumulative Partner Cash Custody & Entitlement Table
          </h3>
          <span className="text-xs text-slate-500 font-mono">4 Configured Owners</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Partner</th>
                <th className="py-3 px-4 text-right">Cash Collected</th>
                <th className="py-3 px-4 text-right">Expenses Paid</th>
                <th className="py-3 px-4 text-right">Net Cash in Hand</th>
                <th className="py-3 px-4 text-right">Gross Entitlement</th>
                <th className="py-3 px-4 text-right text-emerald-400">Profit Settled</th>
                <th className="py-3 px-4 text-right text-amber-400">Net Position</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {owners.map((owner) => {
                const ent = summary.ownerEntitlements[owner.id]
                const netCashHeld = ent?.netCashHeldPaise || 0
                const netPosition = ent?.netPositionPaise || 0

                return (
                  <tr key={owner.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                        ♠
                      </div>
                      <span>{owner.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {formatINR(ent?.cashCollectedPaise || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {formatINR(ent?.expensesPaidPaise || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                      {formatINR(netCashHeld)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {formatINR(ent?.grossEntitlementPaise || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-400">
                      {formatINR(ent?.settledPaise || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span
                        className={
                          netPosition > 0
                            ? 'text-amber-400'
                            : netPosition < 0
                            ? 'text-purple-400'
                            : 'text-emerald-400'
                        }
                      >
                        {netPosition > 0
                          ? `+${formatINR(netPosition)} (Owed)`
                          : netPosition < 0
                          ? `-${formatINR(Math.abs(netPosition))} (Holding)`
                          : 'Settled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <button
                        onClick={() => handleOpenForOwner(owner.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
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
                      (s, e) => s + (e.cashCollectedPaise || 0),
                      0
                    )
                  )}
                </td>
                <td className="py-3.5 px-4 text-right text-slate-300">
                  {formatINR(
                    Object.values(summary.ownerEntitlements).reduce(
                      (s, e) => s + (e.expensesPaidPaise || 0),
                      0
                    )
                  )}
                </td>
                <td className="py-3.5 px-4 text-right text-slate-100">
                  {formatINR(
                    Object.values(summary.ownerEntitlements).reduce(
                      (s, e) => s + (e.netCashHeldPaise || 0),
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

      {/* Settlement Transactions History */}
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
            No settlement payouts recorded yet. When owners take out their entitled profit or transfer funds P2P, record it using the button above.
          </div>
        ) : (
          <>
            {/* Mobile Payout Cards */}
            <div className="block sm:hidden divide-y divide-slate-800/60">
              {activeSettlements.map((s) => {
                const owner = owners.find((o) => o.id === s.ownerId)
                const payer = owners.find((o) => o.id === s.paidByOwnerId)
                return (
                  <div key={s.id} className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm text-slate-200">{owner?.name || s.ownerId}</span>
                        {payer && (
                          <span className="text-[11px] text-slate-400 block">
                            Paid by: {payer.name}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-sm">{formatINR(s.amountPaise)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{s.notes || 'Settlement'}</span>
                      <span>{formatDateTime(s.settledAt)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Payout Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-medium">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Paid By (Source)</th>
                    <th className="py-3 px-4">Payout Method / Notes</th>
                    <th className="py-3 px-4 text-right font-mono">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {activeSettlements.map((s) => {
                    const owner = owners.find((o) => o.id === s.ownerId)
                    const payer = owners.find((o) => o.id === s.paidByOwnerId)
                    return (
                      <tr key={s.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-400">{formatDateTime(s.settledAt)}</td>
                        <td className="py-3 px-4 font-sans font-semibold text-slate-200">
                          {owner?.name || s.ownerId}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-300">
                          {payer ? payer.name : 'Table Pool / Bank'}
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
          </>
        )}
      </div>

      {isModalOpen && (
        <RecordSettlementModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialOwnerId={selectedOwnerId}
          initialPayerId={selectedPayerId}
          initialAmountPaise={selectedAmountPaise}
        />
      )}

      {isEditOwnersOpen && (
        <EditOwnersModal
          isOpen={isEditOwnersOpen}
          onClose={() => setIsEditOwnersOpen(false)}
        />
      )}

      {isTransferOpen && (
        <AddBucketTransferModal
          isOpen={isTransferOpen}
          onClose={() => setIsTransferOpen(false)}
        />
      )}
    </div>
  )
}
