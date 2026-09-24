import React, { useState } from 'react'
import { useLedger, Player } from '../../lib/store/ledgerStore'
import { formatINR } from '../../lib/accounting/formatters'
import { PlayerDetailModal } from './PlayerDetailModal'
import { QuickHistoricalRakeModal } from './QuickHistoricalRakeModal'
import { AddPaymentModal } from './AddPaymentModal'
import { Users, Search, PlusCircle, Wallet, ArrowUpDown } from 'lucide-react'

export const PlayerList: React.FC = () => {
  const { players, historicalRake, payments } = useLedger()

  const [search, setSearch] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [isAddRakeOpen, setIsAddRakeOpen] = useState(false)
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
  const [activePlayerIdForAction, setActivePlayerIdForAction] = useState<string | undefined>(undefined)
  const [sortField, setSortField] = useState<'name' | 'generated' | 'paid' | 'outstanding'>('outstanding')
  const [sortAsc, setSortAsc] = useState(false)

  // Compute stats for each player
  const playerRows = players.map((player) => {
    const generatedPaise = historicalRake
      .filter((h) => h.playerId === player.id && h.status === 'active')
      .reduce((sum, h) => sum + h.amountPaise, 0)

    const paidPaise = payments
      .filter((p) => p.playerId === player.id && p.status === 'active')
      .reduce((sum, p) => sum + p.amountPaise, 0)

    const outstandingPaise = Math.max(0, generatedPaise - paidPaise)

    return {
      player,
      generatedPaise,
      paidPaise,
      outstandingPaise,
    }
  })

  // Filter & Sort
  const filteredRows = playerRows
    .filter((row) => row.player.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0
      if (sortField === 'name') {
        comparison = a.player.name.localeCompare(b.player.name)
      } else if (sortField === 'generated') {
        comparison = a.generatedPaise - b.generatedPaise
      } else if (sortField === 'paid') {
        comparison = a.paidPaise - b.paidPaise
      } else if (sortField === 'outstanding') {
        comparison = a.outstandingPaise - b.outstandingPaise
      }
      return sortAsc ? comparison : -comparison
    })

  const totalGenerated = playerRows.reduce((s, r) => s + r.generatedPaise, 0)
  const totalPaid = playerRows.reduce((s, r) => s + r.paidPaise, 0)
  const totalOutstanding = playerRows.reduce((s, r) => s + r.outstandingPaise, 0)

  const handleOpenAddRakeFor = (playerId?: string) => {
    setActivePlayerIdForAction(playerId)
    setIsAddRakeOpen(true)
  }

  const handleOpenAddPaymentFor = (playerId?: string) => {
    setActivePlayerIdForAction(playerId)
    setIsAddPaymentOpen(true)
  }

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Players & Rake Ledger</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Individual player rake generation, payments received, and outstanding balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddRakeFor(undefined)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-indigo-400" />
            <span>+ Add Rake</span>
          </button>
          <button
            onClick={() => handleOpenAddPaymentFor(undefined)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
          >
            <Wallet className="w-4 h-4" />
            <span>+ Add Payment</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          placeholder="Search by player name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Players Table (Section 21) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Player</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('generated')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Generated</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('paid')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Paid</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('outstanding')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Outstanding</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredRows.map(({ player, generatedPaise, paidPaise, outstandingPaise }) => (
                <tr
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-sans font-medium text-slate-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[11px] text-slate-300">
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span>{player.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-200">
                    {formatINR(generatedPaise)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-emerald-400">
                    {formatINR(paidPaise)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                        outstandingPaise > 0
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'text-slate-500'
                      }`}
                    >
                      {formatINR(outstandingPaise)}
                    </span>
                  </td>
                  <td
                    className="py-3.5 px-4 text-center font-sans"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenAddPaymentFor(player.id)}
                        disabled={outstandingPaise === 0}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-600/10 hover:bg-emerald-600/20 disabled:opacity-30 text-emerald-400 border border-emerald-500/20 transition-colors"
                        title="Record Payment"
                      >
                        Pay
                      </button>
                      <button
                        onClick={() => setSelectedPlayer(player)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-800 bg-slate-950/80 font-bold text-xs">
                <td className="py-3.5 px-4 font-sans text-slate-300">
                  Total ({playerRows.length} players)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                  {formatINR(totalGenerated)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                  {formatINR(totalPaid)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-amber-400">
                  {formatINR(totalOutstanding)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modals */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          isOpen={Boolean(selectedPlayer)}
          onClose={() => setSelectedPlayer(null)}
          onOpenAddRake={(pId) => handleOpenAddRakeFor(pId)}
          onOpenAddPayment={(pId) => handleOpenAddPaymentFor(pId)}
        />
      )}

      {isAddRakeOpen && (
        <QuickHistoricalRakeModal
          isOpen={isAddRakeOpen}
          onClose={() => setIsAddRakeOpen(false)}
          initialPlayerId={activePlayerIdForAction}
        />
      )}

      {isAddPaymentOpen && (
        <AddPaymentModal
          isOpen={isAddPaymentOpen}
          onClose={() => setIsAddPaymentOpen(false)}
          initialPlayerId={activePlayerIdForAction}
        />
      )}
    </div>
  )
}
