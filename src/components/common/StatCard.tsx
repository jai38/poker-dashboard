import React from 'react'

interface StatCardProps {
  title: string
  amount: string
  subtitle?: string
  progress?: {
    current: number
    target: number
    label: string
  }
  badge?: {
    text: string
    variant: 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate' | 'purple'
  }
  icon?: React.ReactNode
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  amount,
  subtitle,
  progress,
  badge,
  icon,
}) => {
  const badgeClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  }[badge?.variant || 'slate']

  const progressPercent = progress
    ? Math.min(100, Math.round((progress.current / progress.target) * 100))
    : 0

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </span>
          {badge && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClasses}`}
            >
              {badge.text}
            </span>
          )}
          {icon && <div className="text-slate-400">{icon}</div>}
        </div>

        <div className="text-2xl font-bold text-slate-100 tracking-tight">{amount}</div>

        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>

      {progress && (
        <div className="mt-4 pt-3 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
            <span>{progress.label}</span>
            <span className="text-slate-200">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
