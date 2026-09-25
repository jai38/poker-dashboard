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
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'

export const OwnerSettlementView: React.FC = () => {
  const {
    owners,
    summary,
    settlements,
    payments,
    players,
    updatePaymentCollector,
    assignAllUnassignedPayments,
  } = useLedger()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditOwnersOpen, setIsEditOwnersOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | undefined>(undefined)
  const [selectedPayerId, setSelectedPayerId] = useState<string | undefined>(undefined)
  const [selectedAmountPaise, setSelectedAmountPaise] = useState<number | undefined>(undefined)
  const [activeTxTab, setActiveTxTab] = useState<'inflows' | 'settlements'>('inflows')
  const [quickAssignOwnerId, setQuickAssignOwnerId] = useState<string>(owners[0]?.id || '')
  const [isAssigning, setIsAssigning] = useState(false)

  const handleBatchAssignUnassigned = async () => {
    if (!quickAssignOwnerId) return
    setIsAssigning(true)
    try {
      await assignAllUnassignedPayments(quickAssignOwnerId)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleOpenForOwner = (ownerId?: string, payerId?: string, amountPaise?: number) => {
    setSelectedOwnerId(ownerId)
    setSelectedPayerId(payerId)
    setSelectedAmountPaise(amountPaise)
    setIsModalOpen(true)
  }

  const activeSettlements = [...settlements]
    .filter((s) => s.status === 'active')
    .sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime())

  const activePayments = [...payments]
    .filter((p) => p.status === 'active')
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            <span>Organizer Settlements, Cash Custody & Entitlements</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tracks physical cash collected in organizer accounts vs. pool entitlements, out-of-pocket expenses, and actionable peer-to-peer transfers.
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
            <span>Edit Organizer Names</span>
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
                ? 'Exact Reconciliation: Distributable Pool === Organizer Entitlements'
                : 'Reconciliation Mismatch'}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Total Distributable Pool ({formatINR(summary.totalDistributableRakePaise)}) = Total Organizer Entitlements ({formatINR(summary.totalOwnerEntitlementPaise)}). Diff: {formatINR(summary.reconciliationDiffPaise)}.
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
              {summary.recommendedTransfers.length} Direct Transfer{summary.recommendedTransfers.length > 1 ? 's' : ''} to balance all organizers
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Member payments were deposited into individual organizer UPI/bank accounts. To equalize organizer pool entitlements and reimburse out-of-pocket expenses with minimum transactions, execute these direct transfers:
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
                      {t.purpose || 'Organizer pool settlement'}
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
            <span>All peer-to-peer organizer pool distributions and cash holdings are fully balanced.</span>
          </div>
        </div>
      )}

      {/* Organizer Cash Custody & Holdings Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Cash in Hand & Organizer Holdings Custody
              </h3>
              <p className="text-xs text-slate-400">
                Actual cash and UPI funds collected from members currently held by each organizer vs. reserve allocations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsTransferOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shadow-sm transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span>Allocate / Distribute Holdings</span>
            </button>
          </div>
        </div>

        {/* Global Holdings Overview Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs font-mono">
          <div>
            <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider block">
              Total Cash Collected in Custody
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-400">
              {formatINR(summary.totalRakeCollectedPaise)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider block">
              Equipment Reserve (Table Share)
            </span>
            <span className="text-sm sm:text-base font-bold text-indigo-300">
              {formatINR(summary.tableRecoveryAccumulatedPaise)}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider block">
              Event Fund (Festival Reserve)
            </span>
            <span className="text-sm sm:text-base font-bold text-amber-300">
              {formatINR(summary.festivalFundAccumulatedPaise)}
            </span>
          </div>
        </div>

        {/* Organizer Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {owners.map((owner) => {
            const ent = summary.ownerEntitlements[owner.id]
            const cashCollected = ent?.cashCollectedPaise || 0
            const netCashHeld = ent?.netCashHeldPaise || 0
            const reserveHeld = ent?.tableReservesHeldPaise || 0

            return (
              <div
                key={owner.id}
                className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between gap-3 shadow-inner"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px]">
                        {owner.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-200">{owner.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                        netCashHeld > 0
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}
                    >
                      {netCashHeld > 0 ? 'Holding Cash' : 'Balanced'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">
                        Net Cash in Hand
                      </span>
                      <div className="font-mono font-bold text-base text-slate-100 flex items-center gap-1">
                        <span className={netCashHeld > 0 ? 'text-emerald-400' : 'text-slate-200'}>
                          {formatINR(netCashHeld)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                      <span>Total Collected:</span>
                      <span className="font-mono text-slate-300">{formatINR(cashCollected)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Reserve Custody:</span>
                      <span className="font-mono text-amber-300/90">{formatINR(reserveHeld)}</span>
                    </div>
                  </div>
                </div>

                {netCashHeld > 0 && (
                  <button
                    onClick={() => setIsTransferOpen(true)}
                    className="w-full mt-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Allocate / Share</span>
                  </button>
                )}
              </div>
            )
          })}

          {summary.unassignedCashPaise > 0 && (
            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-amber-500/30 flex flex-col justify-between gap-3 shadow-inner">
              <div>
                <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-slate-800/60">
                  <span className="font-semibold text-amber-300">Unassigned / Direct Bank</span>
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">
                    Unassigned Cash
                  </span>
                  <div className="font-mono font-bold text-base text-amber-400">
                    {formatINR(summary.unassignedCashPaise)}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Payments recorded without specific organizer tag
                  </span>
                </div>
              </div>

              {/* Quick Assign to Organizer */}
              <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                <label className="text-[10px] text-slate-300 font-medium block">
                  Assign this cash to:
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={quickAssignOwnerId}
                    onChange={(e) => setQuickAssignOwnerId(e.target.value)}
                    className="flex-1 px-2 py-1 text-[11px] bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBatchAssignUnassigned}
                    disabled={isAssigning}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors shrink-0 shadow-sm disabled:opacity-50"
                  >
                    {isAssigning ? 'Saving...' : 'Assign'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cumulative Organizer Cards (sm:hidden) */}
      <div className="block sm:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Organizer Cash Custody & Entitlements
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">4 Organizers</span>
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
                    {owner.name.charAt(0).toUpperCase()}
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
                      ? 'Net Position: Organizer is Owed'
                      : netPosition < 0
                      ? 'Net Position: Holding Excess Activity Cash'
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
                  <span className="text-[10px] text-slate-400 block font-sans">Pool Entitled</span>
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

        {summary.unassignedCashPaise > 0 && (
          <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                <h4 className="font-semibold text-sm text-amber-300">Unassigned / Direct Bank</h4>
              </div>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {formatINR(summary.unassignedCashPaise)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Payments recorded without specific organizer tag.
            </p>
            <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2">
              <select
                value={quickAssignOwnerId}
                onChange={(e) => setQuickAssignOwnerId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
              >
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    Assign to {o.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBatchAssignUnassigned}
                disabled={isAssigning}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
              >
                {isAssigning ? 'Saving...' : 'Assign'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cumulative Organizer Balance & Custody Table for Desktop (hidden sm:block) */}
      <div className="hidden sm:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Cumulative Organizer Cash Custody & Entitlement Table
          </h3>
          <span className="text-xs text-slate-500 font-mono">4 Configured Organizers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Organizer</th>
                <th className="py-3 px-4 text-right">Cash Collected</th>
                <th className="py-3 px-4 text-right">Expenses Paid</th>
                <th className="py-3 px-4 text-right">Net Cash in Hand</th>
                <th className="py-3 px-4 text-right">Gross Entitlement</th>
                <th className="py-3 px-4 text-right text-emerald-400">Pool Settled</th>
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
                        {owner.name.charAt(0).toUpperCase()}
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

      {/* Transaction & Inflow Records */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Transaction & Cash Flow Records
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Review incoming member collections received into organizer custody alongside inter-organizer settlement payouts.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTxTab('inflows')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
                activeTxTab === 'inflows'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Member Collections (Inflows)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-500/30 font-mono text-emerald-400">
                {activePayments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTxTab('settlements')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
                activeTxTab === 'settlements'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
              <span>Organizer Settlements & P2P</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-950 border border-indigo-500/30 font-mono text-indigo-400">
                {activeSettlements.length}
              </span>
            </button>
          </div>
        </div>

        {activeTxTab === 'inflows' ? (
          activePayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No member payment collections recorded yet. When members pay fees or historical dues, record them under Members &gt; Record Payment, specifying which organizer received the funds.
            </div>
          ) : (
            <>
              {/* Mobile Member Collections Cards */}
              <div className="block sm:hidden divide-y divide-slate-800/60">
                {activePayments.map((p) => {
                  const player = players.find((pl) => pl.id === p.playerId)
                  return (
                    <div key={p.id} className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-200">
                          {player?.name || 'Member'}
                        </span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          +{formatINR(p.amountPaise)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 mt-1">
                        <span>Collected by:</span>
                        <select
                          value={p.receivedByOwnerId || ''}
                          onChange={(e) => updatePaymentCollector(p.id, e.target.value || undefined)}
                          className="px-2 py-0.5 text-[11px] bg-slate-900 border border-slate-800 rounded text-indigo-300 font-medium focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">Direct / Bank (Unassigned)</option>
                          {owners.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{p.notes || 'Member payment'}</span>
                        <span>{formatDateTime(p.paidAt)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Member Collections Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-medium">
                      <th className="py-3 px-4">Date &amp; Time</th>
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4">Collected By (Cash Custody)</th>
                      <th className="py-3 px-4">Notes / Details</th>
                      <th className="py-3 px-4 text-right font-mono">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {activePayments.map((p) => {
                      const player = players.find((pl) => pl.id === p.playerId)
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 text-slate-400">{formatDateTime(p.paidAt)}</td>
                          <td className="py-3 px-4 font-sans font-semibold text-slate-200">
                            {player?.name || 'Member'}
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <select
                              value={p.receivedByOwnerId || ''}
                              onChange={(e) => updatePaymentCollector(p.id, e.target.value || undefined)}
                              className="px-2.5 py-1 text-[11px] bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 hover:border-slate-700 cursor-pointer font-sans"
                            >
                              <option value="">Direct / Bank (Unassigned)</option>
                              {owners.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name} (Cash in Hand)
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-sans">{p.notes || 'Member payment'}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-400">
                            +{formatINR(p.amountPaise)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          activeSettlements.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No settlement payouts recorded yet. When organizers take out their entitled pool funds or transfer funds P2P, record it using the button above.
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
                        <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 text-slate-400">{formatDateTime(s.settledAt)}</td>
                          <td className="py-3 px-4 font-sans font-semibold text-slate-200">
                            {owner?.name || s.ownerId}
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-300">
                            {payer ? payer.name : 'Activity Pool / Bank'}
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
          )
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
