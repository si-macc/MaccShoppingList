import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SupermarketSector } from '../types'

interface ShoppingListGridProps {
  shoppingList: any
  onBack: () => void
  onNewList: () => void
}

export default function ShoppingListGrid({ shoppingList, onBack, onNewList }: ShoppingListGridProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [listName, setListName] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [sectors, setSectors] = useState<SupermarketSector[]>([])

  useEffect(() => {
    fetchSectors()
  }, [])

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

  const toggleItem = (index: number) => {
    const newSet = new Set(checkedItems)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setCheckedItems(newSet)
  }

  const handleSaveList = async () => {
    if (!listName.trim()) {
      alert('Please enter a name for your shopping list')
      return
    }

    setSaving(true)
    try {
      // Create shopping list
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
        sector: item.sector,
        quantity: item.quantity,
        is_checked: false
      }))

      const { error: itemsError } = await supabase
        .from('shopping_list_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      alert('Shopping list saved successfully!')
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
            if (item.quantity) {
              text += ` (${item.quantity}${item.unit || ''})`
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
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={onBack}
            className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition group"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Back</span>
          </button>
          
          <button
            onClick={() => setShowShareModal(true)}
            className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition group"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Share</span>
          </button>
          
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-xl transition group"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Save List</span>
          </button>
          
          <button
            onClick={onNewList}
            className="flex flex-col items-center justify-center p-4 bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 rounded-xl transition group relative"
          >
            <span className="absolute top-2 right-2 px-2 py-0.5 bg-primary-500 text-white text-[10px] font-bold rounded-full uppercase">New</span>
            <div className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-white">New List</span>
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
                        const globalIndex = shoppingList.items.indexOf(item)
                        const isChecked = checkedItems.has(globalIndex)

                        return (
                          <label
                            key={idx}
                            className={`px-4 py-3 flex items-start space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                              isChecked ? 'bg-gray-50 dark:bg-gray-700/50 opacity-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleItem(globalIndex)}
                              className="mt-1 w-5 h-5 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 dark:bg-gray-700"
                            />
                            <div className="flex-1">
                              <div className={`font-medium ${isChecked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                {item.name}
                              </div>
                              {item.quantity && (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {item.quantity}{item.unit || ''}
                                </div>
                              )}
                              {item.from_recipe && (
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  from {item.from_recipe}
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
            onClick={() => setCheckedItems(new Set())}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Clear All
          </button>
          <button
            onClick={() => setCheckedItems(new Set(shoppingList.items.map((_: any, i: number) => i)))}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Check All
          </button>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Save Shopping List</h3>
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
                {saving ? 'Saving...' : 'Save'}
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
