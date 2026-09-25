import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { useLedger } from '../../lib/store/ledgerStore'
import { Save } from 'lucide-react'

interface EditOwnersModalProps {
  isOpen: boolean
  onClose: () => void
}

export const EditOwnersModal: React.FC<EditOwnersModalProps> = ({ isOpen, onClose }) => {
  const { owners, updateOwners } = useLedger()
  const [names, setNames] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const map: Record<string, string> = {}
      owners.forEach((o) => (map[o.id] = o.name))
      setNames(map)
      setError(null)
    }
  }, [isOpen, owners])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate that no name is empty
    for (const o of owners) {
      const val = (names[o.id] || '').trim()
      if (!val) {
        setError(`Organizer #${o.id.replace('owner-', '')} name cannot be empty.`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload = owners.map((o) => ({
        id: o.id,
        name: names[o.id].trim(),
      }))
      await updateOwners(payload)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update organizer names')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Organizer Names"
      subtitle="Configure the 4 organizers"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {owners.map((owner, idx) => (
            <div key={owner.id} className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Organizer #{idx + 1}</span>
                <span className="text-[10px] text-slate-500 font-mono">ID: {owner.id}</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                  {idx + 1}
                </div>
                <input
                  type="text"
                  value={names[owner.id] || ''}
                  onChange={(e) =>
                    setNames((prev) => ({ ...prev, [owner.id]: e.target.value }))
                  }
                  placeholder={`e.g. Organizer ${idx + 1}`}
                  className="w-full pl-9 pr-3 py-2 text-base sm:text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm transition-colors min-h-[40px]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : 'Save Organizer Names'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
