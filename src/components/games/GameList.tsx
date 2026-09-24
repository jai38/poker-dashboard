import React, { useState } from 'react'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatINR, formatDate, formatDateTime } from '../../lib/accounting/formatters'
import { GameRecord } from '../../lib/accounting/types'
import { GameDetailsModal } from './GameDetailsModal'
import { Dices, PlusCircle, Eye, Ban, Calendar, AlertCircle } from 'lucide-react'

interface GameListProps {
  onOpenAddGame: () => void
}

export const GameList: React.FC<GameListProps> = ({ onOpenAddGame }) => {
  const { games, summary, owners } = useLedger()
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'voided'>('all')

  const filteredGames = games
    .filter((g) => {
      if (filter === 'active') return g.status === 'active'
      if (filter === 'voided') return g.status === 'voided'
      return true
    })
    .slice()
    .reverse() // Most recent first

  const selectedResult = selectedGame
    ? summary.gameResults.find((r) => r.gameId === selectedGame.id)
    : undefined

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Dices className="w-5 h-5 text-indigo-400" />
            <span>Poker Games & Sessions</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Chronological games with gross rake, session expenses, owner attendance, and resulting waterfall payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({games.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filter === 'active'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({games.filter((g) => g.status === 'active').length})
            </button>
            <button
              onClick={() => setFilter('voided')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filter === 'voided'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Voided ({games.filter((g) => g.status === 'voided').length})
            </button>
          </div>

          <button
            onClick={onOpenAddGame}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Game</span>
          </button>
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-xl">
          <Dices className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No games found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {filter === 'voided'
              ? 'No voided games recorded. Active games can be voided with a required reason if entered in error.'
              : 'Record new poker sessions to calculate session expenses, recovery progress, and owner distribution.'}
          </p>
          {filter !== 'voided' && (
            <button
              onClick={onOpenAddGame}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Record First Game
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredGames.map((game) => {
            const isVoided = game.status === 'voided'
            const calc = summary.gameResults.find((r) => r.gameId === game.id)

            return (
              <div
                key={game.id}
                className={`bg-slate-900 border rounded-xl p-5 transition-all shadow-sm ${
                  isVoided
                    ? 'border-rose-900/40 bg-rose-950/10 opacity-75'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-sm text-indigo-400">
                      #{game.gameNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100">
                          Game #{game.gameNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isVoided
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isVoided ? 'Voided' : 'Active'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDateTime(game.playedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedGame(game)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details & Breakdown</span>
                    </button>
                  </div>
                </div>

                {isVoided && game.voidReason && (
                  <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
                    <span className="font-semibold text-rose-400">Void Reason: </span>
                    {game.voidReason}
                  </div>
                )}

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4 text-xs font-mono">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase font-sans text-slate-400 block mb-0.5">
                      Gross Rake
                    </span>
                    <span className="font-bold text-slate-100 text-sm">
                      {formatINR(game.grossRakePaise)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase font-sans text-slate-400 block mb-0.5">
                      Expenses
                    </span>
                    <span className="font-bold text-rose-400 text-sm">
                      - {formatINR(calc?.totalExpensePaise || 0)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase font-sans text-slate-400 block mb-0.5">
                      Net Rake
                    </span>
                    <span className="font-bold text-slate-100 text-sm">
                      {formatINR(calc?.netRakePaise || 0)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase font-sans text-slate-400 block mb-0.5">
                      Table Recovery
                    </span>
                    <span className="font-bold text-amber-400 text-sm">
                      {formatINR(calc?.tableRecoveryAllocatedPaise || 0)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase font-sans text-slate-400 block mb-0.5">
                      Festival Fund
                    </span>
                    <span className="font-bold text-purple-400 text-sm">
                      {formatINR(calc?.festivalFundAllocatedPaise || 0)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase font-sans text-slate-400 block mb-0.5">
                      Distributable
                    </span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {formatINR(calc?.distributableRakePaise || 0)}
                    </span>
                  </div>
                </div>

                {/* Owner Attendance & Payouts Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/60">
                  <div className="text-[11px] text-slate-400 font-medium mb-2">
                    Owner Attendance & Calculated Game Entitlements:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {owners.map((o) => {
                      const att = game.owners.find((att) => att.ownerId === o.id)
                      const isPresent = att ? att.present : false
                      const payout = calc?.ownerDistributions[o.id] || 0

                      return (
                        <div
                          key={o.id}
                          className="p-2 rounded bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className={`text-[10px] font-bold ${
                                isPresent ? 'text-emerald-400' : 'text-slate-500'
                              }`}
                            >
                              {isPresent ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-300 font-medium truncate">{o.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-200">
                            {formatINR(payout)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedGame && (
        <GameDetailsModal
          isOpen={Boolean(selectedGame)}
          onClose={() => setSelectedGame(null)}
          gameRecord={selectedGame}
          gameResult={selectedResult}
        />
      )}
    </div>
  )
}
