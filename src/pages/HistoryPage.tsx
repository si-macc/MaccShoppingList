import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ShoppingList } from '../types'
import { useLoadedList } from '../contexts/LoadedListContext'
import { ShoppingCartIcon, CheckIcon, TrashIcon, LoadingIcon } from '../components/Icons'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { setLoadedList } = useLoadedList()
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingListId, setLoadingListId] = useState<string | null>(null)

  useEffect(() => {
    fetchLists()
  }, [])

  const fetchLists = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setLists(data)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shopping list?')) return

    const { error } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchLists()
    }
  }

  const handleMarkComplete = async (id: string) => {
    const { error } = await supabase
      .from('shopping_lists')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      fetchLists()
    }
  }

  const handleLoadList = async (list: ShoppingList) => {
    setLoadingListId(list.id)
    try {
      // Fetch the shopping list items with sector information
      const { data: items, error } = await supabase
        .from('shopping_list_items')
        .select(`
          *,
          sector:supermarket_sectors (
            id,
            name,
            display_order
          )
        `)
        .eq('shopping_list_id', list.id)
        .order('id')

      if (error) throw error

      // Set the loaded list in context
      setLoadedList({
        id: list.id,
        name: list.name,
        items: items.map(item => ({
          name: item.item_name,
          sector_id: item.sector_id,
          sector: item.sector,
          quantity: item.quantity,
          is_checked: item.is_checked
        }))
      })

      // Navigate to shopping list page
      navigate('/')
    } catch (error) {
      console.error('Error loading list:', error)
      alert('Failed to load shopping list')
    } finally {
      setLoadingListId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading history...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Shopping History</h2>

      {lists.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No saved shopping lists yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Save a shopping list to see it here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => (
            <div
              key={list.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition"
            >
              {/* Top row: Name and status badge */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{list.name}</h3>
                {list.completed_at ? (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                    Completed
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                    Active
                  </span>
                )}
              </div>
              
              {/* Date info */}
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <p>Created: {formatDate(list.created_at)}</p>
                {list.completed_at && (
                  <p>Completed: {formatDate(list.completed_at)}</p>
                )}
              </div>

              {/* Action buttons - full width on mobile */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleLoadList(list)}
                  disabled={loadingListId === list.id}
                  className="flex-1 flex items-center justify-center p-2 bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition disabled:opacity-50"
                  title="Load this list"
                >
                  {loadingListId === list.id ? (
                    <LoadingIcon className="w-5 h-5" />
                  ) : (
                    <ShoppingCartIcon className="w-5 h-5" />
                  )}
                </button>
                {!list.completed_at && (
                  <button
                    onClick={() => handleMarkComplete(list.id)}
                    className="flex-1 flex items-center justify-center p-2 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition"
                    title="Mark as completed"
                  >
                    <CheckIcon className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(list.id)}
                  className="flex-1 flex items-center justify-center p-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition"
                  title="Delete list"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
