import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { parseRupeesToPaise, formatINR } from '../../lib/accounting/formatters'
import { SessionExpense } from '../../lib/accounting/types'
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Users,
  UserCheck,
  Receipt,
} from 'lucide-react'
import {
  calculateGameNetRake,
  allocateRakeToBuckets,
  calculateOwnerDistribution,
} from '../../lib/accounting/engine'

interface AddGameModalProps {
  isOpen: boolean
  onClose: () => void
}

interface GamePlayerRow {
  id: string
  playerId: string // empty string if new member
  newPlayerName: string
  amountRupees: string
  isPaid: boolean
  receivedByOwnerId: string
}

export const AddGameModal: React.FC<AddGameModalProps> = ({ isOpen, onClose }) => {
  const { owners, players, summary, settings, addGame } = useLedger()

  const [playedAt, setPlayedAt] = useState<string>(new Date().toISOString().slice(0, 16))
  const [hostOwnerId, setHostOwnerId] = useState<string>(owners[0]?.id || '')
  const [grossRakeInput, setGrossRakeInput] = useState<string>('')
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    owners.forEach((o) => (init[o.id] = true)) // Default all present
    return init
  })

  // When host changes, ensure host is marked present
  useEffect(() => {
    if (hostOwnerId) {
      setAttendance((prev) => ({ ...prev, [hostOwnerId]: true }))
    }
  }, [hostOwnerId])

  // Member contribution attribution rows
  const [playerRows, setPlayerRows] = useState<GamePlayerRow[]>([])

  // Session expenses: default paid by hosting organizer
  const [expenses, setExpenses] = useState<SessionExpense[]>([
    {
      id: `exp-draft-${Date.now()}-0`,
      amountPaise: 0,
      description: 'Refreshments / Venue / Supplies',
      paidByOwnerId: owners[0]?.id || '',
    },
  ])
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [savedSuccess, setSavedSuccess] = useState<any | null>(null)

  // Calculate member rows sum
  const totalPlayerRakePaise = playerRows.reduce(
    (sum, r) => sum + parseRupeesToPaise(r.amountRupees),
    0
  )

  const grossRakePaise = parseRupeesToPaise(grossRakeInput)

  const activeExpenses = expenses.filter((e) => e.amountPaise > 0)
  const { netRakePaise, totalExpensePaise, uncoveredExpensePaise } = calculateGameNetRake(
    grossRakePaise,
    activeExpenses
  )

  const ownerAttendanceList = owners.map((o) => ({
    ownerId: o.id,
    present: Boolean(attendance[o.id]),
  }))
  const presentCount = ownerAttendanceList.filter((o) => o.present).length

  // Pure Waterfall Allocation (always automatic)
  const projectedAlloc = allocateRakeToBuckets(
    netRakePaise,
    summary.tableRecoveryAccumulatedPaise,
    summary.tableRecoveryTargetPaise,
    summary.festivalFundAccumulatedPaise,
    summary.festivalFundTargetPaise
  )

  let projectedDistributions: Record<string, number> = {}
  if (projectedAlloc.distributableRakePaise > 0 && presentCount > 0) {
    try {
      const res = calculateOwnerDistribution({
        distributableRakePaake: projectedAlloc.distributableRakePaise,
        distributableRakePaise: projectedAlloc.distributableRakePaise,
        owners: ownerAttendanceList,
        settings,
      } as any)
      projectedDistributions = res.ownerDistributions
    } catch {
      projectedDistributions = {}
    }
  }

  const handleToggleOwner = (ownerId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [ownerId]: !prev[ownerId],
    }))
    if (error) setError('')
  }

  // Player row handlers
  const handleAddPlayerRow = () => {
    const nextPlayer = players.find(
      (p) => !playerRows.some((row) => row.playerId === p.id)
    )
    setPlayerRows((prev) => [
      ...prev,
      {
        id: `player-row-${Date.now()}-${prev.length}`,
        playerId: nextPlayer ? nextPlayer.id : '',
        newPlayerName: '',
        amountRupees: '',
        isPaid: false,
        receivedByOwnerId: hostOwnerId,
      },
    ])
  }

  const handleRemovePlayerRow = (id: string) => {
    setPlayerRows((prev) => prev.filter((r) => r.id !== id))
  }

  const handlePlayerRowChange = (id: string, field: keyof GamePlayerRow, value: any) => {
    setPlayerRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        return { ...r, [field]: value }
      })
    )
    if (error) setError('')
  }

  // Helper: distribute gross fee evenly among member rows
  const handleSplitRakeEvenly = () => {
    if (playerRows.length === 0 || grossRakePaise <= 0) return
    const eachPaise = Math.floor(grossRakePaise / playerRows.length)
    const remainder = grossRakePaise % playerRows.length
    setPlayerRows((prev) =>
      prev.map((r, idx) => ({
        ...r,
        amountRupees: ((eachPaise + (idx === 0 ? remainder : 0)) / 100).toString(),
      }))
    )
  }

  // Helper: sync gross fee input from member rows sum
  const handleSyncGrossFromPlayers = () => {
    if (totalPlayerRakePaise > 0) {
      setGrossRakeInput((totalPlayerRakePaise / 100).toString())
    }
  }

  // Expense handlers
  const handleAddExpenseRow = () => {
    setExpenses((prev) => [
      ...prev,
      {
        id: `exp-draft-${Date.now()}-${prev.length}`,
        amountPaise: 0,
        description: '',
        paidByOwnerId: hostOwnerId,
      },
    ])
  }

  const handleRemoveExpenseRow = (index: number) => {
    setExpenses((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleExpenseChange = (
    index: number,
    field: 'description' | 'rupees' | 'paidByOwnerId',
    value: string
  ) => {
    setExpenses((prev) =>
      prev.map((e, idx) => {
        if (idx !== index) return e
        if (field === 'description') {
          return { ...e, description: value }
        } else if (field === 'rupees') {
          return { ...e, amountPaise: parseRupeesToPaise(value) }
        } else {
          return { ...e, paidByOwnerId: value || undefined }
        }
      })
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (grossRakePaise <= 0) {
      setError('Gross fee must be greater than zero.')
      return
    }

    if (presentCount === 0) {
      setError('At least one organizer must be present for the session.')
      return
    }

    // Validate member rows if entered
    if (playerRows.length > 0) {
      for (const row of playerRows) {
        if (!row.playerId && !row.newPlayerName.trim()) {
          setError('Please select a member or type a name for each member row.')
          return
        }
        if (parseRupeesToPaise(row.amountRupees) <= 0) {
          setError('Each member fee amount must be greater than ₹0.')
          return
        }
      }

      if (totalPlayerRakePaise !== grossRakePaise) {
        setError(
          `Member fee breakdown total (${formatINR(totalPlayerRakePaise)}) does not match Gross Fee (${formatINR(
            grossRakePaise
          )}). Click "Sync from Members" or adjust amounts.`
        )
        return
      }
    }

    try {
      const newGame = await addGame({
        playedAt: new Date(playedAt).toISOString(),
        grossRakePaise,
        expenses: activeExpenses,
        owners: ownerAttendanceList,
        notes: notes.trim() || undefined,
        hostOwnerId,
        playerRakes: playerRows.map((r) => ({
          playerId: r.playerId || undefined,
          playerName: r.playerId ? undefined : r.newPlayerName.trim(),
          amountPaise: parseRupeesToPaise(r.amountRupees),
          isPaid: r.isPaid,
          receivedByOwnerId: r.receivedByOwnerId || hostOwnerId,
        })),
      })

      setSavedSuccess({
        gameNumber: newGame.gameNumber,
        netRakePaise,
        tableRecoveryPaise: projectedAlloc.allocatedToTablePaise,
        festivalFundPaise: projectedAlloc.allocatedToFestivalPaise,
        distributableProfitPaise: projectedAlloc.distributableRakePaise,
        playerCount: playerRows.length,
        hostName: owners.find((o) => o.id === hostOwnerId)?.name || 'Host',
        totalExpenses: totalExpensePaise,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to save session.')
    }
  }

  const handleResetAndClose = () => {
    setGrossRakeInput('')
    setPlayerRows([])
    setExpenses([
      {
        id: `exp-draft-${Date.now()}-0`,
        amountPaise: 0,
        description: 'Refreshments / Venue / Supplies',
        paidByOwnerId: hostOwnerId,
      },
    ])
    setNotes('')
    setError('')
    setSavedSuccess(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title="Record New Session"
      subtitle="Waterfall accounting with member fee attribution & host expense reimbursement"
      maxWidth="lg"
    >
      {savedSuccess ? (
        <div className="space-y-5 py-2">
          <div className="flex flex-col items-center text-center p-6 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
            <h4 className="text-lg font-bold text-slate-100">
              Session #{savedSuccess.gameNumber} Saved Successfully!
            </h4>
            <p className="text-xs text-slate-300 mt-1">
              Waterfall allocation completed. Host {savedSuccess.hostName} credited for expenses and member balances updated.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span className="font-sans">Hosting Organizer:</span>
              <span className="font-bold text-slate-100">{savedSuccess.hostName}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="font-sans">Session Expenses (Reimbursable to Host):</span>
              <span className="font-bold text-rose-400">{formatINR(savedSuccess.totalExpenses)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="font-sans">Net Session Fee:</span>
              <span className="font-bold text-emerald-400">{formatINR(savedSuccess.netRakePaise)}</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between text-indigo-300">
              <span className="font-sans">Equipment Reserve Allocated:</span>
              <span>{formatINR(savedSuccess.tableRecoveryPaise)}</span>
            </div>
            <div className="flex justify-between text-indigo-300">
              <span className="font-sans">Event Reserve Allocated:</span>
              <span>{formatINR(savedSuccess.festivalFundPaise)}</span>
            </div>
            <div className="flex justify-between text-amber-400 font-bold">
              <span className="font-sans">Distributable Organizer Balance:</span>
              <span>{formatINR(savedSuccess.distributableProfitPaise)}</span>
            </div>
            {savedSuccess.playerCount > 0 && (
              <div className="border-t border-slate-800 pt-2 text-slate-400 font-sans text-[11px]">
                ✓ {savedSuccess.playerCount} member fee entries recorded in ledger.
              </div>
            )}
          </div>

          <button
            onClick={handleResetAndClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs rounded-xl text-white shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Date, Host Organizer & Gross Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Date & Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Date & Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* Hosting Organizer */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Hosting Organizer <span className="text-rose-400">*</span></span>
              </label>
              <select
                value={hostOwnerId}
                onChange={(e) => {
                  const newHostId = e.target.value
                  setHostOwnerId(newHostId)
                  // Update default expense payer to new host
                  setExpenses((prev) =>
                    prev.map((exp) => ({ ...exp, paidByOwnerId: newHostId }))
                  )
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
              >
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} (Host)
                  </option>
                ))}
              </select>
            </div>

            {/* Gross Fee */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Gross Fee (₹) <span className="text-rose-400">*</span>
                </label>
                {totalPlayerRakePaise > 0 && totalPlayerRakePaise !== grossRakePaise && (
                  <button
                    type="button"
                    onClick={handleSyncGrossFromPlayers}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Sync from Members ({formatINR(totalPlayerRakePaise)})
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-medium text-slate-500">₹</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="4,500"
                  value={grossRakeInput}
                  onChange={(e) => {
                    setGrossRakeInput(e.target.value)
                    if (error) setError('')
                  }}
                  className="w-full pl-8 pr-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Member-wise Fee Attribution */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Member Fee Attribution</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Assign where this session's fees came from so individual member balances update accurately.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {playerRows.length > 0 && grossRakePaise > 0 && (
                  <button
                    type="button"
                    onClick={handleSplitRakeEvenly}
                    className="px-2.5 py-1 text-[11px] font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 hover:bg-indigo-900/60 rounded-lg transition-colors"
                  >
                    Split Equally ({formatINR(Math.floor(grossRakePaise / playerRows.length))} ea)
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddPlayerRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Member</span>
                </button>
              </div>
            </div>

            {playerRows.length === 0 ? (
              <div className="p-3 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center">
                <p className="text-xs text-slate-400">
                  No member breakdown added yet.{' '}
                  <button
                    type="button"
                    onClick={handleAddPlayerRow}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    Add members
                  </button>{' '}
                  to record who contributed to this ₹{grossRakeInput || '0'} fee!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {playerRows.map((row) => (
                  <div
                    key={row.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 shadow-sm"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      {/* Member Select / Input */}
                      <div className="sm:col-span-5">
                        <label className="text-[10px] text-slate-400 block sm:hidden font-medium mb-1">
                          Member Name
                        </label>
                        {row.playerId === '' && players.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Type new member name"
                              value={row.newPlayerName}
                              onChange={(e) =>
                                handlePlayerRowChange(row.id, 'newPlayerName', e.target.value)
                              }
                              className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-indigo-500/50 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handlePlayerRowChange(row.id, 'playerId', players[0].id)}
                              className="text-[10px] text-slate-400 hover:text-slate-200 px-1.5"
                            >
                              Existing
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={row.playerId}
                              onChange={(e) => handlePlayerRowChange(row.id, 'playerId', e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">➕ New Member...</option>
                              {players.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            {row.playerId === '' && (
                              <input
                                type="text"
                                placeholder="Member name"
                                value={row.newPlayerName}
                                onChange={(e) =>
                                  handlePlayerRowChange(row.id, 'newPlayerName', e.target.value)
                                }
                                className="flex-1 px-2 py-1.5 text-xs bg-slate-900 border border-indigo-500 rounded-lg text-slate-100 placeholder:text-slate-600"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Fee Amount */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-slate-400 block sm:hidden font-medium mb-1">
                          Fee Amount (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">₹</span>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            placeholder="1,500"
                            value={row.amountRupees}
                            onChange={(e) =>
                              handlePlayerRowChange(row.id, 'amountRupees', e.target.value)
                            }
                            className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                      </div>

                      {/* Paid on Spot checkbox */}
                      <div className="sm:col-span-3 flex items-center justify-between sm:justify-start gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={row.isPaid}
                            onChange={(e) =>
                              handlePlayerRowChange(row.id, 'isPaid', e.target.checked)
                            }
                            className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                          />
                          <span className={row.isPaid ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                            {row.isPaid ? 'Paid on Spot' : 'Unpaid (Due)'}
                          </span>
                        </label>

                        {row.isPaid && (
                          <select
                            value={row.receivedByOwnerId}
                            onChange={(e) =>
                              handlePlayerRowChange(row.id, 'receivedByOwnerId', e.target.value)
                            }
                            className="px-2 py-1 text-[11px] bg-slate-900 border border-emerald-500/40 rounded text-emerald-300 focus:outline-none"
                            title="Organizer who received this payment"
                          >
                            {owners.map((o) => (
                              <option key={o.id} value={o.id}>
                                To: {o.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Remove Button */}
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemovePlayerRow(row.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Member attribution summary footer */}
                <div className="flex items-center justify-between text-xs px-1 text-slate-400 font-mono">
                  <span>
                    Total from {playerRows.length} member{playerRows.length > 1 ? 's' : ''}:{' '}
                    <strong className="text-slate-200">{formatINR(totalPlayerRakePaise)}</strong>
                  </span>
                  {totalPlayerRakePaise !== grossRakePaise && (
                    <span className="text-amber-400 font-sans text-[11px]">
                      Diff vs Gross Fee: {formatINR(Math.abs(grossRakePaise - totalPlayerRakePaise))}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Organizers Present Attendance */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Organizers Present <span className="text-rose-400">*</span>
              </label>
              <span
                className={`text-xs font-medium ${
                  presentCount === 0 ? 'text-rose-400 font-bold' : 'text-slate-400'
                }`}
              >
                {presentCount} of {owners.length} present (At least 1 required)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {owners.map((owner) => {
                const isPresent = Boolean(attendance[owner.id])
                const isHost = owner.id === hostOwnerId

                return (
                  <button
                    type="button"
                    key={owner.id}
                    onClick={() => handleToggleOwner(owner.id)}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isPresent
                        ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-xs truncate">
                        {owner.name} {isHost ? '(Host)' : ''}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isPresent ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      >
                        {isPresent ? '✓' : '✗'}
                      </span>
                    </div>
                    <span className="text-[10px]">
                      {isPresent ? 'Present (Active Share)' : 'Absent (10% Rule)'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 4: Session Expenses */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Session Expenses (Reimbursable Out of Pocket)</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Incurred by the host (supplies, refreshments, electricity). Reimbursed before distribution.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddExpenseRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            </div>

            <div className="space-y-2">
              {expenses.map((expense, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-950 p-2 sm:p-2.5 rounded-xl border border-slate-800"
                >
                  <input
                    type="text"
                    placeholder="e.g. Refreshments, Venue, Supplies"
                    value={expense.description}
                    onChange={(e) => handleExpenseChange(idx, 'description', e.target.value)}
                    className="flex-1 min-w-[140px] px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={expense.amountPaise ? expense.amountPaise / 100 : ''}
                      onChange={(e) => handleExpenseChange(idx, 'rupees', e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-right"
                    />
                  </div>
                  <select
                    value={expense.paidByOwnerId || hostOwnerId}
                    onChange={(e) => handleExpenseChange(idx, 'paidByOwnerId', e.target.value)}
                    className="w-36 shrink-0 px-2 py-1.5 text-[11px] bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                    title="Organizer who paid this out of pocket and will be reimbursed"
                  >
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        Paid by: {o.name} {o.id === hostOwnerId ? '(Host)' : ''}
                      </option>
                    ))}
                  </select>
                  {expenses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExpenseRow(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors ml-auto sm:ml-0"
                      title="Remove expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {uncoveredExpensePaise > 0 && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Expenses exceed gross fee by {formatINR(uncoveredExpensePaise)}. Net fee will be ₹0 and remaining expense is recorded.
                </span>
              </div>
            )}
          </div>

          {/* Section 5: Waterfall Calculation Preview */}
          {grossRakePaise > 0 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Waterfall Accounting Preview
                </h5>
                <span className="text-[10px] text-indigo-400 font-mono">
                  Target: Equipment Reserve (₹65k) → Event Fund (₹30k) → Pool
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Session Expense</span>
                  <div className="font-mono font-bold text-rose-400 mt-0.5">
                    {formatINR(totalExpensePaise)}
                  </div>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Net Fee</span>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">
                    {formatINR(netRakePaise)}
                  </div>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Organizer Pool</span>
                  <div className="font-mono font-bold text-indigo-400 mt-0.5">
                    {formatINR(projectedAlloc.distributableRakePaise)}
                  </div>
                </div>
              </div>

              {projectedAlloc.distributableRakePaise > 0 && Object.keys(projectedDistributions).length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">
                    Organizer Shares (₹1,000 Equal + Attendance):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5 text-xs font-mono">
                    {owners.map((o) => (
                      <div
                        key={o.id}
                        className="p-1.5 bg-slate-900 rounded border border-slate-800 flex justify-between"
                      >
                        <span className="font-sans text-slate-300 truncate">{o.name}:</span>
                        <span className="font-bold text-slate-100">
                          {formatINR(projectedDistributions[o.id] || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Weekend evening session at clubhouse"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
            >
              Confirm & Save Session
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
