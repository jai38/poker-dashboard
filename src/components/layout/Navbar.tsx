import React from 'react'
import {
  LayoutDashboard,
  Dices,
  Users,
  Receipt,
  Scale,
  History,
  Settings,
  FileSpreadsheet,
  PlusCircle,
  Database,
  RefreshCw,
  LogOut,
  User,
} from 'lucide-react'
import { useLedger } from '../../lib/store/ledgerStore'

export type NavTab =
  | 'dashboard'
  | 'games'
  | 'players'
  | 'expenses'
  | 'settlements'
  | 'audit'
  | 'settings'
  | 'reports'

interface NavbarProps {
  activeTab: NavTab
  setActiveTab: (tab: NavTab) => void
  onOpenAddGame: () => void
  onOpenQuickRake: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddGame,
  onOpenQuickRake,
}) => {
  const { isOnlineMode, userEmail, signOut, resetToInitialSeed } = useLedger()

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'games', label: 'Games', icon: <Dices className="w-4 h-4" /> },
    { id: 'players', label: 'Players', icon: <Users className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'settlements', label: 'Owner Settlements', icon: <Scale className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Log', icon: <History className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Export', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-lg">
              ♠
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-base tracking-tight">
                  Poker Rake Ledger
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isOnlineMode
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}
                  title={
                    isOnlineMode
                      ? 'Connected to Supabase PostgreSQL'
                      : 'Running in deterministic local ledger mode'
                  }
                >
                  {isOnlineMode ? 'Supabase Live' : 'Deterministic Mode'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">4-Owner Shared Table Accounting</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenQuickRake}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
              title="Add Historical or Manual Player Rake"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quick Rake</span>
            </button>
            <button
              onClick={onOpenAddGame}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/25 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Game</span>
            </button>

            {/* User Indicator / Sign Out */}
            {userEmail && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs text-slate-400">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline max-w-[120px] truncate">{userEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-1.5 border-t border-slate-800/60">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-800 text-indigo-300 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
