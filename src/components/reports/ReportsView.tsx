import React from 'react'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR } from '../../lib/accounting/formatters'
import { FileSpreadsheet, Download, Users, TrendingUp, Scale, Dices } from 'lucide-react'

export const ReportsView: React.FC = () => {
  const { summary, owners, players, historicalRake, payments, exportCSV } = useLedger()

  const playerBalances = players.map((p) => {
    const gen = historicalRake
      .filter((h) => h.playerId === p.id && h.status === 'active')
      .reduce((s, h) => s + h.amountPaise, 0)
    const paid = payments
      .filter((pay) => pay.playerId === p.id && pay.status === 'active')
      .reduce((s, pay) => s + pay.amountPaise, 0)
    return {
      name: p.name,
      gen,
      paid,
      out: Math.max(0, gen - paid),
    }
  })

  const owingPlayers = playerBalances.filter((p) => p.out > 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <span>Reports & CSV Data Export</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Financial summaries, player balances, owner payout reports, and CSV backup downloads.
          </p>
        </div>

        <button
          onClick={() => exportCSV('summary')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Summary CSV</span>
        </button>
      </div>

      {/* CSV Export Quick Buttons (Section 43) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
          Download CSV Exports
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => exportCSV('players')}
            className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-semibold text-slate-200">Players</span>
            <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Download className="w-3 h-3" /> balances.csv
            </span>
          </button>

          <button
            onClick={() => exportCSV('games')}
            className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-semibold text-slate-200">Games</span>
            <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Download className="w-3 h-3" /> sessions.csv
            </span>
          </button>

          <button
            onClick={() => exportCSV('payments')}
            className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-semibold text-slate-200">Payments</span>
            <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Download className="w-3 h-3" /> collections.csv
            </span>
          </button>

          <button
            onClick={() => exportCSV('expenses')}
            className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-semibold text-slate-200">Expenses</span>
            <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Download className="w-3 h-3" /> expenses.csv
            </span>
          </button>

          <button
            onClick={() => exportCSV('settlements')}
            className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-semibold text-slate-200">Settlements</span>
            <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Download className="w-3 h-3" /> payouts.csv
            </span>
          </button>

          <button
            onClick={() => exportCSV('summary')}
            className="p-3 bg-slate-950 hover:bg-slate-850 border border-indigo-500/30 rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-semibold text-indigo-300">All Metrics</span>
            <span className="text-[10px] text-indigo-400 mt-1 flex items-center gap-1">
              <Download className="w-3 h-3" /> summary.csv
            </span>
          </button>
        </div>
      </div>

      {/* 4 Reports (Section 42) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report 1: Rake Report */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">1. Overall Rake Status Report</h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between">
              <span className="font-sans text-slate-400">Total Rake Generated:</span>
              <span className="font-bold text-slate-100">
                {formatINR(summary.totalRakeGeneratedPaise)}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between">
              <span className="font-sans text-slate-400">Total Rake Collected:</span>
              <span className="font-bold text-emerald-400">
                {formatINR(summary.totalRakeCollectedPaise)}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between">
              <span className="font-sans text-slate-400">Outstanding Balance:</span>
              <span className="font-bold text-amber-400">
                {formatINR(summary.totalOutstandingPaise)}
              </span>
            </div>
          </div>
        </div>

        {/* Report 2: Player Aging / Owed Money */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100">2. Player Owed Rake Report</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {owingPlayers.length} players owe money
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {owingPlayers.map((p, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-slate-200">{p.name}</span>
                <span className="font-mono font-bold text-amber-400">{formatINR(p.out)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Report 3: Owner Report */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">3. Owner Payout Report</h3>
          </div>
          <div className="space-y-2 text-xs">
            {owners.map((o) => {
              const ent = summary.ownerEntitlements[o.id]
              return (
                <div
                  key={o.id}
                  className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between font-mono"
                >
                  <span className="font-sans font-semibold text-slate-200">{o.name}</span>
                  <div className="text-right space-x-3">
                    <span className="text-slate-400">
                      Entitled: {formatINR(ent?.grossEntitlementPaise || 0)}
                    </span>
                    <span className="text-emerald-400">
                      Settled: {formatINR(ent?.settledPaise || 0)}
                    </span>
                    <span className="font-bold text-amber-400">
                      Due: {formatINR(ent?.remainingEntitlementPaise || 0)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Report 4: Monthly Financial Pipeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Dices className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-slate-100">4. Financial Pipeline Report</h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between">
              <span className="font-sans text-slate-400">Gross Rake:</span>
              <span className="text-slate-100 font-bold">
                {formatINR(summary.totalRakeGeneratedPaise)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between">
              <span className="font-sans text-slate-400">Session Expenses Deducted:</span>
              <span className="text-rose-400 font-bold">
                - {formatINR(summary.totalSessionExpensesPaise)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between">
              <span className="font-sans text-slate-400">Table Cost Recovery:</span>
              <span className="text-amber-400 font-bold">
                {formatINR(summary.tableRecoveryAccumulatedPaise)} / {formatINR(summary.tableRecoveryTargetPaise)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between">
              <span className="font-sans text-slate-400">Festival Reserve:</span>
              <span className="text-purple-400 font-bold">
                {formatINR(summary.festivalFundAccumulatedPaise)} / {formatINR(summary.festivalFundTargetPaise)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between">
              <span className="font-sans text-slate-400">Distributable Owner Profit:</span>
              <span className="text-emerald-400 font-bold">
                {formatINR(summary.totalDistributableRakePaise)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
