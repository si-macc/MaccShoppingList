import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface ShoppingListGridProps {
  shoppingList: any
  onBack: () => void
  onNewList: () => void
}

// Define the 2x3 grid layout matching supermarket sectors
const SECTOR_LAYOUT = [
  // Row 1
  ['Fresh Produce', 'Meat & Seafood', 'Dairy & Eggs'],
  // Row 2
  ['Bakery & Bread', 'Pantry & Canned Goods', 'Frozen Foods']
]

export default function ShoppingListGrid({ shoppingList, onBack, onNewList }: ShoppingListGridProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [listName, setListName] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)

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
    
    for (const row of SECTOR_LAYOUT) {
      for (const sector of row) {
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shopping List</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {checkedCount} of {totalItems} items checked
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            ← Back
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 border border-primary-600 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 transition"
          >
            📤 Share
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            💾 Save List
          </button>
          <button
            onClick={onNewList}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
          >
            🆕 New List
          </button>
        </div>
      </div>

      {/* 2x3 Grid Layout */}
      <div className="space-y-4">
        {SECTOR_LAYOUT.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {row.map((sector) => {
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
