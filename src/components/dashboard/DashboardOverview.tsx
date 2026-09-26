import React, { useState } from 'react'
import {
  TrendingUp,
  Wallet,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  Activity,
  ArrowRightLeft,
} from 'lucide-react'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR, formatDate } from '../../lib/accounting/formatters'
import { StatCard } from '../common/StatCard'
import { AddBucketTransferModal } from '../settlements/AddBucketTransferModal'
import { RecordSettlementModal } from '../settlements/RecordSettlementModal'

interface DashboardOverviewProps {
  onNavigateToGames: () => void
  onNavigateToPlayers: () => void
  onNavigateToSettlements: () => void
  onOpenAddGame: () => void
  onOpenQuickRake: () => void
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateToGames,
  onNavigateToPlayers,
  onNavigateToSettlements,
  onOpenAddGame,
  onOpenQuickRake,
}) => {
  const { summary, owners, games, historicalRake } = useLedger()
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [settlementTarget, setSettlementTarget] = useState<{
    isOpen: boolean
    ownerId?: string
    payerId?: string
    amountPaise?: number
  }>({ isOpen: false })

  const tablePercent = Math.min(
    100,
    Math.round((summary.tableRecoveryAccumulatedPaise / summary.tableRecoveryTargetPaise) * 100)
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Accounting Guarantee */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              summary.reconciled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            {summary.reconciled ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                {summary.reconciled
                  ? 'Ledger Balanced to the Exact Paise'
                  : 'Ledger Discrepancy Detected'}
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Pure Integer Precision
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Every rupee accounted for: Table Reimbursement + Profit + Festival Jar = Total Fees (Diff: {formatINR(summary.reconciliationDiffPaise)}).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reallocate Funds</span>
          </button>
          <button
            onClick={onOpenQuickRake}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            + Quick Fee
          </button>
          <button
            onClick={onOpenAddGame}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            + New Session
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Rake Generated */}
        <StatCard
          title="Total Fees Generated"
          amount={formatINR(summary.totalRakeGeneratedPaise)}
          subtitle="Total member session dues and recorded contributions"
          badge={{ text: 'Generated', variant: 'indigo' }}
          icon={<TrendingUp className="w-5 h-5" />}
        />

        {/* Total Fees Collected */}
        <StatCard
          title="Total Fees Collected"
          amount={formatINR(summary.totalRakeCollectedPaise)}
          subtitle="Actual payments received from members to date"
          badge={{ text: 'Collected', variant: 'emerald' }}
          icon={<Wallet className="w-5 h-5" />}
        />

        {/* Pending from Players */}
        <StatCard
          title="Pending from Players"
          amount={formatINR(summary.totalOutstandingPaise)}
          subtitle="Pending contributions across all active members"
          badge={{
            text: summary.totalOutstandingPaise > 0 ? 'Pending Collection' : 'Zero Due',
            variant: summary.totalOutstandingPaise > 0 ? 'amber' : 'emerald',
          }}
          icon={<Clock className="w-5 h-5" />}
        />

        {/* Table Recovery */}
        <StatCard
          title="Table Recovery"
          amount={`${formatINR(summary.tableRecoveryAccumulatedPaise)} / ${formatINR(
            summary.tableRecoveryTargetPaise
          )}`}
          subtitle={`Remaining to reimburse 4 organizers: ${formatINR(summary.tableRecoveryRemainingPaise)}`}
          badge={{
            text: summary.isTableRecoveryComplete ? '100% Recovered' : `${tablePercent}% Recovered`,
            variant: summary.isTableRecoveryComplete ? 'emerald' : 'amber',
          }}
          progress={{
            current: summary.tableRecoveryAccumulatedPaise,
            target: summary.tableRecoveryTargetPaise,
            label: 'Table Cost Reimbursed to 4 Owners',
          }}
          icon={<ShieldCheck className="w-5 h-5" />}
        />

        {/* Festival Jar (Open Jar - No Target Bar) */}
        <StatCard
          title="Festival Jar"
          amount={formatINR(summary.festivalFundAccumulatedPaise)}
          subtitle="Open community kitty for festival parties & events"
          badge={{
            text: 'Community Kitty',
            variant: 'purple',
          }}
          icon={<Sparkles className="w-5 h-5" />}
        />

        {/* Total Profit */}
        <StatCard
          title="Total Profit"
          amount={formatINR(summary.totalDistributableRakePaise)}
          subtitle={
            summary.totalDistributableRakePaise > 0
              ? 'Split equally 4 ways (25% each)'
              : 'Activates after ₹65,000 table is 100% reimbursed'
          }
          badge={{
            text: summary.totalDistributableRakePaise > 0 ? 'Ready to Distribute' : 'After Table Recovery',
            variant: summary.totalDistributableRakePaise > 0 ? 'emerald' : 'slate',
          }}
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* Who Owes Whom Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              <span>Who Owes Whom</span>
              {summary.recommendedTransfers.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {summary.recommendedTransfers.length} Pending
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct peer-to-peer transfers needed so all 4 organizers are 100% square.
            </p>
          </div>
          <button
            onClick={onNavigateToSettlements}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 shrink-0"
          >
            <span>Settlement History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {summary.recommendedTransfers.length === 0 ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-300">
              <span className="font-semibold">All Organizers are Square!</span> Everyone is settled up, no pending transfers.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.recommendedTransfers.map((t, idx) => {
              const fromOwner = owners.find((o) => o.id === t.fromOwnerId)
              const toOwner = owners.find((o) => o.id === t.toOwnerId)
              return (
                <div
                  key={`${t.fromOwnerId}-${t.toOwnerId}-${idx}`}
                  className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-slate-300 flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-amber-300">{fromOwner?.name || 'Organizer'}</span>
                      <span className="text-slate-500">owes</span>
                      <span className="font-bold text-emerald-300">{toOwner?.name || 'Organizer'}</span>
                    </div>
                    <div className="text-base font-bold font-mono text-slate-100 mt-1">
                      {formatINR(t.amountPaise)}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setSettlementTarget({
                        isOpen: true,
                        ownerId: t.toOwnerId,
                        payerId: t.fromOwnerId,
                        amountPaise: t.amountPaise,
                      })
                    }
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0 shadow-sm"
                  >
                    1-Tap Settle
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Visual Money Waterfall */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>How Every Rupee Flows</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simple 5-step flow from total fees to each organizer's pocket
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
            Chronological Processing
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Step 1: Gross Fees */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              1. Total Fees
            </span>
            <div className="my-2">
              <div className="text-lg font-bold text-slate-100">
                {formatINR(summary.totalRakeGeneratedPaise)}
              </div>
              <div className="text-[11px] text-slate-500">
                {games.filter((g) => g.status === 'active').length} sessions + {historicalRake.filter((h) => h.status === 'active').length} entries
              </div>
            </div>
            <div className="text-[10px] text-indigo-400">Total recorded</div>
          </div>

          {/* Step 2: Session Expenses */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              2. Host Expenses
            </span>
            <div className="my-2">
              <div className="text-lg font-bold text-rose-400">
                - {formatINR(summary.totalSessionExpensesPaise)}
              </div>
              <div className="text-[11px] text-slate-500">Reimbursed to host</div>
            </div>
            <div className="text-[10px] text-rose-400/80">Expenses deducted first</div>
          </div>

          {/* Step 3: Table Recovery */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              3. Table Recovery
            </span>
            <div className="my-2">
              <div className="text-lg font-bold text-amber-400">
                {formatINR(summary.tableRecoveryAccumulatedPaise)}
              </div>
              <div className="text-[11px] text-slate-500">
                Target: {formatINR(summary.tableRecoveryTargetPaise)}
              </div>
            </div>
            <div className="text-[10px] text-amber-400/80">
              {summary.isTableRecoveryComplete ? '✓ 100% Recovered' : `${tablePercent}% complete (25% each)`}
            </div>
          </div>

          {/* Step 4: Festival Jar */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              4. Festival Jar
            </span>
            <div className="my-2">
              <div className="text-lg font-bold text-purple-400">
                {formatINR(summary.festivalFundAccumulatedPaise)}
              </div>
              <div className="text-[11px] text-slate-500">
                Open Community Kitty
              </div>
            </div>
            <div className="text-[10px] text-purple-400/80">
              Kept for parties & events
            </div>
          </div>

          {/* Step 5: Profit */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              5. Total Profit
            </span>
            <div className="my-2">
              <div className="text-lg font-bold text-emerald-400">
                {formatINR(summary.totalDistributableRakePaise)}
              </div>
              <div className="text-[11px] text-slate-500">Above ₹65,000 Table</div>
            </div>
            <div className="text-[10px] text-emerald-400/80">Split 4 ways equally</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Organizer Balances & Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Organizer Entitlement Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Organizer Balances & Shares</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  25% of table recovery reimbursement + 25% of profit
                </p>
              </div>
              <button
                onClick={onNavigateToSettlements}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
              >
                <span>Full Settlements</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-medium">
                    <th className="py-2.5">Organizer</th>
                    <th className="py-2.5 text-right">Table Share</th>
                    <th className="py-2.5 text-right">Profit Share</th>
                    <th className="py-2.5 text-right">Total Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {owners.map((owner) => {
                    const ent = summary.ownerEntitlements[owner.id]
                    const tableShare = Math.floor(summary.tableRecoveryAccumulatedPaise / 4)
                    const profitShare = (ent?.equalSharePaise || 0) + (ent?.excessSharePaise || 0)
                    return (
                      <tr key={owner.id} className="hover:bg-slate-800/30">
                        <td className="py-3 font-sans font-medium text-slate-200">{owner.name}</td>
                        <td className="py-3 text-right text-amber-400">
                          {formatINR(tableShare)}
                        </td>
                        <td className="py-3 text-right text-slate-400">
                          {formatINR(profitShare)}
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-400">
                          {formatINR(ent?.grossEntitlementPaise || 0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-800 font-bold text-xs">
                    <td className="py-3 font-sans text-slate-300">Total</td>
                    <td className="py-3 text-right font-mono text-amber-400">
                      {formatINR(summary.tableRecoveryAccumulatedPaise)}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-300">
                      {formatINR(summary.totalDistributableRakePaise)}
                    </td>
                    <td className="py-3 text-right font-mono text-emerald-400">
                      {formatINR(summary.totalOwnerEntitlementPaise)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-2.5">
              {owners.map((owner) => {
                const ent = summary.ownerEntitlements[owner.id]
                const gross = ent?.grossEntitlementPaise || 0
                const tableShare = Math.floor(summary.tableRecoveryAccumulatedPaise / 4)
                const profitShare = (ent?.equalSharePaise || 0) + (ent?.excessSharePaise || 0)
                return (
                  <div
                    key={owner.id}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 text-sm">{owner.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 space-x-1.5 font-mono">
                        <span className="text-amber-400">Table: {formatINR(tableShare)}</span>
                        <span>·</span>
                        <span>Profit: {formatINR(profitShare)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        {formatINR(gross)}
                      </div>
                      <span className="text-[10px] text-slate-400">Total Share</span>
                    </div>
                  </div>
                )
              })}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold px-1">
                <span className="text-slate-400">Total Organizer Pool:</span>
                <span className="text-emerald-400 font-mono text-sm">
                  {formatINR(summary.totalOwnerEntitlementPaise)}
                </span>
              </div>
            </div>
          </div>

          {summary.tableRecoveryRemainingPaise > 0 && (
            <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs text-slate-400 flex items-center gap-2">
              <span className="text-amber-400 font-bold">ℹ</span>
              <span>
                Table recovery is reimbursing all 4 organizers ({formatINR(summary.tableRecoveryAccumulatedPaise)} of {formatINR(summary.tableRecoveryTargetPaise)} recovered). Full profit distribution activates once the table is 100% reimbursed.
              </span>
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span>Recent Sessions</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Chronologically recorded club sessions</p>
              </div>
              <button
                onClick={onNavigateToGames}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
              >
                <span>View All Sessions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {summary.gameResults.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg">
                <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-300 font-medium">No sessions recorded yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Previous fee entries ({formatINR(52650 * 100)}) are tracked in the recovery pipeline. New sessions with attendance can be entered above.
                </p>
                <button
                  onClick={onOpenAddGame}
                  className="mt-4 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Record First Session
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.gameResults.slice(-4).reverse().map((g) => (
                  <div
                    key={g.gameId}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">
                          Session #{g.gameNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {formatDate(g.playedAt)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Gross: {formatINR(g.grossRakePaise)} · Expenses: {formatINR(g.totalExpensePaise)} · Net: {formatINR(g.netRakePaise)}
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      {g.distributableRakePaise > 0 ? (
                        <span className="font-bold text-emerald-400">
                          {formatINR(g.distributableRakePaise)} dist.
                        </span>
                      ) : (
                        <span className="text-amber-400">
                          {formatINR(g.tableRecoveryAllocatedPaise || g.festivalFundAllocatedPaise)} to target
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Previous Fee Entries: {historicalRake.length}</span>
            <button
              onClick={onNavigateToPlayers}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View Members →
            </button>
          </div>
        </div>
      </div>

      {isTransferOpen && (
        <AddBucketTransferModal
          isOpen={isTransferOpen}
          onClose={() => setIsTransferOpen(false)}
        />
      )}

      {settlementTarget.isOpen && (
        <RecordSettlementModal
          isOpen={settlementTarget.isOpen}
          onClose={() => setSettlementTarget({ isOpen: false })}
          initialOwnerId={settlementTarget.ownerId}
          initialPayerId={settlementTarget.payerId}
          initialAmountPaise={settlementTarget.amountPaise}
        />
      )}
    </div>
  )
}
