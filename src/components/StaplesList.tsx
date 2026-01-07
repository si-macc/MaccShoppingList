import { Staple } from '../types'
import { PencilIcon, TrashIcon } from './Icons'

interface StaplesListProps {
  staples: Staple[]
  onEdit: (staple: Staple) => void
  onDelete: (id: string) => void
}

export default function StaplesList({ staples, onEdit, onDelete }: StaplesListProps) {
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
                <div className="flex items-center space-x-3">
                  <span className="text-gray-900 dark:text-white">{staple.name}</span>
                  {staple.is_default && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-300">
                      Default
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-1">
                  <button
                    onClick={() => onEdit(staple)}
                    className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded transition"
                    title="Edit staple"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(staple.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                    title="Delete staple"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
