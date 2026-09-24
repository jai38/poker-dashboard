import React, { useState } from 'react'
import { Modal } from './Modal'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  requireReason?: boolean
  reasonPlaceholder?: string
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  requireReason = false,
  reasonPlaceholder = 'Please enter reason...',
}) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is strictly required.')
      return
    }
    onConfirm(reason.trim())
    setReason('')
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              isDestructive
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-amber-500/10 text-amber-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
        </div>

        {requireReason && (
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-medium text-slate-300">
              Reason <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError('')
              }}
              placeholder={reasonPlaceholder}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors shadow-sm ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
