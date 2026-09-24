import React, { useState } from 'react'
import { LedgerProvider, useLedger } from './lib/store/ledgerStore'
import { Navbar, NavTab } from './components/layout/Navbar'
import { DashboardOverview } from './components/dashboard/DashboardOverview'
import { GameList } from './components/games/GameList'
import { PlayerList } from './components/players/PlayerList'
import { ExpenseList } from './components/expenses/ExpenseList'
import { OwnerSettlementView } from './components/settlements/OwnerSettlementView'
import { AuditLogView } from './components/audit/AuditLogView'
import { SettingsView } from './components/settings/SettingsView'
import { ReportsView } from './components/reports/ReportsView'
import { AddGameModal } from './components/games/AddGameModal'
import { QuickHistoricalRakeModal } from './components/players/QuickHistoricalRakeModal'
import { AuthModal } from './components/auth/AuthModal'
import { ShieldCheck, Database, LogIn } from 'lucide-react'

const LedgerAppContent: React.FC = () => {
  const { isOnlineMode, isAuthenticated, userEmail } = useLedger()

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')
  const [isAddGameOpen, setIsAddGameOpen] = useState(false)
  const [isQuickRakeOpen, setIsQuickRakeOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddGame={() => setIsAddGameOpen(true)}
        onOpenQuickRake={() => setIsQuickRakeOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            onNavigateToGames={() => setActiveTab('games')}
            onNavigateToPlayers={() => setActiveTab('players')}
            onNavigateToSettlements={() => setActiveTab('settlements')}
            onOpenAddGame={() => setIsAddGameOpen(true)}
            onOpenQuickRake={() => setIsQuickRakeOpen(true)}
          />
        )}

        {activeTab === 'games' && <GameList onOpenAddGame={() => setIsAddGameOpen(true)} />}

        {activeTab === 'players' && <PlayerList />}

        {activeTab === 'expenses' && <ExpenseList />}

        {activeTab === 'settlements' && <OwnerSettlementView />}

        {activeTab === 'audit' && <AuditLogView />}

        {activeTab === 'reports' && <ReportsView />}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Poker Rake Ledger</span>
            <span>•</span>
            <span>Deterministic Integer Paise Engine</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Reconciled
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isOnlineMode ? 'Supabase PostgreSQL RLS' : 'Local Deterministic Ledger'}</span>
            </span>

            {!isAuthenticated && (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <LogIn className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isAddGameOpen && (
        <AddGameModal isOpen={isAddGameOpen} onClose={() => setIsAddGameOpen(false)} />
      )}

      {isQuickRakeOpen && (
        <QuickHistoricalRakeModal
          isOpen={isQuickRakeOpen}
          onClose={() => setIsQuickRakeOpen(false)}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      )}
    </div>
  )
}

export function App() {
  return (
    <LedgerProvider>
      <LedgerAppContent />
    </LedgerProvider>
  )
}

export default App
