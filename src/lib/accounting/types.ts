/**
 * Pure Accounting Engine Types
 * All monetary amounts are stored and calculated in integer PAISE (1 INR = 100 Paise).
 */

export interface Owner {
  id: string
  name: string
  isActive: boolean
}

export interface OwnerAttendance {
  ownerId: string
  present: boolean
}

export interface SessionExpense {
  id?: string
  amountPaise: number
  description: string
  category?: string
}

export interface CustomGameAllocation {
  tableRecoveryPaise: number
  festivalFundPaise: number
  distributableProfitPaise: number
}

export interface GameRecord {
  id: string
  gameNumber: number
  playedAt: string | Date
  grossRakePaise: number
  expenses: SessionExpense[]
  owners: OwnerAttendance[]
  status: 'active' | 'voided'
  notes?: string
  voidReason?: string
  customAllocation?: CustomGameAllocation
}

export interface BucketTransfer {
  id: string
  transferredAt: string | Date
  fromBucket: 'table_recovery' | 'festival_fund'
  toBucket: 'table_recovery' | 'festival_fund' | 'owner_profit'
  amountPaise: number
  notes?: string
  status: 'active' | 'voided'
  voidReason?: string
}

export interface HistoricalRakeEntry {
  id: string
  playerId: string
  amountPaise: number
  entryDate: string | Date
  status: 'active' | 'voided'
  notes?: string
  voidReason?: string
}

export interface PlayerPayment {
  id: string
  playerId: string
  amountPaise: number
  paidAt: string | Date
  status: 'active' | 'voided'
  notes?: string
  voidReason?: string
}

export interface GeneralExpense {
  id: string
  type: 'session_expense' | 'monthly_expense' | 'credit_adjustment'
  amountPaise: number
  description: string
  expenseDate: string | Date
  gameId?: string | null
  status: 'active' | 'voided'
  voidReason?: string
}

export interface OwnerSettlement {
  id: string
  ownerId: string
  amountPaise: number
  settledAt: string | Date
  status: 'active' | 'voided'
  notes?: string
  voidReason?: string
}

export interface AccountingSettings {
  tableRecoveryTargetPaise: number // e.g. 6,500,000 paise = ₹65,000
  festivalFundTargetPaise: number  // e.g. 3,000,000 paise = ₹30,000
  equalDistributionThresholdPaise: number // e.g. 100,000 paise = ₹1,000
  absentOwnerPercentage: number // e.g. 0.10 for 10%
  numberOfOwners: number // 4
}

export const DEFAULT_ACCOUNTING_SETTINGS: AccountingSettings = {
  tableRecoveryTargetPaise: 65000 * 100,
  festivalFundTargetPaise: 30000 * 100,
  equalDistributionThresholdPaise: 1000 * 100,
  absentOwnerPercentage: 0.10,
  numberOfOwners: 4,
}

export interface GameCalculationResult {
  gameId: string
  gameNumber: number
  playedAt: string | Date
  grossRakePaise: number
  totalExpensePaise: number
  netRakePaise: number
  uncoveredExpensePaise: number // If expenses > gross rake
  tableRecoveryAllocatedPaise: number
  festivalFundAllocatedPaise: number
  distributableRakePaise: number
  ownerDistributions: Record<string, number> // ownerId -> paise
  ownerEqualShare: Record<string, number>    // portion from <= equal bucket
  ownerExcessShare: Record<string, number>   // portion from > equal bucket
}

export interface WaterfallItem {
  id: string
  type: 'game' | 'historical'
  date: string | Date
  grossRakePaise: number
  expensePaise: number
  netRakePaise: number
  allocatedToTablePaise: number
  allocatedToFestivalPaise: number
  distributablePaise: number
}

export interface LedgerSummary {
  // Aggregate Rake
  totalRakeGeneratedPaise: number
  totalRakeCollectedPaise: number
  totalOutstandingPaise: number

  // Waterfall Allocation
  tableRecoveryTargetPaise: number
  tableRecoveryAccumulatedPaise: number
  tableRecoveryRemainingPaise: number
  isTableRecoveryComplete: boolean

  festivalFundTargetPaise: number
  festivalFundAccumulatedPaise: number
  festivalFundRemainingPaise: number
  isFestivalFundComplete: boolean

  totalDistributableRakePaise: number

  // Expenses & Adjustments
  totalSessionExpensesPaise: number
  totalGeneralExpensesPaise: number
  totalCreditsAdjustmentsPaise: number
  netGeneralAdjustmentPaise: number // General expenses minus credits

  // Owner Accounting
  ownerEntitlements: Record<string, {
    ownerId: string
    equalSharePaise: number
    excessSharePaise: number
    grossEntitlementPaise: number
    settledPaise: number
    remainingEntitlementPaise: number
  }>
  totalOwnerEntitlementPaise: number
  totalOwnerSettledPaise: number
  remainingOwnerSettlementPaise: number

  // Audit / Reconciliation
  reconciled: boolean
  reconciliationDiffPaise: number
  gameResults: GameCalculationResult[]
  transfers: BucketTransfer[]
}
