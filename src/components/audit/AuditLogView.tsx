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

      {/* Audit Log Table (Section 27) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
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
