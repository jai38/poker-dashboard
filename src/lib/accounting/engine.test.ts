import { describe, expect, it } from 'vitest'
import {
  allocateRakeToBuckets,
  calculateExcessDistribution,
  calculateGameNetRake,
  calculateLedgerSummary,
  calculateOwnerDistribution,
  calculatePlayerOutstanding,
  validateOwnerAttendance,
} from './engine'
import { DEFAULT_ACCOUNTING_SETTINGS, GameRecord, Owner, OwnerAttendance } from './types'


describe('Pure Accounting Engine Specification Tests', () => {
  const defaultOwners: OwnerAttendance[] = [
    { ownerId: 'o1', present: true },
    { ownerId: 'o2', present: true },
    { ownerId: 'o3', present: true },
    { ownerId: 'o4', present: true },
  ]

  const mockOwnerDefs: Owner[] = [
    { id: 'o1', name: 'Owner 1', isActive: true },
    { id: 'o2', name: 'Owner 2', isActive: true },
    { id: 'o3', name: 'Owner 3', isActive: true },
    { id: 'o4', name: 'Owner 4', isActive: true },
  ]

  // Test 1: ₹700 distributable -> ₹175 each
  it('Test 1: ₹700 distributable divides equally into ₹175 each', () => {
    const result = calculateOwnerDistribution({
      distributableRakePaise: 700 * 100,
      owners: defaultOwners,
    })
    expect(result.ownerDistributions['o1']).toBe(175 * 100)
    expect(result.ownerDistributions['o2']).toBe(175 * 100)
    expect(result.ownerDistributions['o3']).toBe(175 * 100)
    expect(result.ownerDistributions['o4']).toBe(175 * 100)
  })

  // Test 2: ₹1,000 distributable -> ₹250 each
  it('Test 2: ₹1,000 distributable divides equally into ₹250 each', () => {
    const result = calculateOwnerDistribution({
      distributableRakePaise: 1000 * 100,
      owners: defaultOwners,
    })
    expect(result.ownerDistributions['o1']).toBe(250 * 100)
    expect(result.ownerDistributions['o2']).toBe(250 * 100)
    expect(result.ownerDistributions['o3']).toBe(250 * 100)
    expect(result.ownerDistributions['o4']).toBe(250 * 100)
  })

  // Test 3: ₹2,000, all present -> ₹500 each
  it('Test 3: ₹2,000 with 4 owners present results in ₹500 each', () => {
    const result = calculateOwnerDistribution({
      distributableRakePaise: 2000 * 100,
      owners: defaultOwners,
    })
    expect(result.ownerDistributions['o1']).toBe(500 * 100)
    expect(result.ownerDistributions['o2']).toBe(500 * 100)
    expect(result.ownerDistributions['o3']).toBe(500 * 100)
    expect(result.ownerDistributions['o4']).toBe(500 * 100)
  })

  // Test 4: ₹2,000 excess, 3 present / 1 absent -> Present = ₹600 each, Absent = ₹200 (Section 14 & 33)
  it('Test 4: ₹2,000 excess with 3 present / 1 absent results in Present=₹600 each, Absent=₹200', () => {
    const owners: OwnerAttendance[] = [
      { ownerId: 'o1', present: true },
      { ownerId: 'o2', present: true },
      { ownerId: 'o3', present: true },
      { ownerId: 'o4', present: false },
    ]
    const result = calculateExcessDistribution({
      excessRakePaise: 2000 * 100,
      owners,
    })
    expect(result['o1']).toBe(600 * 100)
    expect(result['o2']).toBe(600 * 100)
    expect(result['o3']).toBe(600 * 100)
    expect(result['o4']).toBe(200 * 100)
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBe(2000 * 100)
  })

  // Test 5: ₹2,000 excess, 2 present / 2 absent -> Present = ₹800 each, Absent = ₹200 each (Section 14 & 33)
  it('Test 5: ₹2,000 excess with 2 present / 2 absent results in Present=₹800 each, Absent=₹200 each', () => {
    const owners: OwnerAttendance[] = [
      { ownerId: 'o1', present: true },
      { ownerId: 'o2', present: true },
      { ownerId: 'o3', present: false },
      { ownerId: 'o4', present: false },
    ]
    const result = calculateExcessDistribution({
      excessRakePaise: 2000 * 100,
      owners,
    })
    expect(result['o1']).toBe(800 * 100)
    expect(result['o2']).toBe(800 * 100)
    expect(result['o3']).toBe(200 * 100)
    expect(result['o4']).toBe(200 * 100)
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBe(2000 * 100)
  })

  // Test 6: ₹2,000 excess, 1 present / 3 absent -> Present = ₹1,400, Absent = ₹200 each (Section 14 & 33)
  it('Test 6: ₹2,000 excess with 1 present / 3 absent results in Present=₹1,400, Absent=₹200 each', () => {
    const owners: OwnerAttendance[] = [
      { ownerId: 'o1', present: true },
      { ownerId: 'o2', present: false },
      { ownerId: 'o3', present: false },
      { ownerId: 'o4', present: false },
    ]
    const result = calculateExcessDistribution({
      excessRakePaise: 2000 * 100,
      owners,
    })
    expect(result['o1']).toBe(1400 * 100)
    expect(result['o2']).toBe(200 * 100)
    expect(result['o3']).toBe(200 * 100)
    expect(result['o4']).toBe(200 * 100)
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBe(2000 * 100)
  })


  // Test 7: Table recovery remaining ₹500, Game net rake ₹2,000 -> ₹500 table, ₹1,500 distributable
  it('Test 7: Table recovery threshold crossing', () => {
    const alloc = allocateRakeToBuckets(
      2000 * 100, // available net rake
      64500 * 100, // accumulated table (target 65,000 -> remaining 500)
      65000 * 100, // table target
      30000 * 100, // festival already completed
      30000 * 100 // festival target
    )
    expect(alloc.allocatedToTablePaise).toBe(500 * 100)
    expect(alloc.allocatedToFestivalPaise).toBe(0)
    expect(alloc.distributableRakePaise).toBe(1500 * 100)

    // Then apply ₹1,000 rule to ₹1,500
    const dist = calculateOwnerDistribution({
      distributableRakePaise: alloc.distributableRakePaise,
      owners: defaultOwners,
    })
    const sum = Object.values(dist.ownerDistributions).reduce((a, b) => a + b, 0)
    expect(sum).toBe(1500 * 100)
  })

  // Test 8: Festival remaining ₹700, Game net rake ₹2,000 -> ₹700 festival, ₹1,300 distributable
  it('Test 8: Festival reserve threshold crossing', () => {
    const alloc = allocateRakeToBuckets(
      2000 * 100,
      65000 * 100, // table complete
      65000 * 100,
      29300 * 100, // festival accumulated (remaining 700)
      30000 * 100
    )
    expect(alloc.allocatedToTablePaise).toBe(0)
    expect(alloc.allocatedToFestivalPaise).toBe(700 * 100)
    expect(alloc.distributableRakePaise).toBe(1300 * 100)
  })

  // Test 9: Both table and festival thresholds crossed by one game
  // Table remaining = ₹500, Festival remaining = ₹700, Game = ₹3,000 -> ₹500 table, ₹700 festival, ₹1,800 distributable
  it('Test 9: Both table and festival crossed by one game', () => {
    const alloc = allocateRakeToBuckets(
      3000 * 100,
      64500 * 100, // 500 remaining
      65000 * 100,
      29300 * 100, // 700 remaining
      30000 * 100
    )
    expect(alloc.allocatedToTablePaise).toBe(500 * 100)
    expect(alloc.allocatedToFestivalPaise).toBe(700 * 100)
    expect(alloc.distributableRakePaise).toBe(1800 * 100)
  })

  // Test 10: Game expense: Gross = ₹5,000, Expense = ₹500 -> Net = ₹4,500
  it('Test 10: Game expense deducted from gross rake', () => {
    const net = calculateGameNetRake(5000 * 100, [
      { amountPaise: 500 * 100, description: 'Electricity' },
    ])
    expect(net.netRakePaise).toBe(4500 * 100)
    expect(net.totalExpensePaise).toBe(500 * 100)
    expect(net.uncoveredExpensePaise).toBe(0)
  })

  // Test 11: Player payment: Rake = ₹5,500, Payment = ₹3,000 -> Outstanding = ₹2,500
  it('Test 11: Player outstanding calculation with single payment', () => {
    const outstanding = calculatePlayerOutstanding(5500 * 100, 3000 * 100)
    expect(outstanding).toBe(2500 * 100)
  })

  // Test 12: Multiple payments: Rake = ₹5,500, Payment 1 = ₹3,000, Payment 2 = ₹1,000 -> Outstanding = ₹1,500
  it('Test 12: Player outstanding calculation with multiple payments', () => {
    const totalPayments = 3000 * 100 + 1000 * 100
    const outstanding = calculatePlayerOutstanding(5500 * 100, totalPayments)
    expect(outstanding).toBe(1500 * 100)
  })

  // Test 13: Voided game does not affect totals
  it('Test 13: Voided games are excluded from accounting calculations', () => {
    const games: GameRecord[] = [
      {
        id: 'g1',
        gameNumber: 1,
        playedAt: '2026-09-20T10:00:00Z',
        grossRakePaise: 5000 * 100,
        expenses: [],
        owners: defaultOwners,
        status: 'active',
      },
      {
        id: 'g2',
        gameNumber: 2,
        playedAt: '2026-09-21T10:00:00Z',
        grossRakePaise: 10000 * 100,
        expenses: [],
        owners: defaultOwners,
        status: 'voided',
        voidReason: 'Duplicate entry',
      },
    ]

    const summary = calculateLedgerSummary({
      owners: mockOwnerDefs,
      games,
      historicalRake: [],
      payments: [],
      expenses: [],
      settlements: [],
    })

    expect(summary.totalRakeGeneratedPaise).toBe(5000 * 100)
    expect(summary.gameResults.length).toBe(1)
  })

  // Test 14: Historical rake contributes to total/recovery but does not create fabricated owner distribution
  it('Test 14: Historical rake contributes to recovery but creates zero owner distribution', () => {
    const summary = calculateLedgerSummary({
      owners: mockOwnerDefs,
      games: [],
      historicalRake: [
        {
          id: 'h1',
          playerId: 'p1',
          amountPaise: 52650 * 100,
          entryDate: '2026-09-01T00:00:00Z',
          status: 'active',
        },
      ],
      payments: [],
      expenses: [],
      settlements: [],
    })

    expect(summary.totalRakeGeneratedPaise).toBe(52650 * 100)
    expect(summary.tableRecoveryAccumulatedPaise).toBe(52650 * 100)
    expect(summary.tableRecoveryRemainingPaise).toBe((65000 - 52650) * 100) // 12,350
    expect(summary.totalDistributableRakePaise).toBe(0)
    expect(summary.totalOwnerEntitlementPaise).toBe(0)
  })

  // Test 15: Multiple games calculate distributions independently
  it('Test 15: Multiple games calculate distributions independently (not lumped)', () => {
    // Two games of ₹2,000 each with 2 present, 2 absent
    // In each ₹2,000 game: first ₹1,000 split equally (₹250 each), next ₹1,000 split (absent ₹100 each, present ₹400 each)
    // Per game: present get ₹650 each, absent get ₹350 each.
    // If lumped as ₹4,000: first ₹1,000 split (₹250 each), excess ₹3,000 split (absent ₹300 each, present ₹1,200 each) -> present get ₹1,450, absent get ₹550.
    // Over two games, present should get 2 * ₹650 = ₹1,300 and absent get 2 * ₹350 = ₹700, which proves independence!
    const attendance: OwnerAttendance[] = [
      { ownerId: 'o1', present: true },
      { ownerId: 'o2', present: true },
      { ownerId: 'o3', present: false },
      { ownerId: 'o4', present: false },
    ]

    const dist1 = calculateOwnerDistribution({
      distributableRakePaise: 2000 * 100,
      owners: attendance,
    })
    const dist2 = calculateOwnerDistribution({
      distributableRakePaise: 2000 * 100,
      owners: attendance,
    })

    expect(dist1.ownerDistributions['o1']).toBe(650 * 100)
    expect(dist1.ownerDistributions['o3']).toBe(350 * 100)

    expect(dist1.ownerDistributions['o1'] + dist2.ownerDistributions['o1']).toBe(1300 * 100)
    expect(dist1.ownerDistributions['o3'] + dist2.ownerDistributions['o3']).toBe(700 * 100)
  })

  // Test 16: Owner entitlement reconciliation: sum(all owner distributions) === sum(all distributable game rake)
  it('Test 16: Exact integer paise reconciliation across all games and owners', () => {
    const games: GameRecord[] = [
      {
        id: 'g1',
        gameNumber: 1,
        playedAt: '2026-09-22T00:00:00Z',
        grossRakePaise: 100000 * 100, // completes table & festival and distributes
        expenses: [{ amountPaise: 1000 * 100, description: 'Power' }],
        owners: [
          { ownerId: 'o1', present: true },
          { ownerId: 'o2', present: true },
          { ownerId: 'o3', present: false },
          { ownerId: 'o4', present: true },
        ],
        status: 'active',
      },
      {
        id: 'g2',
        gameNumber: 2,
        playedAt: '2026-09-23T00:00:00Z',
        grossRakePaise: 333333, // odd paise amount to test integer preservation
        expenses: [],
        owners: [
          { ownerId: 'o1', present: true },
          { ownerId: 'o2', present: false },
          { ownerId: 'o3', present: false },
          { ownerId: 'o4', present: false },
        ],
        status: 'active',
      },
    ]

    const summary = calculateLedgerSummary({
      owners: mockOwnerDefs,
      games,
      historicalRake: [],
      payments: [],
      expenses: [],
      settlements: [],
    })

    expect(summary.reconciled).toBe(true)
    expect(summary.reconciliationDiffPaise).toBe(0)
    expect(summary.totalOwnerEntitlementPaise).toBe(summary.totalDistributableRakePaise)
  })

  // Test 17: At least one owner must be present (Prevent saving with 0 owners present)
  it('Test 17: Throws error when zero owners are present', () => {
    const zeroPresentOwners: OwnerAttendance[] = [
      { ownerId: 'o1', present: false },
      { ownerId: 'o2', present: false },
      { ownerId: 'o3', present: false },
      { ownerId: 'o4', present: false },
    ]

    expect(() => validateOwnerAttendance(zeroPresentOwners)).toThrow(
      'At least one owner must be present to save a game.'
    )

    expect(() =>
      calculateOwnerDistribution({
        distributableRakePaise: 1000 * 100,
        owners: zeroPresentOwners,
      })
    ).toThrow('At least one owner must be present')
  })

  // Section 15 distribution example exact test:
  // Net distributable rake = ₹4,000. Present: Owner 1, Owner 2. Absent: Owner 3, Owner 4.
  // First ₹1,000: ₹250 each.
  // Remaining ₹3,000: Absent get 10% = ₹300 each. Remaining = ₹2,400. Present get ₹1,200 each.
  // Final: Owner 1 = ₹1,450, Owner 2 = ₹1,450, Owner 3 = ₹550, Owner 4 = ₹550.
  it('Section 15 Specification Example matches exactly', () => {
    const owners: OwnerAttendance[] = [
      { ownerId: 'o1', present: true },
      { ownerId: 'o2', present: true },
      { ownerId: 'o3', present: false },
      { ownerId: 'o4', present: false },
    ]
    const result = calculateOwnerDistribution({
      distributableRakePaise: 4000 * 100,
      owners,
    })
    expect(result.ownerDistributions['o1']).toBe(1450 * 100)
    expect(result.ownerDistributions['o2']).toBe(1450 * 100)
    expect(result.ownerDistributions['o3']).toBe(550 * 100)
    expect(result.ownerDistributions['o4']).toBe(550 * 100)
  })

  // Test 18: Exact Initial Seed State Verification (16 players, ₹52,650)
  it('Test 18: Initial Seed State (₹52,650) matches Section 39 expected state', () => {
    const historicalSeeds = [
      { id: '1', playerId: 'p1', amountPaise: 12200 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '2', playerId: 'p2', amountPaise: 5450 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '3', playerId: 'p3', amountPaise: 1000 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '4', playerId: 'p4', amountPaise: 5700 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '5', playerId: 'p5', amountPaise: 2400 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '6', playerId: 'p6', amountPaise: 2000 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '7', playerId: 'p7', amountPaise: 1200 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '8', playerId: 'p8', amountPaise: 2400 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '9', playerId: 'p9', amountPaise: 2000 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '10', playerId: 'p10', amountPaise: 1500 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '11', playerId: 'p11', amountPaise: 3000 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '12', playerId: 'p12', amountPaise: 4600 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '13', playerId: 'p13', amountPaise: 4200 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '14', playerId: 'p14', amountPaise: 700 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '15', playerId: 'p15', amountPaise: 3700 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
      { id: '16', playerId: 'p16', amountPaise: 600 * 100, entryDate: '2026-09-01T00:00:00Z', status: 'active' as const },
    ]

    const summary = calculateLedgerSummary({
      owners: mockOwnerDefs,
      games: [],
      historicalRake: historicalSeeds,
      payments: [],
      expenses: [],
      settlements: [],
    })

    // Total rake generated = ₹52,650
    expect(summary.totalRakeGeneratedPaise).toBe(52650 * 100)
    // Table target = ₹65,000
    expect(summary.tableRecoveryTargetPaise).toBe(65000 * 100)
    // Table recovery accumulated = ₹52,650
    expect(summary.tableRecoveryAccumulatedPaise).toBe(52650 * 100)
    // Table recovery remaining = ₹12,350
    expect(summary.tableRecoveryRemainingPaise).toBe(12350 * 100)
    // Festival target = ₹30,000, accumulated = ₹0
    expect(summary.festivalFundAccumulatedPaise).toBe(0)
    expect(summary.festivalFundRemainingPaise).toBe(30000 * 100)
    // Distributable owner profit = ₹0
    expect(summary.totalDistributableRakePaise).toBe(0)
    expect(summary.totalOwnerEntitlementPaise).toBe(0)
  })

  // Test 19: Uncovered expense handling when expense > gross rake
  it('Test 19: Handles session expense exceeding gross rake gracefully', () => {
    const net = calculateGameNetRake(2000 * 100, [
      { amountPaise: 2500 * 100, description: 'Repairs' },
    ])
    expect(net.netRakePaise).toBe(0)
    expect(net.totalExpensePaise).toBe(2500 * 100)
    expect(net.uncoveredExpensePaise).toBe(500 * 100)
  })

  // Test 20: Owner settlements track settled vs remaining entitlement
  it('Test 20: Owner settlements properly reduce remaining entitlement', () => {
    const games: GameRecord[] = [
      {
        id: 'g1',
        gameNumber: 1,
        playedAt: '2026-09-25T10:00:00Z',
        grossRakePaise: 100000 * 100, // completes targets and distributes
        expenses: [],
        owners: defaultOwners,
        status: 'active',
      },
    ]

    const settlements = [
      {
        id: 's1',
        ownerId: 'o1',
        amountPaise: 500 * 100,
        settledAt: '2026-09-26T10:00:00Z',
        status: 'active' as const,
      },
    ]

    const summary = calculateLedgerSummary({
      owners: mockOwnerDefs,
      games,
      historicalRake: [],
      payments: [],
      expenses: [],
      settlements,
    })

    const o1 = summary.ownerEntitlements['o1']
    expect(o1.settledPaise).toBe(500 * 100)
    expect(o1.remainingEntitlementPaise).toBe(o1.grossEntitlementPaise - 500 * 100)
    expect(summary.totalOwnerSettledPaise).toBe(500 * 100)
  })

  // Test 21: Custom game allocation directly routes funds to selected buckets
  it('Test 21: Custom game allocation allocates exact specified amounts to buckets', () => {
    const games: GameRecord[] = [
      {
        id: 'g-custom-1',
        gameNumber: 1,
        playedAt: '2026-09-25T10:00:00Z',
        grossRakePaise: 10000 * 100, // ₹10,000
        expenses: [],
        owners: defaultOwners,
        status: 'active',
        customAllocation: {
          tableRecoveryPaise: 2000 * 100, // ₹2,000 to table
          festivalFundPaise: 3000 * 100,  // ₹3,000 to festival
          distributableProfitPaise: 5000 * 100, // ₹5,000 directly to profit
        },
      },
    ]

    const summary = calculateLedgerSummary({
      owners: mockOwnerDefs,
      games,
      historicalRake: [],
      payments: [],
      expenses: [],
      settlements: [],
    })

    expect(summary.tableRecoveryAccumulatedPaise).toBe(2000 * 100)
    expect(summary.festivalFundAccumulatedPaise).toBe(3000 * 100)
    expect(summary.totalDistributableRakePaise).toBe(5000 * 100)
    expect(summary.reconciled).toBe(true)
  })

  // Test 22: Bucket transfer reallocates from Table Recovery to Owner Profit
  it('Test 22: Bucket transfer moves funds from table recovery to owner profit equally', () => {
    const historicalRake = [
      {
        id: 'h1',
        playerId: 'p1',
        amountPaise: 50000 * 100, // ₹50,000 into table recovery
        entryDate: '2026-09-01T00:00:00Z',
        status: 'active' as const,
      },
    ]

    const bucketTransfers = [
      {
        id: 'bt-1',
        transferredAt: '2026-09-02T00:00:00Z',
        fromBucket: 'table_recovery' as const,
        toBucket: 'owner_profit' as const,
        amountPaise: 10000 * 100, // Move ₹10,000 from table to profit
        status: 'active' as const,
      },
    ]

    const summary = calculateLedgerSummary({
      owners: mockOwnerDefs,
      games: [],
      historicalRake,
      payments: [],
      expenses: [],
      settlements: [],
      bucketTransfers,
    })

    // Table recovery should now be ₹40,000 (₹50k - ₹10k)
    expect(summary.tableRecoveryAccumulatedPaise).toBe(40000 * 100)
    // Distributable profit should be ₹10,000
    expect(summary.totalDistributableRakePaise).toBe(10000 * 100)
    // Each of the 4 owners receives ₹2,500
    expect(summary.ownerEntitlements['o1'].grossEntitlementPaise).toBe(2500 * 100)
    expect(summary.ownerEntitlements['o2'].grossEntitlementPaise).toBe(2500 * 100)
    expect(summary.ownerEntitlements['o3'].grossEntitlementPaise).toBe(2500 * 100)
    expect(summary.ownerEntitlements['o4'].grossEntitlementPaise).toBe(2500 * 100)
    expect(summary.reconciled).toBe(true)
  })
})


