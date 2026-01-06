import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useOffline } from '../contexts/OfflineContext'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { isOnline } = useOffline()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium">
          📡 You are currently offline. Some features may be unavailable.
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">🍽️ Meal Planner</h1>
            </div>
            
            <nav className="hidden md:flex space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive('/') 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Shopping List
              </Link>
              <Link
                to="/edit"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive('/edit') 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Edit
              </Link>
              <Link
                to="/history"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive('/history') 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                History
              </Link>
            </nav>

            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200">
          <div className="flex justify-around py-2">
            <Link
              to="/"
              className={`flex-1 text-center px-3 py-2 text-sm font-medium ${
                isActive('/') ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
              }`}
            >
              Shopping
            </Link>
            <Link
              to="/edit"
              className={`flex-1 text-center px-3 py-2 text-sm font-medium ${
                isActive('/edit') ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
              }`}
            >
              Edit
            </Link>
            <Link
              to="/history"
              className={`flex-1 text-center px-3 py-2 text-sm font-medium ${
                isActive('/history') ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
              }`}
            >
              History
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
