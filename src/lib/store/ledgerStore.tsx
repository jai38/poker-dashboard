import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
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
  GamePlayerRakeInput,
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
    playerRakes?: GamePlayerRakeInput[]
    hostOwnerId?: string
  }) => Promise<GameRecord>

  voidGame: (gameId: string, reason: string) => Promise<void>
  deleteGame: (gameId: string) => Promise<void>

  addHistoricalRake: (data: {
    playerId?: string
    playerName?: string
    amountPaise: number
    paidAmountPaise?: number
    entryDate?: string
    notes?: string
    receivedByOwnerId?: string
  }) => Promise<{ rake: HistoricalRakeEntry; payment?: PlayerPayment }>
  editHistoricalRake: (rakeId: string, data: {
    playerId?: string
    amountPaise: number
    entryDate?: string
    notes?: string
  }) => Promise<HistoricalRakeEntry>
  deleteHistoricalRake: (rakeId: string) => Promise<void>
  voidHistoricalRake: (rakeId: string, reason: string) => Promise<void>

  addPayment: (data: {
    playerId: string
    amountPaise: number
    paidAt?: string
    notes?: string
    receivedByOwnerId?: string
  }) => Promise<PlayerPayment>
  editPayment: (paymentId: string, data: {
    playerId?: string
    amountPaise: number
    paidAt?: string
    notes?: string
    receivedByOwnerId?: string
  }) => Promise<PlayerPayment>
  deletePayment: (paymentId: string) => Promise<void>
  transferBetweenMembers: (data: {
    toPlayerId: string
    sources: Array<{ fromPlayerId: string; amountPaise: number }>
    transferDate?: string
    notes?: string
  }) => Promise<{ payments: PlayerPayment[]; rakes: HistoricalRakeEntry[] }>

  voidPayment: (paymentId: string, reason: string) => Promise<void>
  updatePaymentCollector: (paymentId: string, ownerId?: string) => Promise<void>
  assignAllUnassignedPayments: (ownerId: string) => Promise<void>

  addSessionExpense: (
    gameId: string,
    expense: { description: string; amountPaise: number; paidByOwnerId?: string }
  ) => Promise<void>
  removeSessionExpense: (gameId: string, expenseId: string, reason?: string) => Promise<void>

  addExpense: (data: {
    type: 'session_expense' | 'monthly_expense' | 'credit_adjustment'
    amountPaise: number
    description: string
    expenseDate?: string
    gameId?: string | null
    paidByOwnerId?: string
  }) => Promise<GeneralExpense>
  editExpense: (expenseId: string, data: {
    type: 'session_expense' | 'monthly_expense' | 'credit_adjustment'
    amountPaise: number
    description: string
    expenseDate?: string
    paidByOwnerId?: string
  }) => Promise<GeneralExpense>
  deleteExpense: (expenseId: string) => Promise<void>

  voidExpense: (expenseId: string, reason: string) => Promise<void>

  recordOwnerSettlement: (data: {
    ownerId: string
    amountPaise: number
    settledAt?: string
    notes?: string
    paidByOwnerId?: string
  }) => Promise<OwnerSettlement>
  editOwnerSettlement: (settlementId: string, data: {
    ownerId?: string
    amountPaise: number
    settledAt?: string
    notes?: string
    paidByOwnerId?: string
  }) => Promise<OwnerSettlement>
  deleteOwnerSettlement: (settlementId: string) => Promise<void>
  voidOwnerSettlement: (settlementId: string, reason: string) => Promise<void>

  addBucketTransfer: (data: {
    fromBucket: 'table_recovery' | 'festival_fund'
    toBucket: 'table_recovery' | 'festival_fund' | 'owner_profit'
    amountPaise: number
    notes?: string
    transferredAt?: string
    deductedFromOwnerId?: string
  }) => Promise<BucketTransfer>
  editBucketTransfer: (transferId: string, data: {
    fromBucket?: 'table_recovery' | 'festival_fund'
    toBucket?: 'table_recovery' | 'festival_fund' | 'owner_profit'
    amountPaise: number
    notes?: string
    transferredAt?: string
    deductedFromOwnerId?: string
  }) => Promise<BucketTransfer>
  deleteBucketTransfer: (transferId: string) => Promise<void>

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
        res.then(
          (result: any) => {
            if (result && result.error) {
              console.warn('Supabase operation error:', result.error)
            }
          },
          (e: any) => console.warn('Supabase operation warning:', e)
        )
      }
    } catch (e: any) {
      console.warn('Supabase operation exception:', e)
    }
  }
}

async function insertExpenseResilient(client: SupabaseClient, row: any) {
  const { error } = await client.from('expenses').insert(row)
  if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('paid_by_owner_id'))) {
    console.warn('Expenses table missing paid_by_owner_id column. Retrying insert without it:', error.message)
    const { paid_by_owner_id, ...fallback } = row
    return await client.from('expenses').insert(fallback)
  }
  return { error }
}

async function insertExpensesBatchResilient(client: SupabaseClient, rows: any[]) {
  const { error } = await client.from('expenses').insert(rows)
  if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('paid_by_owner_id'))) {
    console.warn('Expenses table missing paid_by_owner_id column. Retrying batch insert without it:', error.message)
    const fallbackRows = rows.map(({ paid_by_owner_id, ...rest }) => rest)
    return await client.from('expenses').insert(fallbackRows)
  }
  return { error }
}

async function insertPaymentResilient(client: SupabaseClient, row: any) {
  const { error } = await client.from('payments').insert(row)
  if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('received_by_owner_id'))) {
    console.warn('Payments table missing received_by_owner_id column. Retrying insert without it:', error.message)
    const { received_by_owner_id, ...fallback } = row
    return await client.from('payments').insert(fallback)
  }
  return { error }
}

async function insertPaymentsBatchResilient(client: SupabaseClient, rows: any[]) {
  const { error } = await client.from('payments').insert(rows)
  if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('received_by_owner_id'))) {
    console.warn('Payments table missing received_by_owner_id column. Retrying batch insert without it:', error.message)
    const fallbackRows = rows.map(({ received_by_owner_id, ...rest }) => rest)
    return await client.from('payments').insert(fallbackRows)
  }
  return { error }
}

async function insertSettlementResilient(client: SupabaseClient, row: any) {
  const { error } = await client.from('owner_settlements').insert(row)
  if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('paid_by_owner_id'))) {
    console.warn('Owner settlements table missing paid_by_owner_id column. Retrying insert without it:', error.message)
    const { paid_by_owner_id, ...fallback } = row
    return await client.from('owner_settlements').insert(fallback)
  }
  return { error }
}

async function insertBucketTransferResilient(client: SupabaseClient, row: any) {
  const { error } = await client.from('bucket_transfers').insert(row)
  if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('deducted_from_owner_id'))) {
    console.warn('Bucket transfers table missing deducted_from_owner_id column. Retrying insert with encoded note:', error.message)
    const { deducted_from_owner_id, ...fallback } = row
    if (deducted_from_owner_id) {
      const tag = `[deducted_owner:${deducted_from_owner_id}]`
      fallback.notes = fallback.notes ? `${tag} ${fallback.notes}` : tag
    }
    return await client.from('bucket_transfers').insert(fallback)
  }
  return { error }
}

async function insertRakeEntryResilient(client: SupabaseClient, row: any) {
  const { error } = await client.from('rake_entries').upsert(row)
  if (!error) return { error: null }

  // If check constraint 23514 fails on negative amount, encode negative amount into notes and store 0 in amount_paise
  if (error.code === '23514' && row.amount_paise < 0) {
    console.warn('rake_entries check constraint violated for negative fee. Retrying with fallback zero amount and encoded note:', error.message)
    const tag = `[neg_amount:${row.amount_paise}]`
    const fallback = {
      ...row,
      amount_paise: 0,
      notes: row.notes ? `${tag} ${row.notes}` : tag,
    }
    return await client.from('rake_entries').upsert(fallback)
  }
  return { error }
}

async function updateRakeEntryResilient(client: SupabaseClient, rakeId: string, row: any) {
  const { error } = await client.from('rake_entries').update(row).eq('id', rakeId)
  if (!error) return { error: null }

  if (error.code === '23514' && row.amount_paise < 0) {
    console.warn('rake_entries check constraint violated for negative fee update. Retrying with fallback zero amount and encoded note:', error.message)
    const tag = `[neg_amount:${row.amount_paise}]`
    const fallback = {
      ...row,
      amount_paise: 0,
      notes: row.notes ? `${tag} ${row.notes}` : tag,
    }
    return await client.from('rake_entries').update(fallback).eq('id', rakeId)
  }
  return { error }
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
  const AUTH_SESSION_KEY = 'activity_ledger_auth_session'

  const [settings, setSettings] = useState<AccountingSettings>(DEFAULT_ACCOUNTING_SETTINGS)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const session = localStorage.getItem('activity_ledger_auth_session')
      return Boolean(session)
    } catch {
      return false
    }
  })
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    try {
      const session = localStorage.getItem('activity_ledger_auth_session')
      if (session) {
        const parsed = JSON.parse(session)
        return parsed.user || 'admin'
      }
    } catch {
      // ignore
    }
    return null
  })

  // Mirror of the latest state so async callbacks (e.g. the realtime refetch,
  // which captures the mount-time closure) can read current values instead of
  // stale ones when merging unsynced local rows against the cloud snapshot.
  const stateRef = useRef({ owners, players, games, historicalRake, payments, expenses, settlements, transfers })
  useEffect(() => {
    stateRef.current = { owners, players, games, historicalRake, payments, expenses, settlements, transfers }
  })

  // When true, realtime refetches are paused so a bulk local mutation (e.g. a
  // full database clear) isn't partially overwritten by change events arriving
  // mid-operation.
  const suppressFetchRef = useRef(false)

  // Load state on mount (Cloud Supabase first if configured, LocalStorage cache as fallback)
  useEffect(() => {
    let channel: ReturnType<SupabaseClient['channel']> | null = null
    let cancelled = false

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

      // 2. If Supabase is configured, authentication is driven by the real
      //    Supabase session. Row Level Security requires a signed-in user, so an
      //    unauthenticated visitor sees only the login screen and no cloud data.
      if (isSupabaseConfigured && supabase) {
        const client = supabase
        try {
          const { data: { session } } = await client.auth.getSession()
          if (cancelled) return
          if (session?.user) {
            setIsAuthenticated(true)
            setUserEmail(session.user.email || null)
            try {
              localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user: session.user.email, loggedInAt: Date.now() }))
            } catch {
              // ignore
            }
            await fetchCloudState()
          } else {
            // No valid cloud session: require login, do not trust a stale local flag.
            setIsAuthenticated(false)
            setUserEmail(null)
            try {
              localStorage.removeItem(AUTH_SESSION_KEY)
            } catch {
              // ignore
            }
          }

          // Keep auth state in sync with Supabase (token refresh, sign-out elsewhere).
          client.auth.onAuthStateChange((_event, newSession) => {
            if (newSession?.user) {
              setIsAuthenticated(true)
              setUserEmail(newSession.user.email || null)
            } else {
              setIsAuthenticated(false)
              setUserEmail(null)
            }
          })

          // Subscribe to Supabase Realtime for automatic multi-device synchronization
          channel = client
            .channel('public:ledger_live_sync')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
              if (suppressFetchRef.current) return
              fetchCloudState()
            })
            .subscribe()
        } catch (e) {
          console.warn('Supabase fetch failed, continuing with local storage:', e)
        }
      }

      if (!cancelled) setIsLoading(false)
    }

    init()

    return () => {
      cancelled = true
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
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

      let loadedOwners = stateRef.current.owners
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
            .filter((e: any) => e.game_id === g.id && e.expense_type === 'session_expense' && e.status !== 'voided')
            .map((e: any) => ({
              id: e.id,
              description: e.description,
              amountPaise: Number(e.amount_paise),
              paidByOwnerId: e.paid_by_owner_id || undefined,
            }))

          const localGame = stateRef.current.games.find((lg) => lg.id === g.id)
          const finalGameExpenses = gameExpenses.length > 0 ? gameExpenses : (localGame?.expenses || [])

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
            expenses: finalGameExpenses,
            owners: gameAttendance,
            status: g.status,
            notes: g.notes,
            voidReason: g.void_reason,
          }
        })
        setGames(loadedGames)
      }

      let loadedRake: HistoricalRakeEntry[] = stateRef.current.historicalRake
      if (dbRake) {
        let currentLocalHistorical: HistoricalRakeEntry[] = stateRef.current.historicalRake
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed.historicalRake)) {
              currentLocalHistorical = parsed.historicalRake
            }
          }
        } catch {
          // ignore
        }

        loadedRake = dbRake.map((r: any) => {
          let amt = Number(r.amount_paise)
          let cleanNotes = r.notes

          // Decode negative amount if stored in notes due to DB constraint
          if (cleanNotes && cleanNotes.includes('[neg_amount:')) {
            const match = cleanNotes.match(/\[neg_amount:(-?\d+)\]/)
            if (match && match[1]) {
              amt = Number(match[1])
              cleanNotes = cleanNotes.replace(/\[neg_amount:-?\d+\]\s*/, '').trim() || null
            }
          }

          // If local copy had a negative amount and DB has 0, keep local negative amount
          const localMatch = currentLocalHistorical.find((lh) => lh.id === r.id)
          if (amt === 0 && localMatch && localMatch.amountPaise < 0) {
            amt = localMatch.amountPaise
          }

          return {
            id: r.id,
            playerId: r.player_id,
            gameId: r.game_id || undefined,
            entryType: r.entry_type || 'historical',
            amountPaise: amt,
            entryDate: r.entry_date,
            status: r.status,
            notes: cleanNotes || r.notes,
            voidReason: r.void_reason,
            transferTargetPlayerId: r.transfer_target_player_id || undefined,
          }
        })

        // Preserve any unsynced local historical rake entries (e.g. if DB insert failed on reload)
        const dbIds = new Set(dbRake.map((r: any) => r.id))
        const unsyncedRake = currentLocalHistorical.filter((lh) => !dbIds.has(lh.id))
        if (unsyncedRake.length > 0) {
          loadedRake = [...loadedRake, ...unsyncedRake]
          for (const ur of unsyncedRake) {
            insertRakeEntryResilient(supabase, {
              id: ur.id,
              player_id: ur.playerId,
              amount_paise: ur.amountPaise,
              entry_type: ur.entryType || 'historical',
              entry_date: ur.entryDate,
              notes: ur.notes,
              status: ur.status || 'active',
              void_reason: ur.voidReason,
            })
          }
        }

        setHistoricalRake(loadedRake)
      }

      let loadedPayments: PlayerPayment[] = []
      if (dbPayments) {
        // Read current local payments from state/localStorage to preserve receivedByOwnerId if Supabase column is missing
        let currentLocalPayments: PlayerPayment[] = stateRef.current.payments
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed.payments)) {
              currentLocalPayments = parsed.payments
            }
          }
        } catch {
          // ignore
        }

        loadedPayments = dbPayments.map((p: any) => {
          const localMatch = currentLocalPayments.find((lp) => lp.id === p.id)
          return {
            id: p.id,
            playerId: p.player_id,
            amountPaise: Number(p.amount_paise),
            paidAt: p.paid_at,
            notes: p.notes,
            status: p.status,
            voidReason: p.void_reason,
            receivedByOwnerId: p.received_by_owner_id || localMatch?.receivedByOwnerId || undefined,
            paymentType: p.payment_type || localMatch?.paymentType || 'direct',
            transferSourcePlayerId: p.transfer_source_player_id || localMatch?.transferSourcePlayerId || undefined,
            gameId: p.game_id || localMatch?.gameId || undefined,
          }
        })
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

      let loadedTransfers: BucketTransfer[] = stateRef.current.transfers
      if (dbTransfers) {
        let currentLocalTransfers: BucketTransfer[] = stateRef.current.transfers
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed.transfers)) {
              currentLocalTransfers = parsed.transfers
            }
          }
        } catch {
          // ignore
        }

        loadedTransfers = dbTransfers.map((t: any) => {
          const localMatch = currentLocalTransfers.find((lt) => lt.id === t.id)
          let deductedOwner = t.deducted_from_owner_id || localMatch?.deductedFromOwnerId || undefined

          // Extract encoded tag from notes if column was missing in remote DB
          let cleanNotes = t.notes
          if (!deductedOwner && cleanNotes && cleanNotes.includes('[deducted_owner:')) {
            const match = cleanNotes.match(/\[deducted_owner:([^\]]+)\]/)
            if (match && match[1]) {
              deductedOwner = match[1]
              cleanNotes = cleanNotes.replace(/\[deducted_owner:[^\]]+\]\s*/, '').trim() || null
            }
          }

          return {
            id: t.id,
            fromBucket: t.from_bucket,
            toBucket: t.to_bucket,
            amountPaise: Number(t.amount_paise),
            transferredAt: t.transferred_at,
            notes: cleanNotes || t.notes,
            status: t.status,
            voidReason: t.void_reason,
            deductedFromOwnerId: deductedOwner,
          }
        })

        // Preserve any unsynced local transfers that failed to write to DB earlier
        const dbIds = new Set(dbTransfers.map((t: any) => t.id))
        const unsynced = currentLocalTransfers.filter((lt) => !dbIds.has(lt.id))
        if (unsynced.length > 0) {
          loadedTransfers = [...loadedTransfers, ...unsynced]
          for (const ut of unsynced) {
            insertBucketTransferResilient(supabase, {
              id: ut.id,
              from_bucket: ut.fromBucket,
              to_bucket: ut.toBucket,
              amount_paise: ut.amountPaise,
              transferred_at: ut.transferredAt,
              notes: ut.notes,
              status: ut.status || 'active',
              deducted_from_owner_id: ut.deductedFromOwnerId || null,
            })
          }
        }

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
          } else if (row.key === 'festival_fund_deducted_owner_id' && row.value?.owner_id !== undefined) {
            loadedSettings.festivalFundDeductedOwnerId = row.value.owner_id || undefined
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
        transfers: loadedTransfers.length > 0 ? loadedTransfers : stateRef.current.transfers,
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

  // Collision-resistant id generator: time-ordered prefix plus random suffix so
  // rapid double-submits or concurrent devices can't mint duplicate primary keys.
  function uid(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
    playerRakes?: GamePlayerRakeInput[]
    hostOwnerId?: string
  }): Promise<GameRecord> {
    if (data.grossRakePaise < 0) {
      throw new Error('Gross rake cannot be negative.')
    }
    validateOwnerAttendance(data.owners)

    const nextGameNumber = games.length > 0 ? Math.max(...games.map((g) => g.gameNumber)) + 1 : 1
    const gameExpenses: SessionExpense[] = (data.expenses || []).map((e, idx) => ({
      id: e.id || uid(`exp-session-${idx}`),
      description: e.description?.trim() || 'Session Expense',
      amountPaise: e.amountPaise,
      paidByOwnerId: e.paidByOwnerId || data.hostOwnerId,
    }))

    const newGame: GameRecord = {
      id: uid('game'),
      gameNumber: nextGameNumber,
      playedAt: data.playedAt,
      grossRakePaise: data.grossRakePaise,
      expenses: gameExpenses,
      owners: data.owners,
      status: 'active',
      notes: data.notes,
      customAllocation: data.customAllocation,
    }

    let updatedPlayers = [...players]
    const newRakeEntries: HistoricalRakeEntry[] = []
    const newPayments: PlayerPayment[] = []
    const newPlayersToInsert: Player[] = []

    if (data.playerRakes && data.playerRakes.length > 0) {
      data.playerRakes.forEach((pr, idx) => {
        if (pr.amountPaise <= 0) return

        let targetPlayerId = pr.playerId
        if (!targetPlayerId && pr.playerName) {
          const existing = updatedPlayers.find(
            (p) => p.name.trim().toLowerCase() === pr.playerName?.trim().toLowerCase()
          )
          if (existing) {
            targetPlayerId = existing.id
          } else {
            const newP: Player = {
              id: uid(`player-${idx}`),
              name: pr.playerName.trim(),
              createdAt: new Date().toISOString(),
            }
            updatedPlayers.push(newP)
            newPlayersToInsert.push(newP)
            targetPlayerId = newP.id
          }
        }

        if (targetPlayerId) {
          const rakeEntry: HistoricalRakeEntry = {
            id: uid(`hist-${idx}`),
            playerId: targetPlayerId,
            gameId: newGame.id,
            entryType: 'game',
            amountPaise: pr.amountPaise,
            entryDate: data.playedAt,
            status: 'active',
            notes: `Game #${nextGameNumber} rake contribution`,
          }
          newRakeEntries.push(rakeEntry)

          if (pr.isPaid) {
            newPayments.push({
              id: uid(`pay-${idx}`),
              playerId: targetPlayerId,
              amountPaise: pr.amountPaise,
              paidAt: data.playedAt,
              status: 'active',
              notes: `Game #${nextGameNumber} rake paid on the spot`,
              receivedByOwnerId: pr.receivedByOwnerId || data.hostOwnerId,
              gameId: newGame.id,
            })
          }
        }
      })
    }

    if (updatedPlayers.length !== players.length) {
      setPlayers(updatedPlayers)
    }

    const updatedGames = [...games, newGame]
    const updatedHistorical = [...historicalRake, ...newRakeEntries]
    const updatedPayments = [...payments, ...newPayments]

    setGames(updatedGames)
    setHistoricalRake(updatedHistorical)
    setPayments(updatedPayments)

    persist({
      games: updatedGames,
      players: updatedPlayers,
      historicalRake: updatedHistorical,
      payments: updatedPayments,
    })

    // Cloud DB write - chain player creation first so foreign keys succeed
    safeSupabaseOp(async (client) => {
      if (newPlayersToInsert.length > 0) {
        for (const p of newPlayersToInsert) {
          const { error } = await client.from('players').insert({
            id: p.id,
            name: p.name,
            created_at: p.createdAt,
          })
          if (error && error.code !== '23505') {
            console.warn('Player insert error in addGame:', error)
          }
        }
      }

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

      if (gameExpenses.length > 0) {
        const expenseRows = gameExpenses.map((e) => ({
          id: e.id,
          game_id: newGame.id,
          amount_paise: e.amountPaise,
          expense_type: 'session_expense',
          description: e.description,
          expense_date: newGame.playedAt,
          status: 'active',
          paid_by_owner_id: e.paidByOwnerId || null,
        }))
        await insertExpensesBatchResilient(client, expenseRows)
      }

      if (newRakeEntries.length > 0) {
        await client.from('rake_entries').insert(
          newRakeEntries.map((r) => ({
            id: r.id,
            player_id: r.playerId,
            game_id: newGame.id,
            amount_paise: r.amountPaise,
            entry_type: 'game',
            entry_date: r.entryDate,
            notes: r.notes,
            status: 'active',
          }))
        )
      }

      if (newPayments.length > 0) {
        const paymentRows = newPayments.map((p) => ({
          id: p.id,
          player_id: p.playerId,
          amount_paise: p.amountPaise,
          paid_at: p.paidAt,
          status: 'active',
          notes: p.notes,
          received_by_owner_id: p.receivedByOwnerId || null,
          game_id: p.gameId || null,
        }))
        await insertPaymentsBatchResilient(client, paymentRows)
      }
    })

    addAudit('GAME_CREATED', 'game', newGame.id, {
      gameNumber: newGame.gameNumber,
      grossRakePaise: newGame.grossRakePaise,
      expensesCount: data.expenses.length,
      ownersPresent: data.owners.filter((o) => o.present).map((o) => o.ownerId),
      playerRakesCount: newRakeEntries.length,
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

    const updatedHistorical = historicalRake.map((h) =>
      h.gameId === gameId
        ? { ...h, status: 'voided' as const, voidReason: `Voided with game: ${reason}` }
        : h
    )

    // Void any "paid on the spot" payments that were created with this game so the
    // fee and its payment disappear together (otherwise the player looks overpaid).
    const updatedPayments = payments.map((p) =>
      p.gameId === gameId && p.status === 'active'
        ? { ...p, status: 'voided' as const, voidReason: `Voided with game: ${reason}` }
        : p
    )

    setGames(updatedGames)
    setHistoricalRake(updatedHistorical)
    setPayments(updatedPayments)
    persist({ games: updatedGames, historicalRake: updatedHistorical, payments: updatedPayments })

    safeSupabaseOp(async (client) => {
      await client.from('games').update({
        status: 'voided',
        void_reason: reason,
      }).eq('id', gameId)

      await client.from('rake_entries').update({
        status: 'voided',
        void_reason: `Voided with game: ${reason}`,
      }).eq('game_id', gameId)

      await client.from('payments').update({
        status: 'voided',
        void_reason: `Voided with game: ${reason}`,
      }).eq('game_id', gameId)
    })

    addAudit('GAME_VOIDED', 'game', gameId, {
      gameNumber: target.gameNumber,
      reason,
    })
  }

  // 2a-2. Hard Delete Game / Session
  async function deleteGame(gameId: string): Promise<void> {
    const target = games.find((g) => g.id === gameId)
    if (!target) throw new Error('Game not found.')

    const updatedGames = games.filter((g) => g.id !== gameId)
    const updatedHistorical = historicalRake.filter((h) => h.gameId !== gameId)
    const updatedPayments = payments.filter((p) => p.gameId !== gameId)

    setGames(updatedGames)
    setHistoricalRake(updatedHistorical)
    setPayments(updatedPayments)
    persist({ games: updatedGames, historicalRake: updatedHistorical, payments: updatedPayments })

    safeSupabaseOp(async (client) => {
      await client.from('payments').delete().eq('game_id', gameId)
      await client.from('rake_entries').delete().eq('game_id', gameId)
      await client.from('expenses').delete().eq('game_id', gameId)
      await client.from('game_owners').delete().eq('game_id', gameId)
      await client.from('games').delete().eq('id', gameId)
    })

    addAudit('GAME_DELETED', 'game', gameId, {
      gameNumber: target.gameNumber,
    })
  }

  // 2b. Add Session Expense to an Existing Game
  async function addSessionExpense(
    gameId: string,
    expense: { description: string; amountPaise: number; paidByOwnerId?: string }
  ): Promise<void> {
    if (expense.amountPaise <= 0) {
      throw new Error('Expense amount must be greater than zero.')
    }
    const targetGame = games.find((g) => g.id === gameId)
    if (!targetGame) throw new Error('Game not found.')
    if (targetGame.status === 'voided') throw new Error('Cannot add expenses to a voided game.')

    const newExpense: SessionExpense = {
      id: uid(`exp-session-${gameId}`),
      description: expense.description.trim() || 'Session Expense',
      amountPaise: expense.amountPaise,
      paidByOwnerId: expense.paidByOwnerId,
    }

    const updatedGames = games.map((g) => {
      if (g.id === gameId) {
        return {
          ...g,
          expenses: [...(g.expenses || []), newExpense],
        }
      }
      return g
    })

    setGames(updatedGames)
    persist({ games: updatedGames })

    safeSupabaseOp(async (client) => {
      const row = {
        id: newExpense.id,
        game_id: gameId,
        amount_paise: newExpense.amountPaise,
        expense_type: 'session_expense',
        description: newExpense.description,
        expense_date: targetGame.playedAt,
        status: 'active',
        paid_by_owner_id: newExpense.paidByOwnerId || null,
      }
      await insertExpenseResilient(client, row)
    })

    addAudit('SESSION_EXPENSE_ADDED', 'game', gameId, {
      expenseId: newExpense.id,
      gameNumber: targetGame.gameNumber,
      amountPaise: newExpense.amountPaise,
      description: newExpense.description,
      paidByOwnerId: newExpense.paidByOwnerId,
    })
  }

  // 2c. Remove Session Expense from an Existing Game
  async function removeSessionExpense(gameId: string, expenseId: string, reason?: string): Promise<void> {
    const targetGame = games.find((g) => g.id === gameId)
    if (!targetGame) throw new Error('Game not found.')

    const updatedGames = games.map((g) => {
      if (g.id === gameId) {
        return {
          ...g,
          expenses: (g.expenses || []).filter((e) => e.id !== expenseId),
        }
      }
      return g
    })

    setGames(updatedGames)
    persist({ games: updatedGames })

    safeSupabaseOp(async (client) => {
      await client.from('expenses').delete().eq('id', expenseId)
    })

    addAudit('SESSION_EXPENSE_REMOVED', 'game', gameId, {
      expenseId,
      gameNumber: targetGame.gameNumber,
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
    if (data.amountPaise === 0) {
      throw new Error('Fee amount cannot be zero.')
    }

    let targetPlayerId = data.playerId
    let updatedPlayers = [...players]

    let newPlayerToInsert: Player | null = null

    if (!targetPlayerId && data.playerName) {
      const existing = players.find(
        (p) => p.name.trim().toLowerCase() === data.playerName?.trim().toLowerCase()
      )
      if (existing) {
        targetPlayerId = existing.id
      } else {
        const newPlayer: Player = {
          id: uid('player'),
          name: data.playerName.trim(),
          createdAt: new Date().toISOString(),
        }
        updatedPlayers.push(newPlayer)
        newPlayerToInsert = newPlayer
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
      id: uid('hist'),
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
        id: uid('pay'),
        playerId: targetPlayerId,
        amountPaise: data.paidAmountPaise,
        paidAt: data.entryDate || new Date().toISOString(),
        status: 'active',
        notes: `Initial payment with historical rake entry`,
        receivedByOwnerId: data.receivedByOwnerId,
      }
      updatedPayments.push(newPayment)
      setPayments(updatedPayments)
    }

    persist({
      players: updatedPlayers,
      historicalRake: updatedHistorical,
      payments: updatedPayments,
    })

    // Cloud DB write - chain player first, then rake entry, then payment
    safeSupabaseOp(async (client) => {
      if (newPlayerToInsert) {
        const { error: pErr } = await client.from('players').insert({
          id: newPlayerToInsert.id,
          name: newPlayerToInsert.name,
          created_at: newPlayerToInsert.createdAt,
        })
        if (pErr && pErr.code !== '23505') {
          console.warn('Player insert error in addHistoricalRake:', pErr)
        }
      }

      await insertRakeEntryResilient(client, {
        id: newRake.id,
        player_id: newRake.playerId,
        amount_paise: newRake.amountPaise,
        entry_type: 'historical',
        entry_date: newRake.entryDate,
        notes: newRake.notes,
        status: 'active',
      })

      if (newPayment) {
        const row = {
          id: newPayment.id,
          player_id: newPayment.playerId,
          amount_paise: newPayment.amountPaise,
          paid_at: newPayment.paidAt,
          notes: newPayment.notes,
          status: 'active',
          received_by_owner_id: data.receivedByOwnerId || null,
        }
        await insertPaymentResilient(client, row)
      }
    })

    addAudit('HISTORICAL_RAKE_ADDED', 'historical_rake', newRake.id, {
      playerId: targetPlayerId,
      amountPaise: data.amountPaise,
      paidAmountPaise: data.paidAmountPaise,
    })

    return { rake: newRake, payment: newPayment }
  }

  // 3b. Edit Fee / Historical Rake Entry
  async function editHistoricalRake(rakeId: string, data: {
    playerId?: string
    amountPaise: number
    entryDate?: string
    notes?: string
  }): Promise<HistoricalRakeEntry> {
    if (data.amountPaise === 0) {
      throw new Error('Fee amount cannot be zero.')
    }
    const target = historicalRake.find((h) => h.id === rakeId)
    if (!target) throw new Error('Fee entry not found.')

    const updatedRake: HistoricalRakeEntry = {
      ...target,
      playerId: data.playerId || target.playerId,
      amountPaise: data.amountPaise,
      entryDate: data.entryDate || target.entryDate,
      notes: data.notes !== undefined ? data.notes : target.notes,
    }

    const updatedList = historicalRake.map((h) => (h.id === rakeId ? updatedRake : h))
    setHistoricalRake(updatedList)
    persist({ historicalRake: updatedList })

    safeSupabaseOp(async (client) => {
      await updateRakeEntryResilient(client, rakeId, {
        player_id: updatedRake.playerId,
        amount_paise: updatedRake.amountPaise,
        entry_date: updatedRake.entryDate,
        notes: updatedRake.notes,
      })
    })

    addAudit('FEE_ENTRY_UPDATED', 'historical_rake', rakeId, {
      previousAmount: target.amountPaise,
      newAmount: data.amountPaise,
      playerId: updatedRake.playerId,
    })

    return updatedRake
  }

  // 3c. Delete Fee / Historical Rake Entry
  async function deleteHistoricalRake(rakeId: string): Promise<void> {
    const target = historicalRake.find((h) => h.id === rakeId)
    if (!target) throw new Error('Fee entry not found.')

    const updatedList = historicalRake.filter((h) => h.id !== rakeId)
    setHistoricalRake(updatedList)
    persist({ historicalRake: updatedList })

    safeSupabaseOp(async (client) => {
      await client.from('rake_entries').delete().eq('id', rakeId)
    })

    addAudit('FEE_ENTRY_DELETED', 'historical_rake', rakeId, {
      amountPaise: target.amountPaise,
      playerId: target.playerId,
    })
  }

  // 3d. Void Fee / Historical Rake Entry
  async function voidHistoricalRake(rakeId: string, reason: string): Promise<void> {
    if (!reason || reason.trim() === '') {
      throw new Error('A reason is required to void a fee entry.')
    }
    const target = historicalRake.find((h) => h.id === rakeId)
    if (!target) throw new Error('Fee entry not found.')

    const updatedList = historicalRake.map((h) =>
      h.id === rakeId ? { ...h, status: 'voided' as const, voidReason: reason } : h
    )
    setHistoricalRake(updatedList)
    persist({ historicalRake: updatedList })

    safeSupabaseOp((client) =>
      client.from('rake_entries').update({
        status: 'voided',
        void_reason: reason,
      }).eq('id', rakeId)
    )

    addAudit('FEE_ENTRY_VOIDED', 'historical_rake', rakeId, { reason })
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
      id: uid('pay'),
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

    safeSupabaseOp(async (client) => {
      const row = {
        id: newPayment.id,
        player_id: newPayment.playerId,
        amount_paise: newPayment.amountPaise,
        paid_at: newPayment.paidAt,
        notes: newPayment.notes,
        status: 'active',
        received_by_owner_id: newPayment.receivedByOwnerId || null,
      }
      await insertPaymentResilient(client, row)
    })

    addAudit('PAYMENT_RECORDED', 'payment', newPayment.id, {
      playerId: data.playerId,
      playerName: player.name,
      amountPaise: data.amountPaise,
      receivedByOwnerId: data.receivedByOwnerId,
    })

    return newPayment
  }

  // 4b. Transfer Between Members
  async function transferBetweenMembers(data: {
    toPlayerId: string
    sources: Array<{ fromPlayerId: string; amountPaise: number }>
    transferDate?: string
    notes?: string
  }): Promise<{ payments: PlayerPayment[]; rakes: HistoricalRakeEntry[] }> {
    const toPlayer = players.find((p) => p.id === data.toPlayerId)
    if (!toPlayer) throw new Error('Recipient member not found.')

    if (!data.sources || data.sources.length === 0) {
      throw new Error('Please select at least one source member to transfer from.')
    }

    const newPayments: PlayerPayment[] = []
    const newRakes: HistoricalRakeEntry[] = []
    const dateStr = data.transferDate || new Date().toISOString()

    for (let i = 0; i < data.sources.length; i++) {
      const src = data.sources[i]
      if (src.amountPaise <= 0) continue
      const fromPlayer = players.find((p) => p.id === src.fromPlayerId)
      if (!fromPlayer) throw new Error('Source member not found.')

      const rakeId = uid(`rake-transfer-${i}`)
      const payId = uid(`pay-transfer-${i}`)

      // Deduction (fee entry) for the source member
      const rakeEntry: HistoricalRakeEntry = {
        id: rakeId,
        playerId: src.fromPlayerId,
        amountPaise: src.amountPaise,
        entryDate: dateStr,
        entryType: 'member_transfer',
        status: 'active',
        notes: `Transfer to ${toPlayer.name}${data.notes ? ': ' + data.notes : ''}`,
        transferTargetPlayerId: data.toPlayerId,
      }
      newRakes.push(rakeEntry)

      // Payment credit for the recipient member
      const paymentEntry: PlayerPayment = {
        id: payId,
        playerId: data.toPlayerId,
        amountPaise: src.amountPaise,
        paidAt: dateStr,
        status: 'active',
        paymentType: 'member_transfer',
        transferSourcePlayerId: src.fromPlayerId,
        notes: `Transfer from ${fromPlayer.name}${data.notes ? ': ' + data.notes : ''}`,
      }
      newPayments.push(paymentEntry)
    }

    if (newPayments.length === 0) {
      throw new Error('Transfer amount must be greater than zero.')
    }

    const updatedPayments = [...payments, ...newPayments]
    const updatedRakes = [...historicalRake, ...newRakes]

    setPayments(updatedPayments)
    setHistoricalRake(updatedRakes)
    persist({ payments: updatedPayments, historicalRake: updatedRakes })

    safeSupabaseOp(async (client) => {
      for (const r of newRakes) {
        await insertRakeEntryResilient(client, {
          id: r.id,
          player_id: r.playerId,
          amount_paise: r.amountPaise,
          entry_type: 'member_transfer',
          entry_date: r.entryDate,
          notes: r.notes,
          status: 'active',
          transfer_target_player_id: r.transferTargetPlayerId || null,
        })
      }
      for (const p of newPayments) {
        await insertPaymentResilient(client, {
          id: p.id,
          player_id: p.playerId,
          amount_paise: p.amountPaise,
          paid_at: p.paidAt,
          notes: p.notes,
          status: 'active',
          payment_type: 'member_transfer',
          transfer_source_player_id: p.transferSourcePlayerId || null,
        })
      }
    })

    addAudit('MEMBER_TRANSFER_RECORDED', 'player', data.toPlayerId, {
      toPlayerName: toPlayer.name,
      sources: data.sources.map((s) => ({
        fromPlayerId: s.fromPlayerId,
        amountPaise: s.amountPaise,
      })),
      totalAmountPaise: newPayments.reduce((sum, p) => sum + p.amountPaise, 0),
    })

    return { payments: newPayments, rakes: newRakes }
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

  // 5b. Update Collector Organizer for an Existing Payment
  async function updatePaymentCollector(paymentId: string, ownerId?: string): Promise<void> {
    const updated = payments.map((p) =>
      p.id === paymentId ? { ...p, receivedByOwnerId: ownerId || undefined } : p
    )
    setPayments(updated)
    persist({ payments: updated })

    safeSupabaseOp(async (client) => {
      try {
        await client
          .from('payments')
          .update({ received_by_owner_id: ownerId || null })
          .eq('id', paymentId)
      } catch (e) {
        console.warn('Could not update received_by_owner_id in Supabase:', e)
      }
    })

    const targetOwner = owners.find((o) => o.id === ownerId)
    addAudit('PAYMENT_COLLECTOR_UPDATED', 'payment', paymentId, {
      receivedByOwnerId: ownerId,
      ownerName: targetOwner?.name || 'Unassigned / Direct Bank',
    })
  }

  // 5c. Batch Assign All Unassigned Payments to a Specific Organizer
  async function assignAllUnassignedPayments(ownerId: string): Promise<void> {
    const unassignedPaymentIds = payments
      .filter((p) => p.status === 'active' && !p.receivedByOwnerId)
      .map((p) => p.id)

    if (unassignedPaymentIds.length === 0) return

    const updated = payments.map((p) =>
      !p.receivedByOwnerId && p.status === 'active' ? { ...p, receivedByOwnerId: ownerId } : p
    )
    setPayments(updated)
    persist({ payments: updated })

    safeSupabaseOp(async (client) => {
      try {
        await client
          .from('payments')
          .update({ received_by_owner_id: ownerId })
          .in('id', unassignedPaymentIds)
      } catch (e) {
        console.warn('Could not update received_by_owner_id in Supabase batch:', e)
      }
    })

    const targetOwner = owners.find((o) => o.id === ownerId)
    addAudit('UNASSIGNED_PAYMENTS_BATCH_ASSIGNED', 'payment', undefined, {
      receivedByOwnerId: ownerId,
      ownerName: targetOwner?.name || ownerId,
      count: unassignedPaymentIds.length,
    })
  }

  // 5d. Edit Payment
  async function editPayment(paymentId: string, data: {
    playerId?: string
    amountPaise: number
    paidAt?: string
    notes?: string
    receivedByOwnerId?: string
  }): Promise<PlayerPayment> {
    if (data.amountPaise <= 0) {
      throw new Error('Payment amount must be greater than zero.')
    }
    const target = payments.find((p) => p.id === paymentId)
    if (!target) throw new Error('Payment not found.')

    const updatedPayment: PlayerPayment = {
      ...target,
      playerId: data.playerId || target.playerId,
      amountPaise: data.amountPaise,
      paidAt: data.paidAt || target.paidAt,
      notes: data.notes !== undefined ? data.notes : target.notes,
      receivedByOwnerId: data.receivedByOwnerId !== undefined ? data.receivedByOwnerId : target.receivedByOwnerId,
    }

    const updatedList = payments.map((p) => (p.id === paymentId ? updatedPayment : p))
    setPayments(updatedList)
    persist({ payments: updatedList })

    safeSupabaseOp(async (client) => {
      try {
        await client.from('payments').update({
          player_id: updatedPayment.playerId,
          amount_paise: updatedPayment.amountPaise,
          paid_at: updatedPayment.paidAt,
          notes: updatedPayment.notes,
          received_by_owner_id: updatedPayment.receivedByOwnerId || null,
        }).eq('id', paymentId)
      } catch (e) {
        console.warn('Could not update payment in Supabase:', e)
      }
    })

    addAudit('PAYMENT_UPDATED', 'payment', paymentId, {
      previousAmount: target.amountPaise,
      newAmount: data.amountPaise,
      playerId: updatedPayment.playerId,
      receivedByOwnerId: updatedPayment.receivedByOwnerId,
    })

    return updatedPayment
  }

  // 5e. Delete Payment
  async function deletePayment(paymentId: string): Promise<void> {
    const target = payments.find((p) => p.id === paymentId)
    if (!target) throw new Error('Payment not found.')

    const updatedList = payments.filter((p) => p.id !== paymentId)
    setPayments(updatedList)
    persist({ payments: updatedList })

    safeSupabaseOp(async (client) => {
      await client.from('payments').delete().eq('id', paymentId)
    })

    addAudit('PAYMENT_DELETED', 'payment', paymentId, {
      amountPaise: target.amountPaise,
      playerId: target.playerId,
    })
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
      id: uid('exp'),
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

    safeSupabaseOp(async (client) => {
      const row = {
        id: newExpense.id,
        game_id: newExpense.gameId,
        amount_paise: newExpense.amountPaise,
        expense_type: newExpense.type,
        description: newExpense.description,
        expense_date: newExpense.expenseDate,
        status: 'active',
        paid_by_owner_id: newExpense.paidByOwnerId || null,
      }
      await insertExpenseResilient(client, row)
    })

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

  // 7b. Edit Expense
  async function editExpense(expenseId: string, data: {
    type: 'session_expense' | 'monthly_expense' | 'credit_adjustment'
    amountPaise: number
    description: string
    expenseDate?: string
    paidByOwnerId?: string
  }): Promise<GeneralExpense> {
    if (data.amountPaise <= 0) {
      throw new Error('Expense amount must be greater than zero.')
    }
    if (!data.description || data.description.trim() === '') {
      throw new Error('Description is required.')
    }
    const target = expenses.find((e) => e.id === expenseId)
    if (!target) throw new Error('Expense not found.')

    const updatedExpense: GeneralExpense = {
      ...target,
      type: data.type,
      amountPaise: data.amountPaise,
      description: data.description.trim(),
      expenseDate: data.expenseDate || target.expenseDate,
      paidByOwnerId: data.paidByOwnerId,
    }

    const updatedList = expenses.map((e) => (e.id === expenseId ? updatedExpense : e))
    setExpenses(updatedList)
    persist({ expenses: updatedList })

    safeSupabaseOp(async (client) => {
      try {
        await client.from('expenses').update({
          expense_type: updatedExpense.type,
          amount_paise: updatedExpense.amountPaise,
          description: updatedExpense.description,
          expense_date: updatedExpense.expenseDate,
          paid_by_owner_id: updatedExpense.paidByOwnerId || null,
        }).eq('id', expenseId)
      } catch (e) {
        console.warn('Could not update expense in Supabase:', e)
      }
    })

    addAudit('EXPENSE_UPDATED', 'expense', expenseId, {
      description: updatedExpense.description,
      amountPaise: updatedExpense.amountPaise,
    })

    return updatedExpense
  }

  // 7c. Delete Expense
  async function deleteExpense(expenseId: string): Promise<void> {
    const target = expenses.find((e) => e.id === expenseId)
    if (!target) throw new Error('Expense not found.')

    const updatedList = expenses.filter((e) => e.id !== expenseId)
    setExpenses(updatedList)
    persist({ expenses: updatedList })

    safeSupabaseOp(async (client) => {
      await client.from('expenses').delete().eq('id', expenseId)
    })

    addAudit('EXPENSE_DELETED', 'expense', expenseId, {
      description: target.description,
      amountPaise: target.amountPaise,
    })
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
      id: uid('set'),
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

    safeSupabaseOp(async (client) => {
      const row = {
        id: newSettlement.id,
        owner_id: newSettlement.ownerId,
        amount_paise: newSettlement.amountPaise,
        settled_at: newSettlement.settledAt,
        notes: newSettlement.notes,
        status: 'active',
        paid_by_owner_id: newSettlement.paidByOwnerId || null,
      }
      await insertSettlementResilient(client, row)
    })

    addAudit('OWNER_SETTLEMENT_RECORDED', 'owner_settlement', newSettlement.id, {
      ownerId: data.ownerId,
      ownerName: owner.name,
      amountPaise: data.amountPaise,
      paidByOwnerId: data.paidByOwnerId,
    })

    return newSettlement
  }

  // 8b. Edit Owner Settlement
  async function editOwnerSettlement(settlementId: string, data: {
    ownerId?: string
    amountPaise: number
    settledAt?: string
    notes?: string
    paidByOwnerId?: string
  }): Promise<OwnerSettlement> {
    if (data.amountPaise <= 0) {
      throw new Error('Settlement amount must be greater than zero.')
    }
    const target = settlements.find((s) => s.id === settlementId)
    if (!target) throw new Error('Settlement not found.')

    // Mirror the create-path guard: a settlement cannot exceed the owner's
    // remaining entitlement. The current settlement already counts against that
    // remaining, so add it back when the owner is unchanged.
    const nextOwnerId = data.ownerId || target.ownerId
    const ownerEnt = summary.ownerEntitlements[nextOwnerId]
    const remaining = ownerEnt?.remainingEntitlementPaise || 0
    const allowed = remaining + (nextOwnerId === target.ownerId ? target.amountPaise : 0)
    if (data.amountPaise > allowed) {
      throw new Error(
        `Settlement amount (₹${(data.amountPaise / 100).toLocaleString()}) exceeds owner's remaining entitlement (₹${(
          allowed / 100
        ).toLocaleString()}).`
      )
    }

    const updatedSettlement: OwnerSettlement = {
      ...target,
      ownerId: data.ownerId || target.ownerId,
      amountPaise: data.amountPaise,
      settledAt: data.settledAt || target.settledAt,
      notes: data.notes !== undefined ? data.notes : target.notes,
      paidByOwnerId: data.paidByOwnerId !== undefined ? data.paidByOwnerId : target.paidByOwnerId,
    }

    const updatedList = settlements.map((s) => (s.id === settlementId ? updatedSettlement : s))
    setSettlements(updatedList)
    persist({ settlements: updatedList })

    safeSupabaseOp(async (client) => {
      try {
        await client.from('owner_settlements').update({
          owner_id: updatedSettlement.ownerId,
          amount_paise: updatedSettlement.amountPaise,
          settled_at: updatedSettlement.settledAt,
          notes: updatedSettlement.notes,
          paid_by_owner_id: updatedSettlement.paidByOwnerId || null,
        }).eq('id', settlementId)
      } catch (e) {
        console.warn('Could not update settlement in Supabase:', e)
      }
    })

    addAudit('OWNER_SETTLEMENT_UPDATED', 'owner_settlement', settlementId, {
      amountPaise: data.amountPaise,
      ownerId: updatedSettlement.ownerId,
      paidByOwnerId: updatedSettlement.paidByOwnerId,
    })

    return updatedSettlement
  }

  // 8c. Delete Owner Settlement
  async function deleteOwnerSettlement(settlementId: string): Promise<void> {
    const target = settlements.find((s) => s.id === settlementId)
    if (!target) throw new Error('Settlement not found.')

    const updatedList = settlements.filter((s) => s.id !== settlementId)
    setSettlements(updatedList)
    persist({ settlements: updatedList })

    safeSupabaseOp(async (client) => {
      await client.from('owner_settlements').delete().eq('id', settlementId)
    })

    addAudit('OWNER_SETTLEMENT_DELETED', 'owner_settlement', settlementId, {
      amountPaise: target.amountPaise,
      ownerId: target.ownerId,
    })
  }

  // 8d. Void Owner Settlement
  async function voidOwnerSettlement(settlementId: string, reason: string): Promise<void> {
    if (!reason || reason.trim() === '') {
      throw new Error('A reason is required to void a settlement.')
    }
    const target = settlements.find((s) => s.id === settlementId)
    if (!target) throw new Error('Settlement not found.')

    const updatedList = settlements.map((s) =>
      s.id === settlementId ? { ...s, status: 'voided' as const, voidReason: reason } : s
    )
    setSettlements(updatedList)
    persist({ settlements: updatedList })

    safeSupabaseOp((client) =>
      client.from('owner_settlements').update({
        status: 'voided',
        void_reason: reason,
      }).eq('id', settlementId)
    )

    addAudit('OWNER_SETTLEMENT_VOIDED', 'owner_settlement', settlementId, { reason })
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
        { key: 'festival_fund_deducted_owner_id', value: { owner_id: updated.festivalFundDeductedOwnerId || null } },
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
    deductedFromOwnerId?: string
  }): Promise<BucketTransfer> {
    if (data.amountPaise <= 0) {
      throw new Error('Transfer amount must be greater than zero.')
    }
    if (data.fromBucket === data.toBucket) {
      throw new Error('Source and destination buckets must be different.')
    }

    const currentTable = summary.tableRecoveryAccumulatedPaise
    const currentDistributable = summary.totalDistributableRakePaise
    const currentFestival = summary.festivalFundAccumulatedPaise

    // Table-recovery reserves plus distributable profit together form the owner
    // pool a table-sourced transfer can draw from (matches the accounting engine).
    if (data.fromBucket === 'table_recovery' && data.amountPaise > currentTable + currentDistributable) {
      throw new Error(
        `Cannot transfer ₹${(data.amountPaise / 100).toLocaleString('en-IN')}: available owner pool (table recovery + profit) is ₹${((currentTable + currentDistributable) / 100).toLocaleString('en-IN')}.`
      )
    }
    if (data.fromBucket === 'festival_fund' && data.amountPaise > currentFestival) {
      throw new Error(
        `Cannot transfer ₹${(data.amountPaise / 100).toLocaleString('en-IN')}: Current Festival Fund balance is ₹${(currentFestival / 100).toLocaleString('en-IN')}.`
      )
    }

    const newTransfer: BucketTransfer = {
      id: uid('transfer'),
      transferredAt: data.transferredAt || new Date().toISOString(),
      fromBucket: data.fromBucket,
      toBucket: data.toBucket,
      amountPaise: data.amountPaise,
      notes: data.notes,
      status: 'active',
      deductedFromOwnerId: data.deductedFromOwnerId,
    }

    const updatedTransfers = [...transfers, newTransfer]
    setTransfers(updatedTransfers)
    persist({ transfers: updatedTransfers })

    safeSupabaseOp((client) =>
      insertBucketTransferResilient(client, {
        id: newTransfer.id,
        from_bucket: newTransfer.fromBucket,
        to_bucket: newTransfer.toBucket,
        amount_paise: newTransfer.amountPaise,
        transferred_at: newTransfer.transferredAt,
        notes: newTransfer.notes,
        status: 'active',
        deducted_from_owner_id: newTransfer.deductedFromOwnerId || null,
      })
    )

    addAudit('BUCKET_FUNDS_REALLOCATED', 'bucket_transfer', newTransfer.id, {
      fromBucket: data.fromBucket,
      toBucket: data.toBucket,
      amountPaise: data.amountPaise,
      notes: data.notes,
      deductedFromOwnerId: data.deductedFromOwnerId,
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

  // 10e. Edit Bucket Transfer
  async function editBucketTransfer(transferId: string, data: {
    fromBucket?: 'table_recovery' | 'festival_fund'
    toBucket?: 'table_recovery' | 'festival_fund' | 'owner_profit'
    amountPaise: number
    notes?: string
    transferredAt?: string
    deductedFromOwnerId?: string
  }): Promise<BucketTransfer> {
    if (data.amountPaise <= 0) {
      throw new Error('Transfer amount must be greater than zero.')
    }
    const target = transfers.find((t) => t.id === transferId)
    if (!target) throw new Error('Transfer record not found.')

    const updatedTransfer: BucketTransfer = {
      ...target,
      fromBucket: data.fromBucket || target.fromBucket,
      toBucket: data.toBucket || target.toBucket,
      amountPaise: data.amountPaise,
      notes: data.notes !== undefined ? data.notes : target.notes,
      transferredAt: data.transferredAt || target.transferredAt,
      deductedFromOwnerId:
        data.deductedFromOwnerId !== undefined ? data.deductedFromOwnerId || undefined : target.deductedFromOwnerId,
    }

    const updatedList = transfers.map((t) => (t.id === transferId ? updatedTransfer : t))
    setTransfers(updatedList)
    persist({ transfers: updatedList })

    safeSupabaseOp((client) =>
      client.from('bucket_transfers').update({
        from_bucket: updatedTransfer.fromBucket,
        to_bucket: updatedTransfer.toBucket,
        amount_paise: updatedTransfer.amountPaise,
        notes: updatedTransfer.notes,
        transferred_at: updatedTransfer.transferredAt,
        deducted_from_owner_id: updatedTransfer.deductedFromOwnerId || null,
      }).eq('id', transferId)
    )

    addAudit('BUCKET_TRANSFER_UPDATED', 'bucket_transfer', transferId, {
      amountPaise: data.amountPaise,
    })

    return updatedTransfer
  }

  // 10f. Delete Bucket Transfer
  async function deleteBucketTransfer(transferId: string): Promise<void> {
    const target = transfers.find((t) => t.id === transferId)
    if (!target) throw new Error('Transfer record not found.')

    const updatedList = transfers.filter((t) => t.id !== transferId)
    setTransfers(updatedList)
    persist({ transfers: updatedList })

    safeSupabaseOp((client) =>
      client.from('bucket_transfers').delete().eq('id', transferId)
    )

    addAudit('BUCKET_TRANSFER_DELETED', 'bucket_transfer', transferId, {
      amountPaise: target.amountPaise,
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

    // Pause realtime refetches while the cascade of deletes runs so an in-flight
    // change event can't repopulate the UI from rows that aren't deleted yet.
    suppressFetchRef.current = true
    safeSupabaseOp(async (client) => {
      try {
        // Delete in dependency order (children before parents) to respect FKs.
        await client.from('payments').delete().neq('id', 'dummy_id_never_matches')
        await client.from('rake_entries').delete().neq('id', 'dummy_id_never_matches')
        await client.from('expenses').delete().neq('id', 'dummy_id_never_matches')
        await client.from('owner_settlements').delete().neq('id', 'dummy_id_never_matches')
        await client.from('game_owners').delete().neq('game_id', 'dummy_id_never_matches')
        await client.from('bucket_transfers').delete().neq('id', 'dummy_id_never_matches')
        await client.from('games').delete().neq('id', 'dummy_id_never_matches')
        await client.from('players').delete().neq('id', 'dummy_id_never_matches')
      } finally {
        suppressFetchRef.current = false
      }
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
      for (const r of historicalRake) {
        await insertRakeEntryResilient(client, {
          id: r.id,
          player_id: r.playerId,
          amount_paise: r.amountPaise,
          entry_type: r.entryType || 'historical',
          entry_date: r.entryDate,
          notes: r.notes,
          status: r.status,
          void_reason: r.voidReason,
          transfer_target_player_id: r.transferTargetPlayerId || null,
        })
      }
    }

    // 5. Sync payments
    if (payments.length > 0) {
      const pRows = payments.map((p) => ({
        id: p.id,
        player_id: p.playerId,
        amount_paise: p.amountPaise,
        paid_at: p.paidAt,
        notes: p.notes,
        status: p.status,
        void_reason: p.voidReason,
        received_by_owner_id: p.receivedByOwnerId || null,
        payment_type: p.paymentType || 'direct',
        transfer_source_player_id: p.transferSourcePlayerId || null,
        game_id: p.gameId || null,
      }))
      const { error: pErr } = await client.from('payments').upsert(pRows)
      if (pErr && (pErr.code === '42703' || pErr.code === 'PGRST204' || pErr.message?.includes('received_by_owner_id'))) {
        const fallback = pRows.map(({ received_by_owner_id, ...rest }) => rest)
        await client.from('payments').upsert(fallback)
      }
    }

    // 6. Sync expenses (both general expenses and session expenses)
    const allExpensesToSync = [
      ...expenses.map((e) => ({
        id: e.id,
        game_id: e.gameId,
        amount_paise: e.amountPaise,
        expense_type: e.type,
        description: e.description,
        expense_date: e.expenseDate,
        status: e.status,
        void_reason: e.voidReason,
        paid_by_owner_id: e.paidByOwnerId || null,
      })),
      ...games.flatMap((g) =>
        (g.expenses || []).map((se, idx) => ({
          id: se.id || `exp-session-${g.id}-${idx}`,
          game_id: g.id,
          amount_paise: se.amountPaise,
          expense_type: 'session_expense',
          description: se.description,
          expense_date: g.playedAt,
          status: g.status === 'voided' ? 'voided' : 'active',
          void_reason: null,
          paid_by_owner_id: se.paidByOwnerId || null,
        }))
      ),
    ]

    if (allExpensesToSync.length > 0) {
      const { error: expErr } = await client.from('expenses').upsert(allExpensesToSync)
      if (expErr && (expErr.code === '42703' || expErr.code === 'PGRST204' || expErr.message?.includes('paid_by_owner_id'))) {
        const fallback = allExpensesToSync.map(({ paid_by_owner_id, ...rest }) => rest)
        await client.from('expenses').upsert(fallback)
      }
    }

    // 7. Sync settlements
    if (settlements.length > 0) {
      const sRows = settlements.map((s) => ({
        id: s.id,
        owner_id: s.ownerId,
        amount_paise: s.amountPaise,
        settled_at: s.settledAt,
        notes: s.notes,
        status: s.status,
        void_reason: s.voidReason,
        paid_by_owner_id: s.paidByOwnerId || null,
      }))
      const { error: sErr } = await client.from('owner_settlements').upsert(sRows)
      if (sErr && (sErr.code === '42703' || sErr.code === 'PGRST204' || sErr.message?.includes('paid_by_owner_id'))) {
        const fallback = sRows.map(({ paid_by_owner_id, ...rest }) => rest)
        await client.from('owner_settlements').upsert(fallback)
      }
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
          deducted_from_owner_id: t.deductedFromOwnerId || null,
        }))
      )
    }

    // 9. Sync settings
    await client.from('settings').upsert([
      { key: 'table_recovery_target', value: { amount_paise: settings.tableRecoveryTargetPaise } },
      { key: 'festival_fund_target', value: { amount_paise: settings.festivalFundTargetPaise } },
      { key: 'equal_distribution_threshold', value: { amount_paise: settings.equalDistributionThresholdPaise } },
      { key: 'absent_owner_percentage', value: { percentage: settings.absentOwnerPercentage } },
      { key: 'festival_fund_deducted_owner_id', value: { owner_id: settings.festivalFundDeductedOwnerId || null } },
    ])
  }

  // 12. CSV Export
  function exportCSV(type: 'summary' | 'players' | 'games' | 'payments' | 'expenses' | 'settlements') {
    const filename = `activity-ledger-${type}-${new Date().toISOString().split('T')[0]}.csv`
    let csvContent = ''

    // CSV cell encoder: numbers stay numeric; strings are quoted, inner quotes
    // doubled, and any leading =, +, -, @ (spreadsheet formula triggers) are
    // neutralized so a crafted name/note can't execute in Excel/Sheets.
    const cell = (value: string | number | null | undefined): string => {
      if (typeof value === 'number') return String(value)
      let s = String(value ?? '')
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
      return `"${s.replace(/"/g, '""')}"`
    }
    const row = (...cells: (string | number | null | undefined)[]) => cells.map(cell).join(',') + '\n'
    const playerName = (id: string) => players.find((p) => p.id === id)?.name || id
    const ownerName = (id: string) => owners.find((o) => o.id === id)?.name || id
    const rupees = (paise: number) => paise / 100

    if (type === 'players') {
      csvContent = row('Member Name', 'Total Fees Generated (INR)', 'Total Paid (INR)', 'Outstanding (INR)', 'Credit (INR)')
      for (const p of players) {
        // Align with the engine: exclude member-transfer and game-linked attribution
        // entries so this reconciles with the dashboard "Total Fees Generated".
        const gen = historicalRake
          .filter((h) => h.playerId === p.id && h.status === 'active' && !h.gameId && h.entryType !== 'member_transfer')
          .reduce((s, h) => s + h.amountPaise, 0)
        const paid = payments
          .filter((pay) => pay.playerId === p.id && pay.status === 'active' && pay.paymentType !== 'member_transfer')
          .reduce((s, pay) => s + pay.amountPaise, 0)
        const outstanding = Math.max(0, gen - paid)
        const credit = Math.max(0, paid - gen)
        csvContent += row(p.name, rupees(gen), rupees(paid), rupees(outstanding), rupees(credit))
      }
    } else if (type === 'games') {
      csvContent = row('Game #', 'Date', 'Status', 'Gross Rake (INR)', 'Expenses (INR)', 'Net Rake (INR)', 'Table Alloc (INR)', 'Festival Alloc (INR)', 'Distributable (INR)')
      // gameResults only contains active games; include voided games explicitly so status is accurate.
      for (const g of summary.gameResults) {
        csvContent += row(g.gameNumber, new Date(g.playedAt).toLocaleDateString(), 'active', rupees(g.grossRakePaise), rupees(g.totalExpensePaise), rupees(g.netRakePaise), rupees(g.tableRecoveryAllocatedPaise), rupees(g.festivalFundAllocatedPaise), rupees(g.distributableRakePaise))
      }
      for (const g of games.filter((gm) => gm.status === 'voided')) {
        const exp = (g.expenses || []).reduce((s, e) => s + e.amountPaise, 0)
        csvContent += row(g.gameNumber, new Date(g.playedAt).toLocaleDateString(), 'voided', rupees(g.grossRakePaise), rupees(exp), 0, 0, 0, 0)
      }
    } else if (type === 'expenses') {
      csvContent = row('Date', 'Type', 'Description', 'Amount (INR)', 'Game ID', 'Status')
      for (const e of expenses) {
        csvContent += row(new Date(e.expenseDate).toLocaleDateString(), e.type, e.description, rupees(e.amountPaise), e.gameId || 'None', e.status)
      }
    } else if (type === 'payments') {
      csvContent = row('Date', 'Member', 'Amount (INR)', 'Type', 'Notes', 'Status')
      for (const p of payments) {
        csvContent += row(new Date(p.paidAt).toLocaleDateString(), playerName(p.playerId), rupees(p.amountPaise), p.paymentType || 'direct', p.notes || '', p.status)
      }
    } else if (type === 'settlements') {
      csvContent = row('Date', 'Owner', 'Amount (INR)', 'Notes', 'Status')
      for (const s of settlements) {
        csvContent += row(new Date(s.settledAt).toLocaleDateString(), ownerName(s.ownerId), rupees(s.amountPaise), s.notes || '', s.status)
      }
    } else {
      // Summary
      csvContent = row('Metric', 'Amount (INR)')
      csvContent += row('Total Rake Generated', rupees(summary.totalRakeGeneratedPaise))
      csvContent += row('Total Rake Collected', rupees(summary.totalRakeCollectedPaise))
      csvContent += row('Total Outstanding', rupees(summary.totalOutstandingPaise))
      csvContent += row('Table Recovery Accumulated', rupees(summary.tableRecoveryAccumulatedPaise))
      csvContent += row('Table Recovery Target', rupees(summary.tableRecoveryTargetPaise))
      csvContent += row('Festival Fund Accumulated', rupees(summary.festivalFundAccumulatedPaise))
      csvContent += row('Festival Fund Target', rupees(summary.festivalFundTargetPaise))
      csvContent += row('Total Distributable Rake', rupees(summary.totalDistributableRakePaise))
      csvContent += row('Total Owner Entitlement', rupees(summary.totalOwnerEntitlementPaise))
      csvContent += row('Total Owner Settled', rupees(summary.totalOwnerSettledPaise))
      csvContent += row('Remaining Owner Settlement', rupees(summary.remainingOwnerSettlementPaise))
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 13. Auth — real Supabase Auth only. There is no client-side password; access
  // is enforced server-side by Row Level Security, so credentials never ship in
  // the bundle and nothing is leaked back to the browser on failure.
  async function signIn(email: string, pass: string) {
    const trimmedUser = email.trim()

    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Cloud database is not configured. Add your Supabase project in Settings → Database before signing in.') }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedUser,
      password: pass,
    })

    if (error || !data.session) {
      return { error: new Error(error?.message || 'Invalid email or password.') }
    }

    setIsAuthenticated(true)
    setUserEmail(data.session.user.email || trimmedUser)
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user: data.session.user.email || trimmedUser, loggedInAt: Date.now() }))
    } catch {
      // ignore
    }
    // Pull the authoritative ledger now that we have an authenticated session.
    await fetchCloudState()
    return { error: null }
  }

  async function signOut() {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY)
    } catch {
      // ignore
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
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
        deleteGame,
        addSessionExpense,
        removeSessionExpense,
        addHistoricalRake,
        editHistoricalRake,
        deleteHistoricalRake,
        voidHistoricalRake,
        addPayment,
        editPayment,
        deletePayment,
        transferBetweenMembers,
        voidPayment,
        updatePaymentCollector,
        assignAllUnassignedPayments,
        addExpense,
        editExpense,
        deleteExpense,
        voidExpense,
        recordOwnerSettlement,
        editOwnerSettlement,
        deleteOwnerSettlement,
        voidOwnerSettlement,
        addBucketTransfer,
        editBucketTransfer,
        deleteBucketTransfer,
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
