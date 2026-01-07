import { useState, useEffect } from 'react'
import { Staple, SupermarketSector } from '../types'
import { supabase } from '../lib/supabase'

interface StapleEditModalProps {
  staple: Staple | null
  isCreating: boolean
  onClose: () => void
}

export default function StapleEditModal({ staple, isCreating, onClose }: StapleEditModalProps) {
  const [name, setName] = useState(staple?.name || '')
  const [sector, setSector] = useState(staple?.sector || '')
  const [sectors, setSectors] = useState<SupermarketSector[]>([])
  const [isDefault, setIsDefault] = useState(staple?.is_default || false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSectors()
  }, [])

  const fetchSectors = async () => {
    console.log('StapleEditModal: fetching sectors...')
    const { data, error } = await supabase
      .from('supermarket_sectors')
      .select('*')
      .order('display_order')

    console.log('StapleEditModal: sectors fetched:', data, error)
    if (!error && data) {
      setSectors(data)
      // Set default sector if not already set
      if (!sector && data.length > 0) {
        setSector(data[0].name)
      }
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a staple name')
      return
    }

    setSaving(true)

    try {
      if (isCreating) {
        const { error } = await supabase
          .from('staples')
          .insert({
            name: name.trim(),
            sector,
            is_default: isDefault
          })

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('staples')
          .update({
            name: name.trim(),
            sector,
            is_default: isDefault
          })
          .eq('id', staple!.id)

        if (error) throw error
      }

      onClose()
    } catch (error) {
      console.error('Error saving staple:', error)
      alert('Failed to save staple')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full animate-slide-down">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isCreating ? 'Add Staple' : 'Edit Staple'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Staple Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="e.g., Milk, Bread, Eggs"
              autoFocus
            />
          </div>

          {/* Sector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sector *
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {sectors.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Default Checkbox */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="is_default"
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 dark:bg-gray-700"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="is_default" className="font-medium text-gray-700 dark:text-gray-300">
                Mark as default
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Default items will be automatically selected when creating a shopping list
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Staple'}
          </button>
        </div>
      </div>
    </div>
  )
}
