import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ShoppingList } from '../types'

export default function HistoryPage() {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)

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
        <p className="mt-4 text-gray-600">Loading history...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Shopping History</h2>

      {lists.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-2">No saved shopping lists yet</p>
          <p className="text-sm text-gray-400">Save a shopping list to see it here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => (
            <div
              key={list.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
                    {list.completed_at ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        ✓ Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Active
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Created: {formatDate(list.created_at)}</p>
                    {list.completed_at && (
                      <p>Completed: {formatDate(list.completed_at)}</p>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  {!list.completed_at && (
                    <button
                      onClick={() => handleMarkComplete(list.id)}
                      className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                      title="Mark as completed"
                    >
                      ✓ Complete
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                    title="Delete list"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
