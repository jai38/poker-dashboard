import {
  AccountingSettings,
  DEFAULT_ACCOUNTING_SETTINGS,
  GameCalculationResult,
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
  OwnerP2PTransfer,
} from './types'

/**
 * Validates that at least one owner was present for a game.
 */
export function validateOwnerAttendance(owners: OwnerAttendance[]): void {
  const hasPresentOwner = owners.some((o) => o.present)
  if (!hasPresentOwner) {
    throw new Error('At least one owner must be present to save a game.')
  }
}

/**
 * Calculates net rake for a game by deducting session expenses.
 * Net rake cannot be negative. If expenses exceed gross rake, net rake is 0
 * and uncovered expenses are tracked.
 */
export function calculateGameNetRake(
  grossRakePaise: number,
  expenses: SessionExpense[]
): { netRakePaise: number; totalExpensePaise: number; uncoveredExpensePaise: number } {
  if (grossRakePaise < 0) {
    throw new Error('Gross rake cannot be negative.')
  }

  const totalExpensePaise = expenses.reduce((sum, exp) => {
    if (exp.amountPaise < 0) {
      throw new Error('Expense amount cannot be negative.')
    }
    return sum + exp.amountPaise
  }, 0)

  const netRakePaise = Math.max(0, grossRakePaise - totalExpensePaise)
  const uncoveredExpensePaise = Math.max(0, totalExpensePaise - grossRakePaise)

  return { netRakePaise, totalExpensePaise, uncoveredExpensePaise }
}

/**
 * Allocates available net rake to Table Recovery and Festival Fund buckets sequentially.
 * Any remainder becomes distributable rake.
 */
export function allocateRakeToBuckets(
  availableNetRakePaise: number,
  accumulatedTablePaise: number,
  tableTargetPaise: number,
  accumulatedFestivalPaise: number,
  festivalTargetPaise: number
): {
  allocatedToTablePaise: number
  allocatedToFestivalPaise: number
  distributableRakePaise: number
} {
  if (availableNetRakePaise < 0) {
    throw new Error('Available net rake cannot be negative.')
  }

  const tableRemaining = Math.max(0, tableTargetPaise - accumulatedTablePaise)
  const allocatedToTablePaise = Math.min(availableNetRakePaise, tableRemaining)

  const afterTable = availableNetRakePaise - allocatedToTablePaise

  const festivalRemaining = Math.max(0, festivalTargetPaise - accumulatedFestivalPaise)
  const allocatedToFestivalPaise = Math.min(afterTable, festivalRemaining)

  const distributableRakePaise = afterTable - allocatedToFestivalPaise

  return {
    allocatedToTablePaise,
    allocatedToFestivalPaise,
    distributableRakePaise,
  }
}

/**
 * Calculates excess rake distribution according to Section 14 attendance rules.
 * - Absent owners receive configured percentage (e.g. 10% each)
 * - Present owners split the remaining excess amount equally
 */
export function calculateExcessDistribution(params: {
  excessRakePaise: number
  owners: OwnerAttendance[]
  absentOwnerPercentage?: number
}): Record<string, number> {
  const { excessRakePaise, owners, absentOwnerPercentage = DEFAULT_ACCOUNTING_SETTINGS.absentOwnerPercentage } = params

  if (excessRakePaise < 0) {
    throw new Error('Excess rake cannot be negative.')
  }

  validateOwnerAttendance(owners)

  const excessDistributions: Record<string, number> = {}
  for (const o of owners) {
    excessDistributions[o.ownerId] = 0
  }

  if (excessRakePaise === 0) {
    return excessDistributions
  }

  const absentOwners = owners.filter((o) => !o.present)
  const presentOwners = owners.filter((o) => o.present)

  if (absentOwners.length === 0) {
    const count = presentOwners.length
    const base = Math.floor(excessRakePaise / count)
    let rem = excessRakePaise % count
    for (let i = 0; i < count; i++) {
      const ownerId = presentOwners[i].ownerId
      excessDistributions[ownerId] = base + (rem > 0 ? 1 : 0)
      if (rem > 0) rem--
    }
    return excessDistributions
  }

  const absentSharePerOwner = Math.floor(excessRakePaise * absentOwnerPercentage)
  const totalAbsentShare = absentSharePerOwner * absentOwners.length

  for (const absent of absentOwners) {
    excessDistributions[absent.ownerId] = absentSharePerOwner
  }

  const remainingForPresent = excessRakePaise - totalAbsentShare
  const presentCount = presentOwners.length
  const presentBasePerOwner = Math.floor(remainingForPresent / presentCount)
  let presentRemainder = remainingForPresent % presentCount

  for (let i = 0; i < presentCount; i++) {
    const ownerId = presentOwners[i].ownerId
    excessDistributions[ownerId] = presentBasePerOwner + (presentRemainder > 0 ? 1 : 0)
    if (presentRemainder > 0) presentRemainder--
  }

  return excessDistributions
}

/**
 * Calculates owner distributions for a single game's distributable rake.
 * - Distributable <= threshold (e.g. ₹1,000): split equally among all owners regardless of presence.
 * - Distributable > threshold:
 *   - First ₹1,000 split equally among all owners.
 *   - Excess above ₹1,000: absent owners get 10% each; present owners split the remainder equally.
 * Exact integer paise arithmetic is preserved so sum(distributions) === distributableRakePaise.
 */
export function calculateOwnerDistribution(params: {
  distributableRakePaise: number
  owners: OwnerAttendance[]
  settings?: AccountingSettings
}): {
  ownerDistributions: Record<string, number>
  ownerEqualShare: Record<string, number>
  ownerExcessShare: Record<string, number>
} {
  const { distributableRakePaise, owners, settings = DEFAULT_ACCOUNTING_SETTINGS } = params

  if (distributableRakePaise < 0) {
    throw new Error('Distributable rake cannot be negative.')
  }

  const totalOwnersCount = owners.length
  if (totalOwnersCount === 0) {
    throw new Error('Owners list cannot be empty.')
  }

  validateOwnerAttendance(owners)

  const ownerDistributions: Record<string, number> = {}
  const ownerEqualShare: Record<string, number> = {}
  const ownerExcessShare: Record<string, number> = {}

  // Initialize all to 0
  for (const o of owners) {
    ownerDistributions[o.ownerId] = 0
    ownerEqualShare[o.ownerId] = 0
    ownerExcessShare[o.ownerId] = 0
  }

  if (distributableRakePaise === 0) {
    return { ownerDistributions, ownerEqualShare, ownerExcessShare }
  }

  // --- Step 1: Equal Distribution Bucket (up to threshold, e.g. ₹1,000 = 100,000 paise) ---
  const equalBucketTotal = Math.min(distributableRakePaise, settings.equalDistributionThresholdPaise)
  const equalBasePerOwner = Math.floor(equalBucketTotal / totalOwnersCount)
  let equalRemainder = equalBucketTotal % totalOwnersCount

  for (let i = 0; i < totalOwnersCount; i++) {
    const ownerId = owners[i].ownerId
    const share = equalBasePerOwner + (equalRemainder > 0 ? 1 : 0)
    if (equalRemainder > 0) equalRemainder--
    ownerEqualShare[ownerId] = share
    ownerDistributions[ownerId] += share
  }

  // --- Step 2: Excess Rake Bucket (> threshold) ---
  const excessRakePaise = distributableRakePaise - equalBucketTotal

  if (excessRakePaise > 0) {
    const excessDistributions = calculateExcessDistribution({
      excessRakePaise,
      owners,
      absentOwnerPercentage: settings.absentOwnerPercentage,
    })

    for (const [ownerId, amount] of Object.entries(excessDistributions)) {
      ownerExcessShare[ownerId] = amount
      ownerDistributions[ownerId] += amount
    }
  }

  return { ownerDistributions, ownerEqualShare, ownerExcessShare }
}


/**
 * Calculates player outstanding balance.
 */
export function calculatePlayerOutstanding(totalGeneratedPaise: number, totalPaidPaise: number): number {
  if (totalPaidPaise > totalGeneratedPaise) {
    // In V1 overpayment is warned/prevented; return remaining or 0
    return 0
  }
  return totalGeneratedPaise - totalPaidPaise
}

/**
 * Master Accounting Engine Ledger Calculation
 * Pure, deterministic, chronologically orders all active transactions,
 * computes Table Recovery, Festival Fund, Game distributions, and owner entitlements.
 */
export function calculateLedgerSummary(params: {
  owners: Owner[]
  games: GameRecord[]
  historicalRake: HistoricalRakeEntry[]
  payments: PlayerPayment[]
  expenses: GeneralExpense[]
  settlements: OwnerSettlement[]
  bucketTransfers?: BucketTransfer[]
  settings?: AccountingSettings
}): LedgerSummary {
  const {
    owners,
    games,
    historicalRake,
    payments,
    expenses,
    settlements,
    bucketTransfers = [],
    settings = DEFAULT_ACCOUNTING_SETTINGS,
  } = params

  const activeOwners = owners.filter((o) => o.isActive)

  // 1. Total Rake Generated & Collected
  const activeHistorical = historicalRake.filter((h) => h.status === 'active')
  const activeGames = games.filter((g) => g.status === 'active')
  const activePayments = payments.filter((p) => p.status === 'active')
  const activeExpenses = expenses.filter((e) => e.status === 'active')
  const activeSettlements = settlements.filter((s) => s.status === 'active')
  const activeTransfers = bucketTransfers.filter((t) => t.status === 'active')

  const totalHistoricalRakePaise = activeHistorical.reduce((sum, h) => sum + h.amountPaise, 0)
  const totalGameGrossRakePaise = activeGames.reduce((sum, g) => sum + g.grossRakePaise, 0)
  const totalRakeGeneratedPaise = totalHistoricalRakePaise + totalGameGrossRakePaise

  const totalRakeCollectedPaise = activePayments.reduce((sum, p) => sum + p.amountPaise, 0)
  const totalOutstandingPaise = Math.max(0, totalRakeGeneratedPaise - totalRakeCollectedPaise)

  // 2. Chronological Waterfall Processing
  type TimelineItem =
    | { type: 'historical'; date: Date; entry: HistoricalRakeEntry }
    | { type: 'game'; date: Date; entry: GameRecord }
    | { type: 'transfer'; date: Date; entry: BucketTransfer }

  const timeline: TimelineItem[] = [
    ...activeHistorical.map((h) => ({
      type: 'historical' as const,
      date: new Date(h.entryDate),
      entry: h,
    })),
    ...activeGames.map((g) => ({
      type: 'game' as const,
      date: new Date(g.playedAt),
      entry: g,
    })),
    ...activeTransfers.map((t) => ({
      type: 'transfer' as const,
      date: new Date(t.transferredAt),
      entry: t,
    })),
  ]

  // Sort chronologically. If dates are equal, historical entries come first, then games by gameNumber, then transfers.
  timeline.sort((a, b) => {
    const timeDiff = a.date.getTime() - b.date.getTime()
    if (timeDiff !== 0) return timeDiff
    if (a.type !== b.type) {
      if (a.type === 'historical') return -1
      if (b.type === 'historical') return 1
      if (a.type === 'game') return -1
      if (b.type === 'game') return 1
    }
    if (a.type === 'game' && b.type === 'game') {
      return a.entry.gameNumber - b.entry.gameNumber
    }
    return 0
  })

  let currentTableAccumulatedPaise = 0
  let currentFestivalAccumulatedPaise = 0
  let totalDistributableRakePaise = 0

  const gameResults: GameCalculationResult[] = []

  // Initialize owner entitlements
  const ownerEntitlements: LedgerSummary['ownerEntitlements'] = {}
  for (const o of activeOwners) {
    ownerEntitlements[o.id] = {
      ownerId: o.id,
      equalSharePaise: 0,
      excessSharePaise: 0,
      grossEntitlementPaise: 0,
      settledPaise: 0,
      remainingEntitlementPaise: 0,
      cashCollectedPaise: 0,
      expensesPaidPaise: 0,
      settlementsPaidPaise: 0,
      netCashHeldPaise: 0,
      netPositionPaise: 0,
      tableReservesHeldPaise: 0,
    }
  }

  for (const item of timeline) {
    if (item.type === 'historical') {
      // Historical rake contributes to Table Recovery & Festival Fund,
      // but DOES NOT generate owner profit distributions (no invented attendance).
      const { allocatedToTablePaise, allocatedToFestivalPaise } = allocateRakeToBuckets(
        item.entry.amountPaise,
        currentTableAccumulatedPaise,
        settings.tableRecoveryTargetPaise,
        currentFestivalAccumulatedPaise,
        settings.festivalFundTargetPaise
      )

      currentTableAccumulatedPaise += allocatedToTablePaise
      currentFestivalAccumulatedPaise += allocatedToFestivalPaise
      // Any remaining historical rake beyond table and festival fund is unassigned
    } else if (item.type === 'transfer') {
      // Reallocate amount between buckets
      const transfer = item.entry
      const amt = transfer.amountPaise

      // Deduct from source bucket
      if (transfer.fromBucket === 'table_recovery') {
        currentTableAccumulatedPaise = Math.max(0, currentTableAccumulatedPaise - amt)
      } else if (transfer.fromBucket === 'festival_fund') {
        currentFestivalAccumulatedPaise = Math.max(0, currentFestivalAccumulatedPaise - amt)
      }

      // Add to destination bucket
      if (transfer.toBucket === 'table_recovery') {
        currentTableAccumulatedPaise += amt
      } else if (transfer.toBucket === 'festival_fund') {
        currentFestivalAccumulatedPaise += amt
      } else if (transfer.toBucket === 'owner_profit') {
        totalDistributableRakePaise += amt
        // Distribute transferred profit equally among all active table owners
        const count = activeOwners.length
        if (count > 0) {
          const base = Math.floor(amt / count)
          let rem = amt % count
          for (const o of activeOwners) {
            const share = base + (rem > 0 ? 1 : 0)
            if (rem > 0) rem--
            if (!ownerEntitlements[o.id]) {
              ownerEntitlements[o.id] = {
                ownerId: o.id,
                equalSharePaise: 0,
                excessSharePaise: 0,
                grossEntitlementPaise: 0,
                settledPaise: 0,
                remainingEntitlementPaise: 0,
                cashCollectedPaise: 0,
                expensesPaidPaise: 0,
                settlementsPaidPaise: 0,
                netCashHeldPaise: 0,
                netPositionPaise: 0,
                tableReservesHeldPaise: 0,
              }
            }
            ownerEntitlements[o.id].equalSharePaise += share
            ownerEntitlements[o.id].grossEntitlementPaise += share
          }
        }
      }
    } else {
      // Game entry
      const game = item.entry
      const { netRakePaise, totalExpensePaise, uncoveredExpensePaise } = calculateGameNetRake(
        game.grossRakePaise,
        game.expenses || []
      )

      let allocatedToTablePaise: number
      let allocatedToFestivalPaise: number
      let distributableRakePaise: number

      if (game.customAllocation) {
        // User explicitly specified how much goes to where
        allocatedToTablePaise = Math.max(0, game.customAllocation.tableRecoveryPaise || 0)
        allocatedToFestivalPaise = Math.max(0, game.customAllocation.festivalFundPaise || 0)
        distributableRakePaise = Math.max(0, game.customAllocation.distributableProfitPaise || 0)

        // Validate sum matches net rake; adjust profit if rounding or mismatch
        const customSum = allocatedToTablePaise + allocatedToFestivalPaise + distributableRakePaise
        if (customSum !== netRakePaise) {
          distributableRakePaise = Math.max(0, netRakePaise - (allocatedToTablePaise + allocatedToFestivalPaise))
        }
      } else {
        // Default standard automatic waterfall
        const alloc = allocateRakeToBuckets(
          netRakePaise,
          currentTableAccumulatedPaise,
          settings.tableRecoveryTargetPaise,
          currentFestivalAccumulatedPaise,
          settings.festivalFundTargetPaise
        )
        allocatedToTablePaise = alloc.allocatedToTablePaise
        allocatedToFestivalPaise = alloc.allocatedToFestivalPaise
        distributableRakePaise = alloc.distributableRakePaise
      }

      currentTableAccumulatedPaise += allocatedToTablePaise
      currentFestivalAccumulatedPaise += allocatedToFestivalPaise
      totalDistributableRakePaise += distributableRakePaise

      let distributions: Record<string, number> = {}
      let equalShare: Record<string, number> = {}
      let excessShare: Record<string, number> = {}

      if (distributableRakePaise > 0) {
        const distResult = calculateOwnerDistribution({
          distributableRakePaise,
          owners: game.owners,
          settings,
        })
        distributions = distResult.ownerDistributions
        equalShare = distResult.ownerEqualShare
        excessShare = distResult.ownerExcessShare

        for (const [ownerId, amount] of Object.entries(distributions)) {
          if (!ownerEntitlements[ownerId]) {
            ownerEntitlements[ownerId] = {
              ownerId,
              equalSharePaise: 0,
              excessSharePaise: 0,
              grossEntitlementPaise: 0,
              settledPaise: 0,
              remainingEntitlementPaise: 0,
              cashCollectedPaise: 0,
              expensesPaidPaise: 0,
              settlementsPaidPaise: 0,
              netCashHeldPaise: 0,
              netPositionPaise: 0,
              tableReservesHeldPaise: 0,
            }
          }
          ownerEntitlements[ownerId].equalSharePaise += equalShare[ownerId] || 0
          ownerEntitlements[ownerId].excessSharePaise += excessShare[ownerId] || 0
          ownerEntitlements[ownerId].grossEntitlementPaise += amount
        }
      }

      gameResults.push({
        gameId: game.id,
        gameNumber: game.gameNumber,
        playedAt: game.playedAt,
        grossRakePaise: game.grossRakePaise,
        totalExpensePaise,
        netRakePaise,
        uncoveredExpensePaise,
        tableRecoveryAllocatedPaise: allocatedToTablePaise,
        festivalFundAllocatedPaise: allocatedToFestivalPaise,
        distributableRakePaise,
        ownerDistributions: distributions,
        ownerEqualShare: equalShare,
        ownerExcessShare: excessShare,
      })
    }
  }

  // 3. Process Cash Custody (Player payments received in partner accounts)
  let unassignedCashPaise = 0
  for (const payment of activePayments) {
    if (payment.receivedByOwnerId && ownerEntitlements[payment.receivedByOwnerId]) {
      ownerEntitlements[payment.receivedByOwnerId].cashCollectedPaise += payment.amountPaise
    } else {
      unassignedCashPaise += payment.amountPaise
    }
  }

  // 4. Process Expenses Paid Out of Pocket by Owners
  for (const game of activeGames) {
    for (const exp of game.expenses || []) {
      if (exp.paidByOwnerId && ownerEntitlements[exp.paidByOwnerId]) {
        ownerEntitlements[exp.paidByOwnerId].expensesPaidPaise += exp.amountPaise
      }
    }
  }

  for (const exp of activeExpenses) {
    if (exp.paidByOwnerId && ownerEntitlements[exp.paidByOwnerId]) {
      ownerEntitlements[exp.paidByOwnerId].expensesPaidPaise += exp.amountPaise
    }
  }

  // 5. Process Owner Settlements (P2P payouts & table settlements)
  for (const settlement of activeSettlements) {
    if (ownerEntitlements[settlement.ownerId]) {
      ownerEntitlements[settlement.ownerId].settledPaise += settlement.amountPaise
    }
    if (settlement.paidByOwnerId && ownerEntitlements[settlement.paidByOwnerId]) {
      ownerEntitlements[settlement.paidByOwnerId].settlementsPaidPaise += settlement.amountPaise
    }
  }

  let totalOwnerEntitlementPaise = 0
  let totalOwnerSettledPaise = 0
  let remainingOwnerSettlementPaise = 0

  for (const ent of Object.values(ownerEntitlements)) {
    ent.remainingEntitlementPaise = Math.max(0, ent.grossEntitlementPaise - ent.settledPaise)
    ent.netCashHeldPaise = ent.cashCollectedPaise - ent.expensesPaidPaise - ent.settlementsPaidPaise
    // Net Position: positive = owed to partner; negative = partner holding excess table cash
    ent.netPositionPaise = ent.remainingEntitlementPaise - ent.netCashHeldPaise
    totalOwnerEntitlementPaise += ent.grossEntitlementPaise
    totalOwnerSettledPaise += ent.settledPaise
    remainingOwnerSettlementPaise += ent.remainingEntitlementPaise
  }

  // 6. Calculate Peer-to-Peer Transfer Recommendations & Table Reserves Custody
  const recommendedTransfers: OwnerP2PTransfer[] = []

  interface BalanceItem {
    ownerId: string
    balancePaise: number
  }

  const creditors: BalanceItem[] = []
  const debtors: BalanceItem[] = []

  for (const ent of Object.values(ownerEntitlements)) {
    if (ent.netPositionPaise > 0) {
      creditors.push({ ownerId: ent.ownerId, balancePaise: ent.netPositionPaise })
    } else if (ent.netPositionPaise < 0) {
      debtors.push({ ownerId: ent.ownerId, balancePaise: Math.abs(ent.netPositionPaise) })
    }
  }

  let cIdx = 0
  let dIdx = 0

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx]
    const debtor = debtors[dIdx]
    const transferPaise = Math.min(creditor.balancePaise, debtor.balancePaise)

    if (transferPaise > 0) {
      recommendedTransfers.push({
        fromOwnerId: debtor.ownerId,
        toOwnerId: creditor.ownerId,
        amountPaise: transferPaise,
        purpose: 'Partner profit / expense settlement',
      })
      creditor.balancePaise -= transferPaise
      debtor.balancePaise -= transferPaise
    }

    if (creditor.balancePaise === 0) cIdx++
    if (debtor.balancePaise === 0) dIdx++
  }

  // Any remaining excess held by debtors represents money held for Table Recovery / Festival Fund
  for (const debtor of debtors) {
    if (debtor.balancePaise > 0 && ownerEntitlements[debtor.ownerId]) {
      ownerEntitlements[debtor.ownerId].tableReservesHeldPaise = debtor.balancePaise
    }
  }

  const totalTableReservesAccumulatedPaise = currentTableAccumulatedPaise + currentFestivalAccumulatedPaise
  const totalTableReservesInCustodyPaise =
    Object.values(ownerEntitlements).reduce((sum, ent) => sum + ent.tableReservesHeldPaise, 0) +
    unassignedCashPaise

  // 7. Expenses summary
  const totalSessionExpensesPaise = activeGames.reduce(
    (sum, g) => sum + (g.expenses || []).reduce((s, e) => s + e.amountPaise, 0),
    0
  )

  const generalExpensesList = activeExpenses.filter((e) => e.type === 'monthly_expense')
  const totalGeneralExpensesPaise = generalExpensesList.reduce((sum, e) => sum + e.amountPaise, 0)

  const creditsAdjustmentsList = activeExpenses.filter((e) => e.type === 'credit_adjustment')
  const totalCreditsAdjustmentsPaise = creditsAdjustmentsList.reduce((sum, e) => sum + e.amountPaise, 0)

  const netGeneralAdjustmentPaise = totalGeneralExpensesPaise - totalCreditsAdjustmentsPaise

  // 8. Verification / Reconciliation
  const reconciliationDiffPaise = totalDistributableRakePaise - totalOwnerEntitlementPaise
  const reconciled = reconciliationDiffPaise === 0

  return {
    totalRakeGeneratedPaise,
    totalRakeCollectedPaise,
    totalOutstandingPaise,

    tableRecoveryTargetPaise: settings.tableRecoveryTargetPaise,
    tableRecoveryAccumulatedPaise: currentTableAccumulatedPaise,
    tableRecoveryRemainingPaise: Math.max(
      0,
      settings.tableRecoveryTargetPaise - currentTableAccumulatedPaise
    ),
    isTableRecoveryComplete: currentTableAccumulatedPaise >= settings.tableRecoveryTargetPaise,

    festivalFundTargetPaise: settings.festivalFundTargetPaise,
    festivalFundAccumulatedPaise: currentFestivalAccumulatedPaise,
    festivalFundRemainingPaise: Math.max(
      0,
      settings.festivalFundTargetPaise - currentFestivalAccumulatedPaise
    ),
    isFestivalFundComplete: currentFestivalAccumulatedPaise >= settings.festivalFundTargetPaise,

    totalDistributableRakePaise,

    totalSessionExpensesPaise,
    totalGeneralExpensesPaise,
    totalCreditsAdjustmentsPaise,
    netGeneralAdjustmentPaise,

    ownerEntitlements,
    totalOwnerEntitlementPaise,
    totalOwnerSettledPaise,
    remainingOwnerSettlementPaise,

    unassignedCashPaise,
    recommendedTransfers,
    totalTableReservesAccumulatedPaise,
    totalTableReservesInCustodyPaise,

    reconciled,
    reconciliationDiffPaise,
    gameResults,
    transfers: activeTransfers,
  }
}
