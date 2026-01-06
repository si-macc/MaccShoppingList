import { Staple } from '../types'

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
        <div key={sector} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{sector}</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {sectorStaples.map((staple) => (
              <div
                key={staple.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-gray-900">{staple.name}</span>
                  {staple.is_default && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                      Default
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(staple)}
                    className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                    title="Edit staple"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDelete(staple.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                    title="Delete staple"
                  >
                    🗑️
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
