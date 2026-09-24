import { Owner, AccountingSettings, DEFAULT_ACCOUNTING_SETTINGS } from '../accounting/types'

export interface SeedPlayer {
  id: string
  name: string
  historicalRakePaise: number
}

export const INITIAL_OWNERS: Owner[] = [
  { id: 'owner-1', name: 'Owner 1', isActive: true },
  { id: 'owner-2', name: 'Owner 2', isActive: true },
  { id: 'owner-3', name: 'Owner 3', isActive: true },
  { id: 'owner-4', name: 'Owner 4', isActive: true },
]

export const INITIAL_SEED_PLAYERS: SeedPlayer[] = [
  { id: 'player-1', name: 'Anmol', historicalRakePaise: 12200 * 100 },
  { id: 'player-2', name: 'Om', historicalRakePaise: 5450 * 100 },
  { id: 'player-3', name: 'Rohra', historicalRakePaise: 1000 * 100 },
  { id: 'player-4', name: 'Kateja', historicalRakePaise: 5700 * 100 },
  { id: 'player-5', name: 'Brahma', historicalRakePaise: 2400 * 100 },
  { id: 'player-6', name: 'Yuvi', historicalRakePaise: 2000 * 100 },
  { id: 'player-7', name: 'Mayur', historicalRakePaise: 1200 * 100 },
  { id: 'player-8', name: 'Bhatia', historicalRakePaise: 2400 * 100 },
  { id: 'player-9', name: 'Sagar C', historicalRakePaise: 2000 * 100 },
  { id: 'player-10', name: 'Sachin', historicalRakePaise: 1500 * 100 },
  { id: 'player-11', name: 'Chellani', historicalRakePaise: 3000 * 100 },
  { id: 'player-12', name: 'SB', historicalRakePaise: 4600 * 100 },
  { id: 'player-13', name: 'Paras', historicalRakePaise: 4200 * 100 },
  { id: 'player-14', name: 'Pratish', historicalRakePaise: 700 * 100 },
  { id: 'player-15', name: 'Piyush', historicalRakePaise: 3700 * 100 },
  { id: 'player-16', name: 'Tanna', historicalRakePaise: 600 * 100 },
]

export const TOTAL_HISTORICAL_SEED_PAISE = INITIAL_SEED_PLAYERS.reduce(
  (sum, p) => sum + p.historicalRakePaise,
  0
) // Exactly 52,650 * 100 = 5,265,000 paise (₹52,650)
