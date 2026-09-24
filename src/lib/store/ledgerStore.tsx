import React, { createContext, useContext, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
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
    receivedByOwnerId?: string
  }) => Promise<{ rake: HistoricalRakeEntry; payment?: PlayerPayment }>

  addPayment: (data: {
    playerId: string
    amountPaise: number
    paidAt?: string
    notes?: string
    receivedByOwnerId?: string
  }) => Promise<PlayerPayment>

  voidPayment: (paymentId: string, reason: string) => Promise<void>

  addExpense: (data: {
    type: 'session_expense' | 'monthly_expense' | 'credit_adjustment'
    amountPaise: number
    description: string
    expenseDate?: string
    gameId?: string | null
    paidByOwnerId?: string
  }) => Promise<GeneralExpense>

  voidExpense: (expenseId: string, reason: string) => Promise<void>

  recordOwnerSettlement: (data: {
    ownerId: string
    amountPaise: number
    settledAt?: string
    notes?: string
    paidByOwnerId?: string
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
  syncLocalToCloud: () => Promise<void>
  exportCSV: (type: 'summary' | 'players' | 'games' | 'payments' | 'expenses' | 'settlements') => void
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const STORAGE_KEY = 'poker_rake_ledger_local_state_v1'

function safeSupabaseOp(fn: (client: SupabaseClient) => Promise<any> | any) {
  if (isSupabaseConfigured && supabase) {
    try {
      const res = fn(supabase)
      if (res && typeof res.then === 'function') {
        res.then(undefined, (e: any) => console.warn('Supabase operation warning:', e))
      }
    } catch (e: any) {
      console.warn('Supabase operation exception:', e)
    }
  }
}

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
    transfers: [] as BucketTransfer[],
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

  // Load state on mount (Cloud Supabase first if configured, LocalStorage cache as fallback)
  useEffect(() => {
    async function init() {
      setIsLoading(true)

      // 1. Check local storage cache first to display immediately
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
          console.error('Error loading saved local state:', err)
        }
      }

      // 2. If Supabase is configured, pull the authoritative remote database
      if (isSupabaseConfigured && supabase) {
        const client = supabase
        try {
          const { data: { session } } = await client.auth.getSession()
          if (session?.user) {
            setIsAuthenticated(true)
            setUserEmail(session.user.email || null)
          }

          await fetchCloudState()

          // Subscribe to Supabase Realtime for automatic multi-device synchronization
          const channel = client
            .channel('public:ledger_live_sync')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
              fetchCloudState()
            })
            .subscribe()

          setIsLoading(false)
          return () => {
            client.removeChannel(channel)
          }
        } catch (e) {
          console.warn('Supabase fetch failed, continuing with local storage:', e)
        }
      }

      setIsLoading(false)
    }

    init()
  }, [])

  async function fetchCloudState() {
    if (!isSupabaseConfigured || !supabase) return

    try {
      const [
        { data: dbOwners },
        { data: dbPlayers },
        { data: dbGames },
        { data: dbGameOwners },
        { data: dbRake },
        { data: dbPayments },
        { data: dbExpenses },
        { data: dbSettlements },
        { data: dbTransfers },
        { data: dbSettings },
        { data: dbAudit },
      ] = await Promise.all([
        supabase.from('owners').select('*').order('name'),
        supabase.from('players').select('*').order('name'),
        supabase.from('games').select('*').order('game_number', { ascending: true }),
        supabase.from('game_owners').select('*'),
        supabase.from('rake_entries').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('owner_settlements').select('*'),
        supabase.from('bucket_transfers').select('*'),
        supabase.from('settings').select('*'),
        supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100),
      ])

      let loadedOwners = owners
      if (dbOwners && dbOwners.length > 0) {
        loadedOwners = dbOwners.map((o: any) => ({
          id: o.id,
          name: o.name,
          isActive: o.is_active ?? true,
        }))
        setOwners(loadedOwners)
      }

      let loadedPlayers: Player[] = []
      if (dbPlayers) {
        loadedPlayers = dbPlayers.map((p: any) => ({
          id: p.id,
          name: p.name,
          createdAt: p.created_at,
        }))
        setPlayers(loadedPlayers)
      }

      let loadedGames: GameRecord[] = []
      if (dbGames) {
        loadedGames = dbGames.map((g: any) => {
          const gameExpenses: SessionExpense[] = (dbExpenses || [])
            .filter((e: any) => e.game_id === g.id && e.expense_type === 'session_expense')
            .map((e: any) => ({
              id: e.id,
              description: e.description,
              amountPaise: Number(e.amount_paise),
              paidByOwnerId: e.paid_by_owner_id || undefined,
            }))

          const gameAttendance: OwnerAttendance[] = (dbGameOwners || [])
            .filter((go: any) => go.game_id === g.id)
            .map((go: any) => ({
              ownerId: go.owner_id,
              present: Boolean(go.present),
            }))

          return {
            id: g.id,
            gameNumber: g.game_number,
            playedAt: g.played_at,
            grossRakePaise: Number(g.gross_rake_paise),
            customAllocation: g.custom_allocation,
            expenses: gameExpenses,
            owners: gameAttendance,
            status: g.status,
            notes: g.notes,
            voidReason: g.void_reason,
          }
        })
        setGames(loadedGames)
      }

      let loadedRake: HistoricalRakeEntry[] = []
      if (dbRake) {
        loadedRake = dbRake
          .filter((r: any) => r.entry_type === 'historical')
          .map((r: any) => ({
            id: r.id,
            playerId: r.player_id,
            amountPaise: Number(r.amount_paise),
            entryDate: r.entry_date,
            status: r.status,
            notes: r.notes,
            voidReason: r.void_reason,
          }))
        setHistoricalRake(loadedRake)
      }

      let loadedPayments: PlayerPayment[] = []
      if (dbPayments) {
        loadedPayments = dbPayments.map((p: any) => ({
          id: p.id,
          playerId: p.player_id,
          amountPaise: Number(p.amount_paise),
          paidAt: p.paid_at,
          notes: p.notes,
          status: p.status,
          voidReason: p.void_reason,
          receivedByOwnerId: p.received_by_owner_id || undefined,
        }))
        setPayments(loadedPayments)
      }

      let loadedExpenses: GeneralExpense[] = []
      if (dbExpenses) {
        loadedExpenses = dbExpenses
          .filter((e: any) => e.expense_type !== 'session_expense' || !e.game_id)
          .map((e: any) => ({
            id: e.id,
            type: e.expense_type,
            amountPaise: Number(e.amount_paise),
            description: e.description,
            expenseDate: e.expense_date,
            gameId: e.game_id,
            status: e.status,
            voidReason: e.void_reason,
            paidByOwnerId: e.paid_by_owner_id || undefined,
          }))
        setExpenses(loadedExpenses)
      }

      let loadedSettlements: OwnerSettlement[] = []
      if (dbSettlements) {
        loadedSettlements = dbSettlements.map((s: any) => ({
          id: s.id,
          ownerId: s.owner_id,
          amountPaise: Number(s.amount_paise),
          settledAt: s.settled_at,
          notes: s.notes,
          status: s.status,
          voidReason: s.void_reason,
          paidByOwnerId: s.paid_by_owner_id || undefined,
        }))
        setSettlements(loadedSettlements)
      }

      let loadedTransfers: BucketTransfer[] = []
      if (dbTransfers) {
        loadedTransfers = dbTransfers.map((t: any) => ({
          id: t.id,
          fromBucket: t.from_bucket,
          toBucket: t.to_bucket,
          amountPaise: Number(t.amount_paise),
          transferredAt: t.transferred_at,
          notes: t.notes,
          status: t.status,
          voidReason: t.void_reason,
        }))
        setTransfers(loadedTransfers)
      }

      let loadedSettings = { ...DEFAULT_ACCOUNTING_SETTINGS }
      if (dbSettings && dbSettings.length > 0) {
        for (const row of dbSettings) {
          if (row.key === 'table_recovery_target' && row.value?.amount_paise != null) {
            loadedSettings.tableRecoveryTargetPaise = Number(row.value.amount_paise)
          } else if (row.key === 'festival_fund_target' && row.value?.amount_paise != null) {
            loadedSettings.festivalFundTargetPaise = Number(row.value.amount_paise)
          } else if (row.key === 'equal_distribution_threshold' && row.value?.amount_paise != null) {
            loadedSettings.equalDistributionThresholdPaise = Number(row.value.amount_paise)
          } else if (row.key === 'absent_owner_percentage' && row.value?.percentage != null) {
            loadedSettings.absentOwnerPercentage = Number(row.value.percentage)
          }
        }
        setSettings(loadedSettings)
      }

      let loadedAudit: AuditLogEntry[] = []
      if (dbAudit) {
        loadedAudit = dbAudit.map((a: any) => ({
          id: a.id,
          timestamp: a.created_at,
          action: a.action,
          entityType: a.entity_type,
          entityId: a.entity_id,
          metadata: a.metadata,
        }))
        setAuditLog(loadedAudit)
      }

      persist({
        owners: loadedOwners,
        players: loadedPlayers,
        games: loadedGames,
        historicalRake: loadedRake,
        payments: loadedPayments,
        expenses: loadedExpenses,
        settlements: loadedSettlements,
        transfers: loadedTransfers,
        settings: loadedSettings,
        auditLog: loadedAudit,
      })
    } catch (err) {
      console.warn('Supabase fetch error, maintaining local cache:', err)
    }
  }

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

    safeSupabaseOp((client) =>
      client.from('audit_log').insert({
        id: entry.id,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        metadata: entry.metadata,
      })
    )
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

    // Cloud DB write
    safeSupabaseOp(async (client) => {
      await client.from('games').insert({
        id: newGame.id,
        game_number: newGame.gameNumber,
        played_at: newGame.playedAt,
        gross_rake_paise: newGame.grossRakePaise,
        custom_allocation: newGame.customAllocation,
        notes: newGame.notes,
        status: 'active',
      })

      if (data.owners && data.owners.length > 0) {
        await client.from('game_owners').insert(
          data.owners.map((o) => ({
            game_id: newGame.id,
            owner_id: o.ownerId,
            present: o.present,
          }))
        )
      }

      if (data.expenses && data.expenses.length > 0) {
        await client.from('expenses').insert(
          data.expenses.map((e) => ({
            id: e.id,
            game_id: newGame.id,
            amount_paise: e.amountPaise,
            expense_type: 'session_expense',
            description: e.description,
            expense_date: newGame.playedAt,
            status: 'active',
            paid_by_owner_id: e.paidByOwnerId || null,
          }))
        )
      }
    })

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

    safeSupabaseOp((client) =>
      client.from('games').update({
        status: 'voided',
        void_reason: reason,
      }).eq('id', gameId)
    )

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
    receivedByOwnerId?: string
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

        safeSupabaseOp((client) =>
          client.from('players').insert({
            id: newPlayer.id,
            name: newPlayer.name,
            created_at: newPlayer.createdAt,
          })
        )

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

    safeSupabaseOp((client) =>
      client.from('rake_entries').insert({
        id: newRake.id,
        player_id: newRake.playerId,
        amount_paise: newRake.amountPaise,
        entry_type: 'historical',
        entry_date: newRake.entryDate,
        notes: newRake.notes,
        status: 'active',
      })
    )

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
        receivedByOwnerId: data.receivedByOwnerId,
      }
      updatedPayments.push(newPayment)
      setPayments(updatedPayments)

      safeSupabaseOp((client) =>
        client.from('payments').insert({
          id: newPayment!.id,
          player_id: newPayment!.playerId,
          amount_paise: newPayment!.amountPaise,
          paid_at: newPayment!.paidAt,
          notes: newPayment!.notes,
          status: 'active',
          received_by_owner_id: data.receivedByOwnerId || null,
        })
      )
    }

    persist({
      players: updatedPlayers,
      historicalRake: updatedHistorical,
      payments: updatedPayments,
    })

    addAudit('HISTORICAL_RAKE_ADDED', 'historical_rake', newRake.id, {
      playerId: targetPlayerId,
      amountPaise: data.amountPaise,
      paidAmountPaise: data.paidAmountPaise,
    })

    return { rake: newRake, payment: newPayment }
  }

  // 4. Add Payment
  async function addPayment(data: {
    playerId: string
    amountPaise: number
    paidAt?: string
    notes?: string
    receivedByOwnerId?: string
  }): Promise<PlayerPayment> {
    if (data.amountPaise <= 0) {
      throw new Error('Payment amount must be greater than zero.')
    }
    const player = players.find((p) => p.id === data.playerId)
    if (!player) throw new Error('Player not found.')

    const newPayment: PlayerPayment = {
      id: `pay-${Date.now()}`,
      playerId: data.playerId,
      amountPaise: data.amountPaise,
      paidAt: data.paidAt || new Date().toISOString(),
      notes: data.notes,
      status: 'active',
      receivedByOwnerId: data.receivedByOwnerId,
    }

    const updatedPayments = [...payments, newPayment]
    setPayments(updatedPayments)
    persist({ payments: updatedPayments })

    safeSupabaseOp((client) =>
      client.from('payments').insert({
        id: newPayment.id,
        player_id: newPayment.playerId,
        amount_paise: newPayment.amountPaise,
        paid_at: newPayment.paidAt,
        notes: newPayment.notes,
        status: 'active',
        received_by_owner_id: newPayment.receivedByOwnerId || null,
      })
    )

    addAudit('PAYMENT_RECORDED', 'payment', newPayment.id, {
      playerId: data.playerId,
      playerName: player.name,
      amountPaise: data.amountPaise,
      receivedByOwnerId: data.receivedByOwnerId,
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

    safeSupabaseOp((client) =>
      client.from('payments').update({
        status: 'voided',
        void_reason: reason,
      }).eq('id', paymentId)
    )

    addAudit('PAYMENT_VOIDED', 'payment', paymentId, { reason })
  }

  // 6. Add Expense
  async function addExpense(data: {
    type: 'session_expense' | 'monthly_expense' | 'credit_adjustment'
    amountPaise: number
    description: string
    expenseDate?: string
    gameId?: string | null
    paidByOwnerId?: string
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
      paidByOwnerId: data.paidByOwnerId,
    }

    const updatedExpenses = [...expenses, newExpense]
    setExpenses(updatedExpenses)
    persist({ expenses: updatedExpenses })

    safeSupabaseOp((client) =>
      client.from('expenses').insert({
        id: newExpense.id,
        game_id: newExpense.gameId,
        amount_paise: newExpense.amountPaise,
        expense_type: newExpense.type,
        description: newExpense.description,
        expense_date: newExpense.expenseDate,
        status: 'active',
        paid_by_owner_id: newExpense.paidByOwnerId || null,
      })
    )

    addAudit('EXPENSE_RECORDED', 'expense', newExpense.id, {
      type: data.type,
      amountPaise: data.amountPaise,
      description: data.description,
      gameId: data.gameId,
      paidByOwnerId: data.paidByOwnerId,
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

    safeSupabaseOp((client) =>
      client.from('expenses').update({
        status: 'voided',
        void_reason: reason,
      }).eq('id', expenseId)
    )

    addAudit('EXPENSE_VOIDED', 'expense', expenseId, { reason })
  }

  // 8. Record Owner Settlement
  async function recordOwnerSettlement(data: {
    ownerId: string
    amountPaise: number
    settledAt?: string
    notes?: string
    paidByOwnerId?: string
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
      paidByOwnerId: data.paidByOwnerId,
    }

    const updatedSettlements = [...settlements, newSettlement]
    setSettlements(updatedSettlements)
    persist({ settlements: updatedSettlements })

    safeSupabaseOp((client) =>
      client.from('owner_settlements').insert({
        id: newSettlement.id,
        owner_id: newSettlement.ownerId,
        amount_paise: newSettlement.amountPaise,
        settled_at: newSettlement.settledAt,
        notes: newSettlement.notes,
        status: 'active',
        paid_by_owner_id: newSettlement.paidByOwnerId || null,
      })
    )

    addAudit('OWNER_SETTLEMENT_RECORDED', 'owner_settlement', newSettlement.id, {
      ownerId: data.ownerId,
      ownerName: owner.name,
      amountPaise: data.amountPaise,
      paidByOwnerId: data.paidByOwnerId,
    })

    return newSettlement
  }

  // 9. Update Settings
  async function updateSettings(newSettings: Partial<AccountingSettings>, reason?: string): Promise<void> {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    persist({ settings: updated })

    safeSupabaseOp((client) =>
      client.from('settings').upsert([
        { key: 'table_recovery_target', value: { amount_paise: updated.tableRecoveryTargetPaise } },
        { key: 'festival_fund_target', value: { amount_paise: updated.festivalFundTargetPaise } },
        { key: 'equal_distribution_threshold', value: { amount_paise: updated.equalDistributionThresholdPaise } },
        { key: 'absent_owner_percentage', value: { percentage: updated.absentOwnerPercentage } },
      ])
    )

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

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('owners').upsert({
        id: ownerId,
        name: cleanName,
        is_active: true,
      })
      if (error) {
        console.error('Supabase owner update error:', error)
        throw new Error(`Failed to save owner to cloud database: ${error.message}`)
      }
    }

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

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('owners').upsert(
        newOwners.map((o) => ({
          id: o.id,
          name: o.name.trim(),
          is_active: true,
        }))
      )
      if (error) {
        console.error('Supabase owners bulk update error:', error)
        throw new Error(`Failed to save owner names to cloud database: ${error.message}`)
      }
    }

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

    safeSupabaseOp((client) =>
      client.from('bucket_transfers').insert({
        id: newTransfer.id,
        from_bucket: newTransfer.fromBucket,
        to_bucket: newTransfer.toBucket,
        amount_paise: newTransfer.amountPaise,
        transferred_at: newTransfer.transferredAt,
        notes: newTransfer.notes,
        status: 'active',
      })
    )

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

    safeSupabaseOp((client) =>
      client.from('bucket_transfers').update({
        status: 'voided',
        void_reason: reason,
      }).eq('id', transferId)
    )

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

    safeSupabaseOp(async (client) => {
      await Promise.all([
        client.from('payments').delete().neq('id', 'dummy_id_never_matches'),
        client.from('rake_entries').delete().neq('id', 'dummy_id_never_matches'),
        client.from('expenses').delete().neq('id', 'dummy_id_never_matches'),
        client.from('owner_settlements').delete().neq('id', 'dummy_id_never_matches'),
        client.from('game_owners').delete().neq('game_id', 'dummy_id_never_matches'),
        client.from('games').delete().neq('id', 'dummy_id_never_matches'),
        client.from('bucket_transfers').delete().neq('id', 'dummy_id_never_matches'),
        client.from('players').delete().neq('id', 'dummy_id_never_matches'),
      ])
    })
  }

  // 11c. Sync Local Data to Cloud
  async function syncLocalToCloud() {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.')
    }
    const client = supabase

    // 1. Sync owners
    if (owners.length > 0) {
      await client.from('owners').upsert(
        owners.map((o) => ({ id: o.id, name: o.name, is_active: o.isActive }))
      )
    }

    // 2. Sync players
    if (players.length > 0) {
      await client.from('players').upsert(
        players.map((p) => ({ id: p.id, name: p.name, created_at: p.createdAt }))
      )
    }

    // 3. Sync games
    if (games.length > 0) {
      for (const g of games) {
        await client.from('games').upsert({
          id: g.id,
          game_number: g.gameNumber,
          played_at: g.playedAt,
          gross_rake_paise: g.grossRakePaise,
          custom_allocation: g.customAllocation,
          status: g.status,
          notes: g.notes,
          void_reason: g.voidReason,
        })
        if (g.owners && g.owners.length > 0) {
          await client.from('game_owners').upsert(
            g.owners.map((o) => ({
              game_id: g.id,
              owner_id: o.ownerId,
              present: o.present,
            }))
          )
        }
        if (g.expenses && g.expenses.length > 0) {
          await client.from('expenses').upsert(
            g.expenses.map((e) => ({
              id: e.id,
              game_id: g.id,
              amount_paise: e.amountPaise,
              expense_type: 'session_expense',
              description: e.description,
              expense_date: g.playedAt,
              paid_by_owner_id: e.paidByOwnerId || null,
            }))
          )
        }
      }
    }

    // 4. Sync historical rake
    if (historicalRake.length > 0) {
      await client.from('rake_entries').upsert(
        historicalRake.map((r) => ({
          id: r.id,
          player_id: r.playerId,
          amount_paise: r.amountPaise,
          entry_type: 'historical',
          entry_date: r.entryDate,
          notes: r.notes,
          status: r.status,
          void_reason: r.voidReason,
        }))
      )
    }

    // 5. Sync payments
    if (payments.length > 0) {
      await client.from('payments').upsert(
        payments.map((p) => ({
          id: p.id,
          player_id: p.playerId,
          amount_paise: p.amountPaise,
          paid_at: p.paidAt,
          notes: p.notes,
          status: p.status,
          void_reason: p.voidReason,
          received_by_owner_id: p.receivedByOwnerId || null,
        }))
      )
    }

    // 6. Sync general expenses
    if (expenses.length > 0) {
      await client.from('expenses').upsert(
        expenses.map((e) => ({
          id: e.id,
          game_id: e.gameId,
          amount_paise: e.amountPaise,
          expense_type: e.type,
          description: e.description,
          expense_date: e.expenseDate,
          status: e.status,
          void_reason: e.voidReason,
          paid_by_owner_id: e.paidByOwnerId || null,
        }))
      )
    }

    // 7. Sync settlements
    if (settlements.length > 0) {
      await client.from('owner_settlements').upsert(
        settlements.map((s) => ({
          id: s.id,
          owner_id: s.ownerId,
          amount_paise: s.amountPaise,
          settled_at: s.settledAt,
          notes: s.notes,
          status: s.status,
          void_reason: s.voidReason,
          paid_by_owner_id: s.paidByOwnerId || null,
        }))
      )
    }

    // 8. Sync transfers
    if (transfers.length > 0) {
      await client.from('bucket_transfers').upsert(
        transfers.map((t) => ({
          id: t.id,
          from_bucket: t.fromBucket,
          to_bucket: t.toBucket,
          amount_paise: t.amountPaise,
          transferred_at: t.transferredAt,
          notes: t.notes,
          status: t.status,
          void_reason: t.voidReason,
        }))
      )
    }

    // 9. Sync settings
    await client.from('settings').upsert([
      { key: 'table_recovery_target', value: { amount_paise: settings.tableRecoveryTargetPaise } },
      { key: 'festival_fund_target', value: { amount_paise: settings.festivalFundTargetPaise } },
      { key: 'equal_distribution_threshold', value: { amount_paise: settings.equalDistributionThresholdPaise } },
      { key: 'absent_owner_percentage', value: { percentage: settings.absentOwnerPercentage } },
    ])
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
        syncLocalToCloud,
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
