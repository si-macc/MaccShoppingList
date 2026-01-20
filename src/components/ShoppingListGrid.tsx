import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SupermarketSector } from '../types'
import { SaveIcon, ShareIcon, ArrowLeftIcon, PlusIcon } from './Icons'

interface ShoppingListGridProps {
  shoppingList: any
  onBack: () => void
  onNewList: () => void
}

export default function ShoppingListGrid({ shoppingList, onBack, onNewList }: ShoppingListGridProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [listName, setListName] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [sectors, setSectors] = useState<SupermarketSector[]>([])
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchSectors()
    // Initialize checked items from database state
    initializeCheckedItems()
  }, [])

  // Auto-save every minute
  useEffect(() => {
    if (shoppingList?.id) {
      autoSaveIntervalRef.current = setInterval(() => {
        saveCheckedState()
      }, 60000) // 60 seconds

      return () => {
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current)
        }
      }
    }
  }, [shoppingList?.id, checkedItems])

  const initializeCheckedItems = () => {
    // Initialize from items that have is_checked = true
    const checked = new Set<string>()
    shoppingList.items.forEach((item: any) => {
      if (item.is_checked && item.db_id) {
        checked.add(item.db_id)
      }
    })
    setCheckedItems(checked)
  }

  const saveCheckedState = useCallback(async () => {
    if (!shoppingList?.id) return

    try {
      // Update all items' checked state in database
      const updates = shoppingList.items
        .filter((item: any) => item.db_id)
        .map((item: any) => ({
          id: item.db_id,
          is_checked: checkedItems.has(item.db_id)
        }))

      for (const update of updates) {
        await supabase
          .from('shopping_list_items')
          .update({ is_checked: update.is_checked })
          .eq('id', update.id)
      }
    } catch (error) {
      console.error('Error saving checked state:', error)
    }
  }, [shoppingList?.id, shoppingList?.items, checkedItems])

  const fetchSectors = async () => {
    const { data, error } = await supabase
      .from('supermarket_sectors')
      .select('*')
      .order('display_order')

    if (!error && data) {
      setSectors(data)
    }
  }

  // Build sector layout from database (2 rows, 3 columns based on grid_row/grid_column)
  const getSectorLayout = (): string[][] => {
    if (sectors.length === 0) return []
    
    const layout: string[][] = []
    sectors.forEach(sector => {
      const rowIndex = sector.grid_row - 1
      const colIndex = sector.grid_column - 1
      if (!layout[rowIndex]) layout[rowIndex] = []
      layout[rowIndex][colIndex] = sector.name
    })
    return layout.filter(row => row && row.length > 0)
  }

  const toggleItem = async (dbId: string) => {
    const newSet = new Set(checkedItems)
    const isNowChecked = !newSet.has(dbId)
    
    if (newSet.has(dbId)) {
      newSet.delete(dbId)
    } else {
      newSet.add(dbId)
    }
    setCheckedItems(newSet)

    // Save to database immediately
    if (dbId) {
      try {
        await supabase
          .from('shopping_list_items')
          .update({ is_checked: isNowChecked })
          .eq('id', dbId)
      } catch (error) {
        console.error('Error updating checked state:', error)
      }
    }
  }

  const handleSaveList = async () => {
    if (!listName.trim()) {
      alert('Please enter a name for your shopping list')
      return
    }

    setSaving(true)
    try {
      if (shoppingList?.id) {
        // Update existing list name (Save As / Rename)
        const { error } = await supabase
          .from('shopping_lists')
          .update({ name: listName.trim() })
          .eq('id', shoppingList.id)

        if (error) throw error
        
        alert('Shopping list renamed successfully!')
      } else {
        // Create new shopping list (fallback for unsaved lists)
        const { data: savedList, error: listError } = await supabase
          .from('shopping_lists')
          .insert({
            name: listName.trim(),
            completed_at: null
          })
          .select()
          .single()

        if (listError) throw listError

        // Insert all items
        const itemsToInsert = shoppingList.items.map((item: any) => ({
          shopping_list_id: savedList.id,
          item_name: item.name,
          sector_id: item.sector_id,
          quantity: item.quantity,
          is_checked: false
        }))

        const { error: itemsError } = await supabase
          .from('shopping_list_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError

        alert('Shopping list saved successfully!')
      }
      
      setShowSaveModal(false)
      setListName('')
    } catch (error) {
      console.error('Error saving list:', error)
      alert('Failed to save shopping list')
    } finally {
      setSaving(false)
    }
  }

  const handleShare = (method: 'whatsapp' | 'email') => {
    const listText = generateListText()
    
    if (method === 'whatsapp') {
      const url = `https://wa.me/?text=${encodeURIComponent(listText)}`
      window.open(url, '_blank')
    } else {
      const subject = listName || 'Shopping List'
      const body = listText
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.location.href = mailtoLink
    }
    
    setShowShareModal(false)
  }

  const generateListText = () => {
    let text = `🛒 Shopping List${listName ? ` - ${listName}` : ''}\n\n`
    const sectorLayout = getSectorLayout()
    
    for (const row of sectorLayout) {
      for (const sector of row) {
        if (!sector) continue
        const items = shoppingList.grouped[sector] || []
        if (items.length > 0) {
          text += `📍 ${sector}\n`
          items.forEach((item: any) => {
            text += `  ☐ ${item.name}`
            // Handle consolidated requirements
            if (item.requirements && item.requirements.length > 0) {
              const reqStrs = item.requirements.map((req: any) => {
                const parts = []
                if (req.quantity) parts.push(`${req.quantity}${req.unit || ''}`)
                if (req.source) parts.push(`from ${req.source}`)
                return parts.join(' ')
              }).filter(Boolean)
              if (reqStrs.length > 0) {
                text += `: ${reqStrs.join(', ')}`
              }
            } else if (item.quantity) {
              // Fallback for loaded lists
              text += ` (${item.quantity})`
            }
            text += '\n'
          })
          text += '\n'
        }
      }
    }
    
    return text
  }

  const totalItems = shoppingList.items.length
  const checkedCount = checkedItems.size

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Shopping List</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {checkedCount} of {totalItems} items checked
        </p>
        
        {/* Action Buttons */}
        <div className="flex justify-evenly items-center">
          <button
            onClick={onBack}
            className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg hover:scale-110 transition-transform shadow-md hover:shadow-lg"
            title="Back to selection"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          
          <button
            onClick={() => setShowShareModal(true)}
            className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg hover:scale-110 transition-transform shadow-md hover:shadow-lg"
            title="Share list"
          >
            <ShareIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </button>
          
          <button
            onClick={() => {
              // Pre-fill with current list name for renaming
              setListName(shoppingList?.name || '')
              setShowSaveModal(true)
            }}
            className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg hover:scale-110 transition-transform shadow-md hover:shadow-lg"
            title="Save list"
          >
            <SaveIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </button>
          
          <button
            onClick={onNewList}
            className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg hover:scale-110 transition-transform shadow-md hover:shadow-lg"
            title="Create new list"
          >
            <PlusIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* 2x3 Grid Layout */}
      <div className="space-y-4">
        {getSectorLayout().map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {row.map((sector) => {
              if (!sector) return null
              const items = shoppingList.grouped[sector] || []
              
              return (
                <div key={sector} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Sector Header */}
                  <div className="bg-primary-600 text-white px-4 py-3">
                    <h3 className="font-semibold text-lg">{sector}</h3>
                    <p className="text-xs text-primary-100">{items.length} items</p>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                        No items in this section
                      </div>
                    ) : (
                      items.map((item: any, idx: number) => {
                        const isChecked = item.db_id ? checkedItems.has(item.db_id) : false

                        return (
                          <label
                            key={item.db_id || idx}
                            className={`px-4 py-3 flex items-start space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                              isChecked ? 'bg-gray-50 dark:bg-gray-700/50 opacity-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => item.db_id && toggleItem(item.db_id)}
                              disabled={!item.db_id}
                              className="mt-1 w-5 h-5 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 dark:bg-gray-700"
                            />
                            <div className="flex-1">
                              <div className={`font-medium ${isChecked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                {item.name}
                              </div>
                              {/* Display consolidated requirements list */}
                              {item.requirements && item.requirements.length > 0 && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {item.requirements.map((req: any, reqIdx: number) => (
                                    <div key={reqIdx} className="flex items-center gap-1">
                                      <span className="text-gray-400">•</span>
                                      <span>
                                        {req.quantity && `${req.quantity}${req.unit || ''}`}
                                        {req.quantity && req.source && ' '}
                                        {req.source && <span className="text-xs text-gray-500 dark:text-gray-500">({req.source})</span>}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Fallback for loaded lists that have quantity as string */}
                              {!item.requirements && item.quantity && (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {item.quantity}
                                </div>
                              )}
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Progress: {totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0}% complete
        </div>
        <div className="flex space-x-2">
          <button
            onClick={async () => {
              setCheckedItems(new Set())
              // Update all items in database
              const dbIds = shoppingList.items.filter((item: any) => item.db_id).map((item: any) => item.db_id)
              if (dbIds.length > 0) {
                await supabase
                  .from('shopping_list_items')
                  .update({ is_checked: false })
                  .in('id', dbIds)
              }
            }}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Clear All
          </button>
          <button
            onClick={async () => {
              const dbIds = shoppingList.items.filter((item: any) => item.db_id).map((item: any) => item.db_id)
              setCheckedItems(new Set(dbIds))
              // Update all items in database
              if (dbIds.length > 0) {
                await supabase
                  .from('shopping_list_items')
                  .update({ is_checked: true })
                  .in('id', dbIds)
              }
            }}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Check All
          </button>
        </div>
      </div>

      {/* Save/Rename Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {shoppingList?.id ? 'Rename Shopping List' : 'Save Shopping List'}
            </h3>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter list name (e.g., Weekly Shop)"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4 placeholder-gray-400 dark:placeholder-gray-500"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setListName('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveList}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : (shoppingList?.id ? 'Rename' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Share Shopping List</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleShare('whatsapp')}
                className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition flex items-center justify-center space-x-2"
              >
                <span>💬</span>
                <span>Share via WhatsApp</span>
              </button>
              <button
                onClick={() => handleShare('email')}
                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition flex items-center justify-center space-x-2"
              >
                <span>📧</span>
                <span>Share via Email</span>
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
