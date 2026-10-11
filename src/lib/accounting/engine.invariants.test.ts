import { describe, it, expect } from 'vitest'
import { calculateLedgerSummary } from './engine'
import {
  GameRecord,
  HistoricalRakeEntry,
  PlayerPayment,
  GeneralExpense,
  OwnerSettlement,
  BucketTransfer,
  Owner,
  DEFAULT_ACCOUNTING_SETTINGS,
} from './types'

const owners: Owner[] = [
  { id: 'o1', name: 'A', isActive: true },
  { id: 'o2', name: 'B', isActive: true },
  { id: 'o3', name: 'C', isActive: true },
  { id: 'o4', name: 'D', isActive: true },
]

// Deterministic PRNG so the fuzz run is reproducible.
function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('engine invariants (fuzz)', () => {
  it('holds reconciliation, entitlement identity, and integer safety across random ledgers', () => {
    const failures: string[] = []
    for (let seed = 0; seed < 3000; seed++) {
      const rand = mulberry32(seed + 1)
      const ri = (max: number) => Math.floor(rand() * max)

      const games: GameRecord[] = []
      for (let g = 0; g < ri(6); g++) {
        const att = owners.map((o) => ({ ownerId: o.id, present: rand() > 0.4 }))
        if (!att.some((a) => a.present)) att[0].present = true
        games.push({
          id: `g${g}`,
          gameNumber: g + 1,
          playedAt: new Date(2026, 8, 1 + g).toISOString(),
          grossRakePaise: ri(500000),
          expenses: rand() > 0.6 ? [{ amountPaise: ri(50000), description: 'x' }] : [],
          owners: att,
          status: 'active',
        })
      }

      const historicalRake: HistoricalRakeEntry[] = []
      for (let h = 0; h < ri(4); h++) {
        historicalRake.push({
          id: `h${h}`,
          playerId: `p${h}`,
          amountPaise: rand() > 0.8 ? -ri(20000) : ri(200000),
          entryDate: new Date(2026, 8, 1 + h).toISOString(),
          status: 'active',
        })
      }

      const expenses: GeneralExpense[] = []
      for (let e = 0; e < ri(4); e++) {
        expenses.push({
          id: `e${e}`,
          type: rand() > 0.7 ? 'credit_adjustment' : 'monthly_expense',
          amountPaise: ri(80000),
          description: 'exp',
          expenseDate: new Date(2026, 8, 2 + e).toISOString(),
          status: 'active',
        })
      }

      const payments: PlayerPayment[] = []
      for (let p = 0; p < ri(5); p++) {
        payments.push({
          id: `pay${p}`,
          playerId: `p${p}`,
          amountPaise: ri(150000),
          paidAt: new Date(2026, 8, 2 + p).toISOString(),
          status: 'active',
          receivedByOwnerId: rand() > 0.3 ? owners[ri(4)].id : undefined,
        })
      }

      const settlements: OwnerSettlement[] = []
      for (let s = 0; s < ri(3); s++) {
        settlements.push({
          id: `set${s}`,
          ownerId: owners[ri(4)].id,
          amountPaise: ri(50000),
          settledAt: new Date(2026, 8, 3 + s).toISOString(),
          status: 'active',
          paidByOwnerId: rand() > 0.5 ? owners[ri(4)].id : undefined,
        })
      }

      const transfers: BucketTransfer[] = []
      for (let t = 0; t < ri(2); t++) {
        transfers.push({
          id: `tr${t}`,
          transferredAt: new Date(2026, 8, 4 + t).toISOString(),
          fromBucket: rand() > 0.5 ? 'table_recovery' : 'festival_fund',
          toBucket: (['table_recovery', 'festival_fund', 'owner_profit'] as const)[ri(3)],
          amountPaise: ri(30000),
          status: 'active',
        })
      }

      const summary = calculateLedgerSummary({
        owners,
        games,
        historicalRake,
        payments,
        expenses,
        settlements,
        bucketTransfers: transfers,
        settings: DEFAULT_ACCOUNTING_SETTINGS,
      })

      if (!summary.reconciled) {
        failures.push(`seed=${seed} RECON diff=${summary.reconciliationDiffPaise}`)
      }
      for (const gr of summary.gameResults) {
        const distSum = Object.values(gr.ownerDistributions).reduce((s, v) => s + v, 0)
        if (distSum !== gr.distributableRakePaise) {
          failures.push(`seed=${seed} game=${gr.gameNumber} distSum≠distributable`)
        }
      }
      const ents = Object.values(summary.ownerEntitlements)
      const cashSum = ents.reduce((s, e) => s + e.cashEntitlementPaise, 0)
      if (cashSum !== (summary.totalOwnerCashEntitlementPaise || 0)) {
        failures.push(`seed=${seed} cashSum≠total`)
      }
      for (const e of ents) {
        // Core dashboard identity: Table Share + Profit Share == Total Earned.
        if (e.tableRecoverySharePaise + e.equalSharePaise + e.excessSharePaise !== e.grossEntitlementPaise) {
          failures.push(
            `seed=${seed} IDENTITY owner=${e.ownerId} table=${e.tableRecoverySharePaise} eq=${e.equalSharePaise} ex=${e.excessSharePaise} gross=${e.grossEntitlementPaise}`
          )
        }
        for (const [k, v] of Object.entries(e)) {
          if (typeof v === 'number' && !Number.isFinite(v)) failures.push(`seed=${seed} NAN ${e.ownerId}.${k}`)
          if (typeof v === 'number' && k.endsWith('Paise') && !Number.isInteger(v))
            failures.push(`seed=${seed} NONINT ${e.ownerId}.${k}=${v}`)
        }
      }
      for (const rt of summary.recommendedTransfers) {
        if (rt.amountPaise < 0) failures.push(`seed=${seed} NEG transfer`)
      }
    }
    if (failures.length) {
      console.log('FAILURES (first 20):\n' + failures.slice(0, 20).join('\n'))
      console.log(`total failures: ${failures.length}`)
    }
    expect(failures).toEqual([])
  })
})
