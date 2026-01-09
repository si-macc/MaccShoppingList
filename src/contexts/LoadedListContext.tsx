import { createContext, useContext, useState, ReactNode } from 'react'

interface LoadedListItem {
  db_id?: string
  name: string
  sector: string
  sector_id?: string | null
  quantity: string | null
  is_checked: boolean
}

interface LoadedList {
  id: string
  name: string
  items: LoadedListItem[]
}

interface LoadedListContextType {
  loadedList: LoadedList | null
  setLoadedList: (list: LoadedList | null) => void
  clearLoadedList: () => void
}

const LoadedListContext = createContext<LoadedListContextType | undefined>(undefined)

export function LoadedListProvider({ children }: { children: ReactNode }) {
  const [loadedList, setLoadedList] = useState<LoadedList | null>(null)

  const clearLoadedList = () => {
    setLoadedList(null)
  }

  return (
    <LoadedListContext.Provider value={{ loadedList, setLoadedList, clearLoadedList }}>
      {children}
    </LoadedListContext.Provider>
  )
}

export function useLoadedList() {
  const context = useContext(LoadedListContext)
  if (context === undefined) {
    throw new Error('useLoadedList must be used within a LoadedListProvider')
  }
  return context
}
