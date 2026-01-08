import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SupermarketSector } from '../types'
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon } from './Icons'

interface SectorManagerProps {
  onClose: () => void
  onSectorsChanged?: () => void
}

export default function SectorManager({ onClose, onSectorsChanged }: SectorManagerProps) {
  const [sectors, setSectors] = useState<SupermarketSector[]>([])
  const [loading, setLoading] = useState(true)
  const [newSectorName, setNewSectorName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)

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
      setHasChanges(true)
      fetchSectors()
    } else {
      alert('Failed to add sector')
    }
    setSaving(false)
  }

  const handleUpdateSector = async (id: string) => {
    if (!editingName.trim()) return

    const sector = sectors.find(s => s.id === id)
    if (!sector) return

    const oldName = sector.name
    const newName = editingName.trim()

    if (oldName === newName) {
      setEditingId(null)
      setEditingName('')
      return
    }

    setSaving(true)
    
    // Update the sector name - since we use sector_id foreign key references,
    // all ingredients, staples, and shopping list items will automatically
    // show the new name via their joins
    const { error: sectorError } = await supabase
      .from('supermarket_sectors')
      .update({ name: newName })
      .eq('id', id)

    if (sectorError) {
      alert('Failed to update sector: ' + sectorError.message)
      setSaving(false)
      return
    }

    setEditingId(null)
    setEditingName('')
    setHasChanges(true)
    fetchSectors()
    setSaving(false)
  }

  const handleDeleteSector = async (id: string) => {
    if (!confirm('Are you sure? This will affect items using this sector.')) return

    const { error } = await supabase
      .from('supermarket_sectors')
      .delete()
      .eq('id', id)

    if (!error) {
      setHasChanges(true)
      fetchSectors()
    } else {
      alert('Failed to delete sector')
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnd = () => {
    setDraggingId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      return
    }

    const dragIndex = sectors.findIndex(s => s.id === draggingId)
    const targetIndex = sectors.findIndex(s => s.id === targetId)

    if (dragIndex === -1 || targetIndex === -1) return

    // Reorder sectors array
    const newSectors = [...sectors]
    const [removed] = newSectors.splice(dragIndex, 1)
    newSectors.splice(targetIndex, 0, removed)

    // Update display_order for all sectors
    setSaving(true)
    const updates = newSectors.map((sector, index) => ({
      id: sector.id,
      display_order: index + 1,
      grid_row: Math.floor(index / 3) + 1,
      grid_column: (index % 3) + 1
    }))

    // Update all sectors in database
    for (const update of updates) {
      await supabase
        .from('supermarket_sectors')
        .update({
          display_order: update.display_order,
          grid_row: update.grid_row,
          grid_column: update.grid_column
        })
        .eq('id', update.id)
    }

    setHasChanges(true)
    setSaving(false)
    setDraggingId(null)
    fetchSectors()
  }

  const handleClose = () => {
    if (hasChanges && onSectorsChanged) {
      onSectorsChanged()
    }
    onClose()
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
            onClick={handleClose}
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
                  draggable={editingId !== sector.id}
                  onDragStart={(e) => handleDragStart(e, sector.id)}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, sector.id)}
                  className={`flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 transition ${
                    draggingId === sector.id ? 'opacity-50' : ''
                  } ${
                    editingId !== sector.id ? 'cursor-move hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                  }`}
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
                    <div className="flex items-center space-x-2 flex-1">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                      <span className="text-gray-900 dark:text-white">{sector.name}</span>
                    </div>
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
            onClick={handleClose}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
