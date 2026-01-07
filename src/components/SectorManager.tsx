import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SupermarketSector } from '../types'
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon } from './Icons'

interface SectorManagerProps {
  onClose: () => void
}

export default function SectorManager({ onClose }: SectorManagerProps) {
  const [sectors, setSectors] = useState<SupermarketSector[]>([])
  const [loading, setLoading] = useState(true)
  const [newSectorName, setNewSectorName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSectors()
  }, [])

  const fetchSectors = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('supermarket_sectors')
      .select('*')
      .order('display_order')

    if (!error && data) {
      setSectors(data)
    }
    setLoading(false)
  }

  const handleAddSector = async () => {
    if (!newSectorName.trim()) return

    setSaving(true)
    const maxOrder = sectors.reduce((max, s) => Math.max(max, s.display_order), 0)
    
    const { error } = await supabase
      .from('supermarket_sectors')
      .insert({
        name: newSectorName.trim(),
        display_order: maxOrder + 1,
        grid_row: Math.floor(sectors.length / 3) + 1,
        grid_column: (sectors.length % 3) + 1
      })

    if (!error) {
      setNewSectorName('')
      fetchSectors()
    } else {
      alert('Failed to add sector')
    }
    setSaving(false)
  }

  const handleUpdateSector = async (id: string) => {
    if (!editingName.trim()) return

    setSaving(true)
    const { error } = await supabase
      .from('supermarket_sectors')
      .update({ name: editingName.trim() })
      .eq('id', id)

    if (!error) {
      setEditingId(null)
      setEditingName('')
      fetchSectors()
    } else {
      alert('Failed to update sector')
    }
    setSaving(false)
  }

  const handleDeleteSector = async (id: string) => {
    if (!confirm('Are you sure? This will affect items using this sector.')) return

    const { error } = await supabase
      .from('supermarket_sectors')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchSectors()
    } else {
      alert('Failed to delete sector')
    }
  }

  const startEditing = (sector: SupermarketSector) => {
    setEditingId(sector.id)
    setEditingName(sector.name)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Manage Sectors
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {sectors.map((sector) => (
                <div
                  key={sector.id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3"
                >
                  {editingId === sector.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 mr-3 px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded focus:ring-2 focus:ring-primary-500"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateSector(sector.id)}
                    />
                  ) : (
                    <span className="text-gray-900 dark:text-white">{sector.name}</span>
                  )}
                  
                  <div className="flex space-x-1">
                    {editingId === sector.id ? (
                      <button
                        onClick={() => handleUpdateSector(sector.id)}
                        disabled={saving}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition"
                        title="Save"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => startEditing(sector)}
                        className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded transition"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteSector(sector.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new sector */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add New Sector
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
                placeholder="e.g., Health & Beauty"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSector()}
              />
              <button
                onClick={handleAddSector}
                disabled={saving || !newSectorName.trim()}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
