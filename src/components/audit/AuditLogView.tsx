import React from 'react'
import { useLedger } from '../../lib/store/ledgerStore'
import { formatDateTime } from '../../lib/accounting/formatters'
import { History, ShieldCheck } from 'lucide-react'

export const AuditLogView: React.FC = () => {
  const { auditLog } = useLedger()

  const getActionBadge = (action: string) => {
    if (action.includes('VOIDED')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
          {action}
        </span>
      )
    }
    if (action.includes('CREATED') || action.includes('ADDED') || action.includes('RECORDED')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {action}
        </span>
      )
    }
    if (action.includes('UPDATED') || action.includes('SETTINGS')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          {action}
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
        {action}
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          <span>Audit Log & Financial History</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event log for all games created, voided, payments recorded, settings changed, and owner settlements.
        </p>
      </div>

      {/* Audit Log (Section 27) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Mobile View (sm:hidden) */}
        <div className="block sm:hidden divide-y divide-slate-800/60">
          {auditLog.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No audit events recorded.</div>
          ) : (
            auditLog.map((entry) => (
              <div key={entry.id} className="p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {getActionBadge(entry.action)}
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDateTime(entry.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Target:</span>
                  <span className="font-semibold text-slate-200">{entry.entityType}</span>
                </div>
                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <div className="p-2 bg-slate-950/70 rounded border border-slate-800/60 text-[11px] font-mono text-slate-300 break-words">
                    {JSON.stringify(entry.metadata, null, 1).replace(/[{\n}]/g, '').trim()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Details / Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLog.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-800/30 font-mono">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {formatDateTime(entry.timestamp)}
                  </td>
                  <td className="py-3 px-4 font-sans">{getActionBadge(entry.action)}</td>
                  <td className="py-3 px-4 text-slate-300 font-sans">{entry.entityType}</td>
                  <td className="py-3 px-4 text-slate-300 text-[11px] max-w-md break-words">
                    {entry.metadata ? JSON.stringify(entry.metadata) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
