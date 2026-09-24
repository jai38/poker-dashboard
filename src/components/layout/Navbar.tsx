import React, { useState } from 'react'
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
  Menu,
  X,
  User,
  LogOut,
  Sparkles,
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
  const { isOnlineMode, userEmail, signOut } = useLedger()
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false)

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'games', label: 'Games', icon: <Dices className="w-4 h-4" /> },
    { id: 'players', label: 'Players', icon: <Users className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'settlements', label: 'Settlements', icon: <Scale className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Log', icon: <History className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ]

  // Primary mobile bottom nav tabs
  const mobilePrimaryTabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'games', label: 'Games', icon: <Dices className="w-5 h-5" /> },
    { id: 'players', label: 'Players', icon: <Users className="w-5 h-5" /> },
    { id: 'settlements', label: 'Settle', icon: <Scale className="w-5 h-5" /> },
  ]

  // Secondary items in the "More" drawer
  const moreMenuItems: { id: NavTab; label: string; description: string; icon: React.ReactNode }[] = [
    {
      id: 'expenses',
      label: 'Expenses & Adjustments',
      description: 'Monthly costs, food, equipment, credit adjustments',
      icon: <Receipt className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'reports',
      label: 'Reports & CSV Export',
      description: 'Download reconciliation data, game sheets, and summaries',
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'audit',
      label: 'Immutable Audit Log',
      description: 'Tamper-evident chronological record of all ledger actions',
      icon: <History className="w-5 h-5 text-indigo-400" />,
    },
    {
      id: 'settings',
      label: 'Settings & Cloud DB',
      description: 'Supabase cloud sync, owner partner names, waterfall targets',
      icon: <Settings className="w-5 h-5 text-cyan-400" />,
    },
  ]

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab)
    setIsMobileMoreOpen(false)
  }

  const isMoreTabActive = ['expenses', 'audit', 'reports', 'settings'].includes(activeTab)

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-base sm:text-lg shrink-0">
                ♠
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-slate-100 text-sm sm:text-base tracking-tight truncate">
                    Poker Ledger
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border ${
                      isOnlineMode
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnlineMode ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'
                      }`}
                    />
                    <span className="hidden xs:inline">{isOnlineMode ? 'Cloud Live' : 'Local'}</span>
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden xs:block">
                  4-Owner Table Accounting
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={onOpenQuickRake}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 transition shadow-sm touch-manipulation"
                title="Add Historical or Manual Player Rake"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden xs:inline">Quick</span> Rake
              </button>
              <button
                onClick={onOpenAddGame}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-sm shadow-indigo-600/30 transition touch-manipulation"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Game</span>
              </button>

              {/* Desktop User display */}
              {userEmail && (
                <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800 text-xs text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="max-w-[120px] truncate">{userEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Tab Navigation (Hidden on Mobile) */}
          <nav className="hidden md:flex space-x-1 overflow-x-auto no-scrollbar py-1.5 border-t border-slate-800/60">
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

      {/* Mobile Bottom Navigation Bar (Visible on Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1 safe-area-bottom shadow-2xl">
        <div className="flex items-center justify-around">
          {mobilePrimaryTabs.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all touch-manipulation ${
                  isActive
                    ? 'text-indigo-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-400 rounded-full" />
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            )
          })}

          {/* More Menu Button */}
          <button
            onClick={() => setIsMobileMoreOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all touch-manipulation ${
              isMoreTabActive
                ? 'text-indigo-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Menu className="w-5 h-5" />
              {isMoreTabActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-400 rounded-full" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile Slide-Up "More" Sheet */}
      {isMobileMoreOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMoreOpen(false)}
          />

          {/* Slide-Up Panel */}
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-slate-900 border-t border-slate-800 rounded-t-2xl p-5 shadow-2xl overflow-y-auto safe-area-bottom animate-in slide-in-from-bottom duration-250">
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">All Ledger Sections</h3>
              </div>
              <button
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu List */}
            <div className="mt-4 space-y-2">
              {moreMenuItems.map((item) => {
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center gap-3.5 p-3 rounded-xl text-left transition ${
                      isActive
                        ? 'bg-indigo-600/15 border border-indigo-500/30 text-white'
                        : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 text-slate-200'
                    }`}
                  >
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold flex items-center justify-between">
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-800/40">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* User Session & Sign Out */}
            {userEmail && (
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="truncate">{userEmail}</span>
                </div>
                <button
                  onClick={async () => {
                    await signOut()
                    setIsMobileMoreOpen(false)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-300 text-xs font-semibold text-slate-300 rounded-lg transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
