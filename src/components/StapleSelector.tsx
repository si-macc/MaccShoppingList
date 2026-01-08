import { Staple } from '../types'
import { PencilIcon, TrashIcon } from './Icons'

interface StapleSelectorProps {
  staples: Staple[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onEdit?: (staple: Staple) => void
  onDelete?: (id: string) => void
}

export default function StapleSelector({ staples, selectedIds, onToggle, onEdit, onDelete }: StapleSelectorProps) {
  if (staples.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <p className="text-gray-500 dark:text-gray-400">No staples yet. Add some using the button above!</p>
      </div>
    )
  }

  const groupedBySector = staples.reduce((acc, staple) => {
    if (!acc[staple.sector]) {
      acc[staple.sector] = []
    }
    acc[staple.sector].push(staple)
    return acc
  }, {} as Record<string, Staple[]>)

  return (
    <div className="space-y-6">
      {Object.entries(groupedBySector).map(([sector, sectorStaples]) => (
        <div key={sector} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <h3 className="font-semibold text-gray-900 dark:text-white">{sector}</h3>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sectorStaples.map((staple) => (
              <div
                key={staple.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <label className="flex items-center space-x-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(staple.id)}
                    onChange={() => onToggle(staple.id)}
                    className="w-5 h-5 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 dark:bg-gray-700"
                  />
                  <span className="text-gray-900 dark:text-white">{staple.name}</span>
                  {staple.is_default && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-300">
                      Default
                    </span>
                  )}
                </label>
                {(onEdit || onDelete) && (
                  <div className="flex space-x-1 ml-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(staple)}
                        className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded transition"
                        title="Edit staple"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(staple.id)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                        title="Delete staple"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
