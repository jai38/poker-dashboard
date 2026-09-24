import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  calculateLedgerSummary,
  validateOwnerAttendance,
} from '../accounting/engine'
import {
  AccountingSettings,
  DEFAULT_ACCOUNTING_SETTINGS,
  GameRecord,
  GeneralExpense,
  HistoricalRakeEntry,
  LedgerSummary,
  Owner,
  OwnerAttendance,
  OwnerSettlement,
  PlayerPayment,
  SessionExpense,
  BucketTransfer,
  CustomGameAllocation,
} from '../accounting/types'
import {
  INITIAL_OWNERS,
  INITIAL_SEED_PLAYERS,
} from '../supabase/seedData'
import { isSupabaseConfigured, supabase } from '../supabase/client'

export interface Player {
  id: string
  name: string
  createdAt?: string
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, any>
}

interface LedgerContextType {
  owners: Owner[]
  players: Player[]
  games: GameRecord[]
  historicalRake: HistoricalRakeEntry[]
  payments: PlayerPayment[]
  expenses: GeneralExpense[]
  settlements: OwnerSettlement[]
  transfers: BucketTransfer[]
  settings: AccountingSettings
  auditLog: AuditLogEntry[]
  summary: LedgerSummary
  isLoading: boolean
  isOnlineMode: boolean
  isAuthenticated: boolean
  userEmail: string | null

  // Actions
  addGame: (data: {
    playedAt: string
    grossRakePaise: number
    expenses: SessionExpense[]
    owners: OwnerAttendance[]
    notes?: string
    customAllocation?: CustomGameAllocation
  }) => Promise<GameRecord>

  voidGame: (gameId: string, reason: string) => Promise<void>

  addHistoricalRake: (data: {
    playerId?: string
    playerName?: string
    amountPaise: number
    paidAmountPaise?: number
    entryDate?: string
    notes?: string
  }) => Promise<{ rake: HistoricalRakeEntry; payment?: PlayerPayment }>

  addPayment: (data: {
    playerId: string
    amountPaise: number
    paidAt?: string
    notes?: string
  }) => Promise<PlayerPayment>

  voidPayment: (paymentId: string, reason: string) => Promise<void>

  addExpense: (data: {
    type: 'session_expense' | 'monthly_expense' | 'credit_adjustment'
    amountPaise: number
    description: string
    expenseDate?: string
    gameId?: string | null
  }) => Promise<GeneralExpense>

  voidExpense: (expenseId: string, reason: string) => Promise<void>

  recordOwnerSettlement: (data: {
    ownerId: string
    amountPaise: number
    settledAt?: string
    notes?: string
  }) => Promise<OwnerSettlement>

  addBucketTransfer: (data: {
    fromBucket: 'table_recovery' | 'festival_fund'
    toBucket: 'table_recovery' | 'festival_fund' | 'owner_profit'
    amountPaise: number
    notes?: string
    transferredAt?: string
  }) => Promise<BucketTransfer>

  voidBucketTransfer: (transferId: string, reason: string) => Promise<void>

  updateSettings: (newSettings: Partial<AccountingSettings>, reason?: string) => Promise<void>
  updateOwner: (ownerId: string, newName: string) => Promise<void>
  updateOwners: (updatedOwners: { id: string; name: string }[]) => Promise<void>
  resetToInitialSeed: () => void
  clearDatabase: () => void
  exportCSV: (type: 'summary' | 'players' | 'games' | 'payments' | 'expenses' | 'settlements') => void
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const STORAGE_KEY = 'poker_rake_ledger_local_state_v1'

function generateInitialSeedState() {
  const initialPlayers: Player[] = INITIAL_SEED_PLAYERS.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: new Date('2026-09-01T00:00:00Z').toISOString(),
  }))

  const initialHistoricalRake: HistoricalRakeEntry[] = INITIAL_SEED_PLAYERS.map((p, idx) => ({
    id: `hist-${idx + 1}`,
    playerId: p.id,
    amountPaise: p.historicalRakePaise,
    entryDate: new Date('2026-09-01T00:00:00Z').toISOString(),
    status: 'active',
    notes: 'Initial historical seed',
  }))

  const initialAudit: AuditLogEntry[] = [
    {
      id: 'audit-init-1',
      timestamp: new Date('2026-09-01T00:00:00Z').toISOString(),
      action: 'INITIAL_SEED_LOADED',
      entityType: 'ledger',
      metadata: {
        totalRakePaise: 52650 * 100,
        playersCount: 16,
      },
    },
  ]

  return {
    owners: INITIAL_OWNERS,
    players: initialPlayers,
    games: [] as GameRecord[],
    historicalRake: initialHistoricalRake,
    payments: [] as PlayerPayment[],
    expenses: [] as GeneralExpense[],
    settlements: [] as OwnerSettlement[],
    settings: DEFAULT_ACCOUNTING_SETTINGS,
    auditLog: initialAudit,
  }
}

const LedgerContext = createContext<LedgerContextType | null>(null)

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [owners, setOwners] = useState<Owner[]>(INITIAL_OWNERS)
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<GameRecord[]>([])
  const [historicalRake, setHistoricalRake] = useState<HistoricalRakeEntry[]>([])
  const [payments, setPayments] = useState<PlayerPayment[]>([])
  const [expenses, setExpenses] = useState<GeneralExpense[]>([])
  const [settlements, setSettlements] = useState<OwnerSettlement[]>([])
  const [transfers, setTransfers] = useState<BucketTransfer[]>([])
  const [settings, setSettings] = useState<AccountingSettings>(DEFAULT_ACCOUNTING_SETTINGS)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(!isSupabaseConfigured)
  const [userEmail, setUserEmail] = useState<string | null>(isSupabaseConfigured ? null : 'admin@ledger.local')

  // Load state on mount
  useEffect(() => {
    async function init() {
      setIsLoading(true)
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            setIsAuthenticated(true)
            setUserEmail(session.user.email || null)
          }
        } catch (e) {
          console.warn('Supabase auth session check failed, using local mode fallback', e)
        }
      }

      // Check LocalStorage cache
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setOwners(parsed.owners || INITIAL_OWNERS)
          setPlayers(parsed.players || [])
          setGames(parsed.games || [])
          setHistoricalRake(parsed.historicalRake || [])
          setPayments(parsed.payments || [])
          setExpenses(parsed.expenses || [])
          setSettlements(parsed.settlements || [])
          setTransfers(parsed.transfers || [])
          setSettings(parsed.settings || DEFAULT_ACCOUNTING_SETTINGS)
          setAuditLog(parsed.auditLog || [])
        } catch (err) {
          console.error('Error loading saved state, falling back to seed:', err)
          const seed = generateInitialSeedState()
          applySeedState(seed)
        }
      } else {
        const seed = generateInitialSeedState()
        applySeedState(seed)
      }
      setIsLoading(false)
    }

    init()
  }, [])

  function applySeedState(seed: ReturnType<typeof generateInitialSeedState>) {
    setOwners(seed.owners)
    setPlayers(seed.players)
    setGames(seed.games)
    setHistoricalRake(seed.historicalRake)
    setPayments(seed.payments)
    setExpenses(seed.expenses)
    setSettlements(seed.settlements)
    setTransfers([])
    setSettings(seed.settings)
    setAuditLog(seed.auditLog)
    persist({
      owners: seed.owners,
      players: seed.players,
      games: seed.games,
      historicalRake: seed.historicalRake,
      payments: seed.payments,
      expenses: seed.expenses,
      settlements: seed.settlements,
      transfers: [],
      settings: seed.settings,
      auditLog: seed.auditLog,
    })
  }

  function persist(data: {
    owners?: Owner[]
    players?: Player[]
    games?: GameRecord[]
    historicalRake?: HistoricalRakeEntry[]
    payments?: PlayerPayment[]
    expenses?: GeneralExpense[]
    settlements?: OwnerSettlement[]
    transfers?: BucketTransfer[]
    settings?: AccountingSettings
    auditLog?: AuditLogEntry[]
  }) {
    const current = {
      owners: data.owners ?? owners,
      players: data.players ?? players,
      games: data.games ?? games,
      historicalRake: data.historicalRake ?? historicalRake,
      payments: data.payments ?? payments,
      expenses: data.expenses ?? expenses,
      settlements: data.settlements ?? settlements,
      transfers: data.transfers ?? transfers,
      settings: data.settings ?? settings,
      auditLog: data.auditLog ?? auditLog,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  }

  function addAudit(action: string, entityType: string, entityId?: string, metadata?: Record<string, any>) {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      entityType,
      entityId,
      metadata,
    }
    const updated = [entry, ...auditLog]
    setAuditLog(updated)
    persist({ auditLog: updated })
  }

  // Derive all conclusions purely from facts
  const summary: LedgerSummary = calculateLedgerSummary({
    owners,
    games,
    historicalRake,
    payments,
    expenses,
    settlements,
    bucketTransfers: transfers,
    settings,
  })

  // 1. Add Game
  async function addGame(data: {
    playedAt: string
    grossRakePaise: number
    expenses: SessionExpense[]
    owners: OwnerAttendance[]
    notes?: string
    customAllocation?: CustomGameAllocation
  }): Promise<GameRecord> {
    if (data.grossRakePaise < 0) {
      throw new Error('Gross rake cannot be negative.')
    }
    validateOwnerAttendance(data.owners)

    const nextGameNumber = games.length > 0 ? Math.max(...games.map((g) => g.gameNumber)) + 1 : 1
    const newGame: GameRecord = {
      id: `game-${Date.now()}`,
      gameNumber: nextGameNumber,
      playedAt: data.playedAt,
      grossRakePaise: data.grossRakePaise,
      expenses: data.expenses,
      owners: data.owners,
      status: 'active',
      notes: data.notes,
      customAllocation: data.customAllocation,
    }

    const updatedGames = [...games, newGame]
    setGames(updatedGames)
    persist({ games: updatedGames })

    addAudit('GAME_CREATED', 'game', newGame.id, {
      gameNumber: newGame.gameNumber,
      grossRakePaise: newGame.grossRakePaise,
      expensesCount: data.expenses.length,
      ownersPresent: data.owners.filter((o) => o.present).map((o) => o.ownerId),
      customAllocation: data.customAllocation,
    })

    return newGame
  }

  // 2. Void Game
  async function voidGame(gameId: string, reason: string): Promise<void> {
    if (!reason || reason.trim() === '') {
      throw new Error('A reason is strictly required to void a game.')
    }

    const target = games.find((g) => g.id === gameId)
    if (!target) throw new Error('Game not found.')
    if (target.status === 'voided') throw new Error('Game is already voided.')

    const updatedGames: GameRecord[] = games.map((g) =>
      g.id === gameId ? { ...g, status: 'voided', voidReason: reason } : g
    )
    setGames(updatedGames)
    persist({ games: updatedGames })

    addAudit('GAME_VOIDED', 'game', gameId, {
      gameNumber: target.gameNumber,
      reason,
    })
  }

  // 3. Quick Historical Rake Entry (Section 22)
  async function addHistoricalRake(data: {
    playerId?: string
    playerName?: string
    amountPaise: number
    paidAmountPaise?: number
    entryDate?: string
    notes?: string
  }) {
    if (data.amountPaise <= 0) {
      throw new Error('Rake amount must be greater than zero.')
    }

    let targetPlayerId = data.playerId
    let updatedPlayers = [...players]

    if (!targetPlayerId && data.playerName) {
      const existing = players.find(
        (p) => p.name.trim().toLowerCase() === data.playerName?.trim().toLowerCase()
      )
      if (existing) {
        targetPlayerId = existing.id
      } else {
        const newPlayer: Player = {
          id: `player-${Date.now()}`,
          name: data.playerName.trim(),
          createdAt: new Date().toISOString(),
        }
        updatedPlayers.push(newPlayer)
        targetPlayerId = newPlayer.id
        setPlayers(updatedPlayers)
        persist({ players: updatedPlayers })
        addAudit('PLAYER_CREATED', 'player', newPlayer.id, { name: newPlayer.name })
      }
    }

    if (!targetPlayerId) {
      throw new Error('Either playerId or playerName is required.')
    }

    const newRake: HistoricalRakeEntry = {
      id: `hist-${Date.now()}`,
      playerId: targetPlayerId,
      amountPaise: data.amountPaise,
      entryDate: data.entryDate || new Date().toISOString(),
      status: 'active',
      notes: data.notes || 'Historical rake entry',
    }

    const updatedHistorical = [...historicalRake, newRake]
    setHistoricalRake(updatedHistorical)

    let newPayment: PlayerPayment | undefined = undefined
    let updatedPayments = [...payments]

    if (data.paidAmountPaise && data.paidAmountPaise > 0) {
      newPayment = {
        id: `pay-${Date.now()}`,
        playerId: targetPlayerId,
        amountPaise: data.paidAmountPaise,
        paidAt: data.entryDate || new Date().toISOString(),
        status: 'active',
        notes: `Initial payment with historical rake entry`,
      }
      updatedPayments.push(newPayment)
      setPayments(updatedPayments)
    }

    persist({
      players: updatedPlayers,
      historicalRake: updatedHistorical,
      payments: updatedPayments,
    })

    addAudit('HISTORICAL_RAKE_ADDED', 'historical_rake', newRake.id, {
      playerId: targetPlayerId,
      amountPaise: newRake.amountPaise,
      paidAmountPaise: data.paidAmountPaise || 0,
    })

    return { rake: newRake, payment: newPayment }
  }

  // 4. Add Player Payment
  async function addPayment(data: {
    playerId: string
    amountPaise: number
    paidAt?: string
    notes?: string
  }): Promise<PlayerPayment> {
    if (data.amountPaise <= 0) {
      throw new Error('Payment amount must be greater than zero.')
    }

    const player = players.find((p) => p.id === data.playerId)
    if (!player) throw new Error('Player not found.')

    // Calculate player's current outstanding balance
    const playerRakePaise = historicalRake
      .filter((h) => h.playerId === data.playerId && h.status === 'active')
      .reduce((s, h) => s + h.amountPaise, 0)
    const playerPaidPaise = payments
      .filter((p) => p.playerId === data.playerId && p.status === 'active')
      .reduce((s, p) => s + p.amountPaise, 0)
    const outstanding = Math.max(0, playerRakePaise - playerPaidPaise)

    if (data.amountPaise > outstanding) {
      throw new Error(
        `Payment (₹${(data.amountPaise / 100).toLocaleString()}) cannot exceed outstanding rake (₹${(
          outstanding / 100
        ).toLocaleString()}). Overpayment is not supported in V1.`
      )
    }

    const newPayment: PlayerPayment = {
      id: `pay-${Date.now()}`,
      playerId: data.playerId,
      amountPaise: data.amountPaise,
      paidAt: data.paidAt || new Date().toISOString(),
      status: 'active',
      notes: data.notes,
    }

    const updatedPayments = [...payments, newPayment]
    setPayments(updatedPayments)
    persist({ payments: updatedPayments })

    addAudit('PAYMENT_RECORDED', 'payment', newPayment.id, {
      playerId: data.playerId,
      playerName: player.name,
      amountPaise: data.amountPaise,
    })

    return newPayment
  }

  // 5. Void Payment
  async function voidPayment(paymentId: string, reason: string): Promise<void> {
    if (!reason || reason.trim() === '') {
      throw new Error('A reason is required to void a payment.')
    }
    const updated = payments.map((p) =>
      p.id === paymentId ? { ...p, status: 'voided' as const, voidReason: reason } : p
    )
    setPayments(updated)
    persist({ payments: updated })
    addAudit('PAYMENT_VOIDED', 'payment', paymentId, { reason })
  }

  // 6. Add Expense
  async function addExpense(data: {
    type: 'session_expense' | 'monthly_expense' | 'credit_adjustment'
    amountPaise: number
    description: string
    expenseDate?: string
    gameId?: string | null
  }): Promise<GeneralExpense> {
    if (data.amountPaise <= 0) {
      throw new Error('Expense amount must be greater than zero.')
    }
    if (!data.description || data.description.trim() === '') {
      throw new Error('Description is required.')
    }

    const newExpense: GeneralExpense = {
      id: `exp-${Date.now()}`,
      type: data.type,
      amountPaise: data.amountPaise,
      description: data.description.trim(),
      expenseDate: data.expenseDate || new Date().toISOString(),
      gameId: data.gameId || null,
      status: 'active',
    }

    const updatedExpenses = [...expenses, newExpense]
    setExpenses(updatedExpenses)
    persist({ expenses: updatedExpenses })

    addAudit('EXPENSE_RECORDED', 'expense', newExpense.id, {
      type: data.type,
      amountPaise: data.amountPaise,
      description: data.description,
      gameId: data.gameId,
    })

    return newExpense
  }

  // 7. Void Expense
  async function voidExpense(expenseId: string, reason: string): Promise<void> {
    if (!reason || reason.trim() === '') {
      throw new Error('A reason is required to void an expense.')
    }
    const updated = expenses.map((e) =>
      e.id === expenseId ? { ...e, status: 'voided' as const, voidReason: reason } : e
    )
    setExpenses(updated)
    persist({ expenses: updated })
    addAudit('EXPENSE_VOIDED', 'expense', expenseId, { reason })
  }

  // 8. Record Owner Settlement
  async function recordOwnerSettlement(data: {
    ownerId: string
    amountPaise: number
    settledAt?: string
    notes?: string
  }): Promise<OwnerSettlement> {
    if (data.amountPaise <= 0) {
      throw new Error('Settlement amount must be greater than zero.')
    }
    const owner = owners.find((o) => o.id === data.ownerId)
    if (!owner) throw new Error('Owner not found.')

    const ownerEnt = summary.ownerEntitlements[data.ownerId]
    const remaining = ownerEnt?.remainingEntitlementPaise || 0

    if (data.amountPaise > remaining) {
      throw new Error(
        `Settlement amount (₹${(data.amountPaise / 100).toLocaleString()}) exceeds owner's remaining entitlement (₹${(
          remaining / 100
        ).toLocaleString()}).`
      )
    }

    const newSettlement: OwnerSettlement = {
      id: `set-${Date.now()}`,
      ownerId: data.ownerId,
      amountPaise: data.amountPaise,
      settledAt: data.settledAt || new Date().toISOString(),
      status: 'active',
      notes: data.notes,
    }

    const updatedSettlements = [...settlements, newSettlement]
    setSettlements(updatedSettlements)
    persist({ settlements: updatedSettlements })

    addAudit('OWNER_SETTLEMENT_RECORDED', 'owner_settlement', newSettlement.id, {
      ownerId: data.ownerId,
      ownerName: owner.name,
      amountPaise: data.amountPaise,
    })

    return newSettlement
  }

  // 9. Update Settings
  async function updateSettings(newSettings: Partial<AccountingSettings>, reason?: string): Promise<void> {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    persist({ settings: updated })

    addAudit('SETTINGS_UPDATED', 'settings', undefined, {
      previous: settings,
      updated,
      reason: reason || 'Admin updated configuration',
    })
  }

  // 10. Update Owner Name
  async function updateOwner(ownerId: string, newName: string): Promise<void> {
    if (!newName || newName.trim() === '') {
      throw new Error('Owner name cannot be empty.')
    }
    const cleanName = newName.trim()
    let updatedOwnersList: Owner[] = []
    setOwners((prev) => {
      updatedOwnersList = prev.map((o) =>
        o.id === ownerId ? { ...o, name: cleanName } : o
      )
      persist({ owners: updatedOwnersList })
      return updatedOwnersList
    })
    addAudit('OWNER_UPDATED', 'owner', ownerId, { newName: cleanName })
  }

  // 10b. Update All Owners Atomically
  async function updateOwners(newOwners: { id: string; name: string }[]): Promise<void> {
    for (const o of newOwners) {
      if (!o.name || o.name.trim() === '') {
        throw new Error('Owner name cannot be empty.')
      }
    }
    const nameMap = new Map(newOwners.map((o) => [o.id, o.name.trim()]))
    let updatedOwnersList: Owner[] = []
    setOwners((prev) => {
      updatedOwnersList = prev.map((o) => {
        const mapped = nameMap.get(o.id)
        return mapped !== undefined ? { ...o, name: mapped } : o
      })
      persist({ owners: updatedOwnersList })
      return updatedOwnersList
    })
    addAudit('OWNERS_BULK_UPDATED', 'owners', undefined, {
      owners: newOwners.map((o) => ({ id: o.id, name: o.name.trim() })),
    })
  }

  // 10c. Reallocate / Transfer Funds Between Buckets
  async function addBucketTransfer(data: {
    fromBucket: 'table_recovery' | 'festival_fund'
    toBucket: 'table_recovery' | 'festival_fund' | 'owner_profit'
    amountPaise: number
    notes?: string
    transferredAt?: string
  }): Promise<BucketTransfer> {
    if (data.amountPaise <= 0) {
      throw new Error('Transfer amount must be greater than zero.')
    }
    if (data.fromBucket === data.toBucket) {
      throw new Error('Source and destination buckets must be different.')
    }

    const currentTable = summary.tableRecoveryAccumulatedPaise
    const currentFestival = summary.festivalFundAccumulatedPaise

    if (data.fromBucket === 'table_recovery' && data.amountPaise > currentTable) {
      throw new Error(
        `Cannot transfer ₹${(data.amountPaise / 100).toLocaleString('en-IN')}: Current Table Recovery balance is ₹${(currentTable / 100).toLocaleString('en-IN')}.`
      )
    }
    if (data.fromBucket === 'festival_fund' && data.amountPaise > currentFestival) {
      throw new Error(
        `Cannot transfer ₹${(data.amountPaise / 100).toLocaleString('en-IN')}: Current Festival Fund balance is ₹${(currentFestival / 100).toLocaleString('en-IN')}.`
      )
    }

    const newTransfer: BucketTransfer = {
      id: `transfer-${Date.now()}`,
      transferredAt: data.transferredAt || new Date().toISOString(),
      fromBucket: data.fromBucket,
      toBucket: data.toBucket,
      amountPaise: data.amountPaise,
      notes: data.notes,
      status: 'active',
    }

    const updatedTransfers = [...transfers, newTransfer]
    setTransfers(updatedTransfers)
    persist({ transfers: updatedTransfers })

    addAudit('BUCKET_FUNDS_REALLOCATED', 'bucket_transfer', newTransfer.id, {
      fromBucket: data.fromBucket,
      toBucket: data.toBucket,
      amountPaise: data.amountPaise,
      notes: data.notes,
    })

    return newTransfer
  }

  // 10d. Void Bucket Transfer
  async function voidBucketTransfer(transferId: string, reason: string): Promise<void> {
    if (!reason || reason.trim() === '') {
      throw new Error('A reason is strictly required to void a transfer.')
    }
    const target = transfers.find((t) => t.id === transferId)
    if (!target) throw new Error('Transfer record not found.')
    if (target.status === 'voided') throw new Error('Transfer is already voided.')

    const updated = transfers.map((t) =>
      t.id === transferId ? { ...t, status: 'voided' as const, voidReason: reason } : t
    )
    setTransfers(updated)
    persist({ transfers: updated })

    addAudit('BUCKET_TRANSFER_VOIDED', 'bucket_transfer', transferId, {
      amountPaise: target.amountPaise,
      reason,
    })
  }

  // 11. Reset to initial seed
  function resetToInitialSeed() {
    const seed = generateInitialSeedState()
    applySeedState(seed)
  }

  // 11b. Clear Database to Start Fresh from Scratch
  function clearDatabase() {
    setPlayers([])
    setGames([])
    setHistoricalRake([])
    setPayments([])
    setExpenses([])
    setSettlements([])
    setTransfers([])

    const clearedAudit: AuditLogEntry = {
      id: `audit-clear-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'DATABASE_CLEARED',
      entityType: 'ledger',
      metadata: { reason: 'User cleared ledger to start completely fresh from scratch' },
    }
    setAuditLog([clearedAudit])

    const cleared = {
      owners,
      players: [],
      games: [],
      historicalRake: [],
      payments: [],
      expenses: [],
      settlements: [],
      transfers: [],
      settings,
      auditLog: [clearedAudit],
      isCleared: true,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleared))
  }

  // 12. CSV Export
  function exportCSV(type: 'summary' | 'players' | 'games' | 'payments' | 'expenses' | 'settlements') {
    let filename = `poker-ledger-${type}-${new Date().toISOString().split('T')[0]}.csv`
    let csvContent = ''

    if (type === 'players') {
      csvContent = 'Player Name,Total Rake Generated (INR),Total Paid (INR),Outstanding (INR)\n'
      for (const p of players) {
        const gen = historicalRake
          .filter((h) => h.playerId === p.id && h.status === 'active')
          .reduce((s, h) => s + h.amountPaise, 0) / 100
        const paid = payments
          .filter((pay) => pay.playerId === p.id && pay.status === 'active')
          .reduce((s, pay) => s + pay.amountPaise, 0) / 100
        const out = Math.max(0, gen - paid)
        csvContent += `"${p.name}",${gen},${paid},${out}\n`
      }
    } else if (type === 'games') {
      csvContent = 'Game #,Date,Status,Gross Rake (INR),Expenses (INR),Net Rake (INR),Table Alloc (INR),Festival Alloc (INR),Distributable (INR)\n'
      for (const g of summary.gameResults) {
        csvContent += `${g.gameNumber},"${new Date(g.playedAt).toLocaleDateString()}",active,${g.grossRakePaise / 100},${g.totalExpensePaise / 100},${g.netRakePaise / 100},${g.tableRecoveryAllocatedPaise / 100},${g.festivalFundAllocatedPaise / 100},${g.distributableRakePaise / 100}\n`
      }
    } else if (type === 'expenses') {
      csvContent = 'Date,Type,Description,Amount (INR),Game ID,Status\n'
      for (const e of expenses) {
        csvContent += `"${new Date(e.expenseDate).toLocaleDateString()}",${e.type},"${e.description.replace(/"/g, '""')}",${e.amountPaise / 100},${e.gameId || 'None'},${e.status}\n`
      }
    } else if (type === 'payments') {
      csvContent = 'Date,Player ID,Amount (INR),Notes,Status\n'
      for (const p of payments) {
        csvContent += `"${new Date(p.paidAt).toLocaleDateString()}",${p.playerId},${p.amountPaise / 100},"${(p.notes || '').replace(/"/g, '""')}",${p.status}\n`
      }
    } else if (type === 'settlements') {
      csvContent = 'Date,Owner ID,Amount (INR),Notes,Status\n'
      for (const s of settlements) {
        csvContent += `"${new Date(s.settledAt).toLocaleDateString()}",${s.ownerId},${s.amountPaise / 100},"${(s.notes || '').replace(/"/g, '""')}",${s.status}\n`
      }
    } else {
      // Summary
      csvContent = 'Metric,Amount (INR)\n'
      csvContent += `Total Rake Generated,${summary.totalRakeGeneratedPaise / 100}\n`
      csvContent += `Total Rake Collected,${summary.totalRakeCollectedPaise / 100}\n`
      csvContent += `Total Outstanding,${summary.totalOutstandingPaise / 100}\n`
      csvContent += `Table Recovery Accumulated,${summary.tableRecoveryAccumulatedPaise / 100}\n`
      csvContent += `Table Recovery Target,${summary.tableRecoveryTargetPaise / 100}\n`
      csvContent += `Festival Fund Accumulated,${summary.festivalFundAccumulatedPaise / 100}\n`
      csvContent += `Festival Fund Target,${summary.festivalFundTargetPaise / 100}\n`
      csvContent += `Total Distributable Rake,${summary.totalDistributableRakePaise / 100}\n`
      csvContent += `Total Owner Entitlement,${summary.totalOwnerEntitlementPaise / 100}\n`
      csvContent += `Total Owner Settled,${summary.totalOwnerSettledPaise / 100}\n`
      csvContent += `Remaining Owner Settlement,${summary.remainingOwnerSettlementPaise / 100}\n`
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 13. Auth
  async function signIn(email: string, pass: string) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      })
      if (!error && data.session) {
        setIsAuthenticated(true)
        setUserEmail(data.session.user.email || null)
      }
      return { error }
    } else {
      // Local development auth
      setIsAuthenticated(true)
      setUserEmail(email || 'admin@ledger.local')
      return { error: null }
    }
  }

  async function signOut() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    setIsAuthenticated(false)
    setUserEmail(null)
  }

  return (
    <LedgerContext.Provider
      value={{
        owners,
        players,
        games,
        historicalRake,
        payments,
        expenses,
        settlements,
        transfers,
        settings,
        auditLog,
        summary,
        isLoading,
        isOnlineMode: isSupabaseConfigured,
        isAuthenticated,
        userEmail,
        addGame,
        voidGame,
        addHistoricalRake,
        addPayment,
        voidPayment,
        addExpense,
        voidExpense,
        recordOwnerSettlement,
        addBucketTransfer,
        voidBucketTransfer,
        updateSettings,
        updateOwner,
        updateOwners,
        resetToInitialSeed,
        clearDatabase,
        exportCSV,
        signIn,
        signOut,
      }}
    >
      {children}
    </LedgerContext.Provider>
  )
}

export function useLedger(): LedgerContextType {
  const context = useContext(LedgerContext)
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider')
  }
  return context
}
