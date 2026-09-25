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

  const tablePercent = Math.min(
    100,
    Math.round((summary.tableRecoveryAccumulatedPaise / summary.tableRecoveryTargetPaise) * 100)
  )

  const festivalPercent = Math.min(
    100,
    Math.round((summary.festivalFundAccumulatedPaise / summary.festivalFundTargetPaise) * 100)
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
              Distributable balance matches sum of organizer entitlements exactly (Diff: {formatINR(summary.reconciliationDiffPaise)}).
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
        {/* Total Fees Generated */}
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

        {/* Outstanding Dues */}
        <StatCard
          title="Outstanding Dues"
          amount={formatINR(summary.totalOutstandingPaise)}
          subtitle="Pending contributions across all active members"
          badge={{
            text: summary.totalOutstandingPaise > 0 ? 'Pending Collection' : 'Zero Due',
            variant: summary.totalOutstandingPaise > 0 ? 'amber' : 'emerald',
          }}
          icon={<Clock className="w-5 h-5" />}
        />

        {/* Equipment Reserve */}
        <StatCard
          title="Equipment Reserve"
          amount={`${formatINR(summary.tableRecoveryAccumulatedPaise)} / ${formatINR(
            summary.tableRecoveryTargetPaise
          )}`}
          subtitle={`Remaining: ${formatINR(summary.tableRecoveryRemainingPaise)}`}
          badge={{
            text: summary.isTableRecoveryComplete ? 'Target Reached' : 'In Progress',
            variant: summary.isTableRecoveryComplete ? 'emerald' : 'amber',
          }}
          progress={{
            current: summary.tableRecoveryAccumulatedPaise,
            target: summary.tableRecoveryTargetPaise,
            label: 'Equipment Cost Recovered',
          }}
          icon={<ShieldCheck className="w-5 h-5" />}
        />

        {/* Event Fund */}
        <StatCard
          title="Event Fund"
          amount={`${formatINR(summary.festivalFundAccumulatedPaise)} / ${formatINR(
            summary.festivalFundTargetPaise
          )}`}
          subtitle={`Remaining: ${formatINR(summary.festivalFundRemainingPaise)}`}
          badge={{
            text: summary.isFestivalFundComplete ? 'Target Reached' : 'Reserved',
            variant: summary.isFestivalFundComplete ? 'emerald' : 'purple',
          }}
          progress={{
            current: summary.festivalFundAccumulatedPaise,
            target: summary.festivalFundTargetPaise,
            label: 'Event Target Reserve',
          }}
          icon={<Sparkles className="w-5 h-5" />}
        />

        {/* Distributable Balance */}
        <StatCard
          title="Distributable Balance"
          amount={formatINR(summary.totalDistributableRakePaise)}
          subtitle="Net balance available after reserve & event targets are met"
          badge={{
            text: summary.totalDistributableRakePaise > 0 ? 'Available for Distribution' : 'Reserve Funding First',
            variant: summary.totalDistributableRakePaise > 0 ? 'emerald' : 'slate',
          }}
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* Visual Money Waterfall */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>Financial Waterfall & Pipeline</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological flow from gross session fees through session expenses, recovery targets, and organizer shares
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
              1. Gross Fees
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
              2. Session Expenses
            </span>
            <div className="my-2">
              <div className="text-lg font-bold text-rose-400">
                - {formatINR(summary.totalSessionExpensesPaise)}
              </div>
              <div className="text-[11px] text-slate-500">Deducted at session level</div>
            </div>
            <div className="text-[10px] text-rose-400/80">Expenses cannot make net &lt; 0</div>
          </div>

          {/* Step 3: Equipment Reserve */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              3. Equipment Reserve
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
              {summary.isTableRecoveryComplete ? '✓ 100% Recovered' : `${tablePercent}% complete`}
            </div>
          </div>

          {/* Step 4: Event Fund */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              4. Event Fund
            </span>
            <div className="my-2">
              <div className="text-lg font-bold text-purple-400">
                {formatINR(summary.festivalFundAccumulatedPaise)}
              </div>
              <div className="text-[11px] text-slate-500">
                Target: {formatINR(summary.festivalFundTargetPaise)}
              </div>
            </div>
            <div className="text-[10px] text-purple-400/80">
              {summary.isFestivalFundComplete ? '✓ 100% Reserved' : `${festivalPercent}% complete`}
            </div>
          </div>

          {/* Step 5: Distributable */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              5. Distributable
            </span>
            <div className="my-2">
              <div className="text-lg font-bold text-emerald-400">
                {formatINR(summary.totalDistributableRakePaise)}
              </div>
              <div className="text-[11px] text-slate-500">4 Organizers Attendance</div>
            </div>
            <div className="text-[10px] text-emerald-400/80">₹1,000 equal + 10% absent</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Organizer Entitlements & Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Organizer Entitlement Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Organizer Entitlements</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated from distributable sessions using attendance distribution
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
                    <th className="py-2.5 text-right">Equal Share</th>
                    <th className="py-2.5 text-right">Excess Share</th>
                    <th className="py-2.5 text-right">Total Entitlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {owners.map((owner) => {
                    const ent = summary.ownerEntitlements[owner.id]
                    return (
                      <tr key={owner.id} className="hover:bg-slate-800/30">
                        <td className="py-3 font-sans font-medium text-slate-200">{owner.name}</td>
                        <td className="py-3 text-right text-slate-400">
                          {formatINR(ent?.equalSharePaise || 0)}
                        </td>
                        <td className="py-3 text-right text-slate-400">
                          {formatINR(ent?.excessSharePaise || 0)}
                        </td>
                        <td className="py-3 text-right font-bold text-slate-100">
                          {formatINR(ent?.grossEntitlementPaise || 0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-800 font-bold text-xs">
                    <td className="py-3 font-sans text-slate-300">Total</td>
                    <td className="py-3 text-right font-mono text-slate-300">
                      {formatINR(
                        Object.values(summary.ownerEntitlements).reduce(
                          (s, e) => s + e.equalSharePaise,
                          0
                        )
                      )}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-300">
                      {formatINR(
                        Object.values(summary.ownerEntitlements).reduce(
                          (s, e) => s + e.excessSharePaise,
                          0
                        )
                      )}
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
                return (
                  <div
                    key={owner.id}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 text-sm">{owner.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 space-x-1.5 font-mono">
                        <span>Eq: {formatINR(ent?.equalSharePaise || 0)}</span>
                        <span>·</span>
                        <span>Ex: {formatINR(ent?.excessSharePaise || 0)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        {formatINR(gross)}
                      </div>
                      <span className="text-[10px] text-slate-400">Total Entitled</span>
                    </div>
                  </div>
                )
              })}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold px-1">
                <span className="text-slate-400">Total Entitlement:</span>
                <span className="text-emerald-400 font-mono text-sm">
                  {formatINR(summary.totalOwnerEntitlementPaise)}
                </span>
              </div>
            </div>
          </div>

          {summary.totalDistributableRakePaise === 0 && (
            <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs text-slate-400 flex items-center gap-2">
              <span className="text-amber-400 font-bold">ℹ</span>
              <span>
                Distribution activates once Equipment Reserve ({formatINR(summary.tableRecoveryTargetPaise)}) and Event Fund ({formatINR(summary.festivalFundTargetPaise)}) targets are fulfilled.
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
    </div>
  )
}
