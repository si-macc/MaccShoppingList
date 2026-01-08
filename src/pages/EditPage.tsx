import { useState, useEffect } from 'react'
import RecipeGrid from '../components/RecipeGrid'
import RecipeEditModal from '../components/RecipeEditModal'
import StaplesList from '../components/StaplesList'
import StapleEditModal from '../components/StapleEditModal'
import BulkUploadModal from '../components/BulkUploadModal'
import SectorManager from '../components/SectorManager'
import { RecipeWithIngredients, Staple } from '../types'
import { supabase } from '../lib/supabase'
import { PlusIcon, UploadIcon, CogIcon } from '../components/Icons'

export default function EditPage() {
  const [activeTab, setActiveTab] = useState<'recipes' | 'staples'>('recipes')
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
  const [staples, setStaples] = useState<Staple[]>([])
  const [sectors, setSectors] = useState<{ id: string; name: string; display_order: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null)
  const [editingStaple, setEditingStaple] = useState<Staple | null>(null)
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false)
  const [isCreatingStaple, setIsCreatingStaple] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showSectorManager, setShowSectorManager] = useState(false)

  useEffect(() => {
    if (activeTab === 'recipes') {
      fetchRecipes()
    } else {
      fetchStaples()
    }
  }, [activeTab])

  const fetchRecipes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          id,
          recipe_id,
          ingredient_id,
          quantity,
          unit,
          ingredient:ingredients (
            id,
            name,
            sector_id,
            sector:supermarket_sectors (
              id,
              name
            )
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setRecipes(data as RecipeWithIngredients[])
    }
    setLoading(false)
  }

  const fetchStaples = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('staples')
      .select(`
        *,
        sector:supermarket_sectors (
          id,
          name,
          display_order
        )
      `)
      .order('name')

    if (!error && data) {
      console.log('📦 Fetched Staples:', data)
      console.log('📦 Staple sectors:', Array.from(new Set(data.map(s => s.sector?.name))))
      setStaples(data)
    }

    // Fetch sectors with display_order for proper sorting
    const { data: sectorsData } = await supabase
      .from('supermarket_sectors')
      .select('id, name, display_order')
      .order('display_order')

    if (sectorsData) {
      console.log('🏪 Fetched Sectors from DB:', sectorsData)
      setSectors(sectorsData)
    }

    setLoading(false)
  }

  const handleCreateRecipe = () => {
    setIsCreatingRecipe(true)
    setEditingRecipe({
      id: '',
      name: '',
      image_url: null,
      instructions: null,
      created_at: '',
      updated_at: '',
      recipe_ingredients: []
    })
  }

  const handleCreateStaple = () => {
    setIsCreatingStaple(true)
    // Use the first sector as default, or empty if no sectors loaded yet
    const defaultSectorId = sectors.find(s => s.name === 'Fresh Produce')?.id || sectors[0]?.id || ''
    setEditingStaple({
      id: '',
      name: '',
      sector_id: defaultSectorId,
      is_default: false,
      created_at: '',
      updated_at: ''
    })
  }

  const handleCloseRecipeModal = () => {
    setEditingRecipe(null)
    setIsCreatingRecipe(false)
    fetchRecipes()
  }

  const handleCloseStapleModal = () => {
    setEditingStaple(null)
    setIsCreatingStaple(false)
    fetchStaples()
  }

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchRecipes()
    }
  }

  const handleDeleteStaple = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staple?')) return

    const { error } = await supabase
      .from('staples')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchStaples()
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('recipes')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'recipes'
                ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Recipes
          </button>
          <button
            onClick={() => setActiveTab('staples')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'staples'
                ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Staples
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowSectorManager(true)}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition"
          >
            <CogIcon className="w-4 h-4" />
            <span>Sectors</span>
          </button>
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition"
          >
            <UploadIcon className="w-4 h-4" />
            <span>Bulk Upload</span>
          </button>
          <button
            onClick={activeTab === 'recipes' ? handleCreateRecipe : handleCreateStaple}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add {activeTab === 'recipes' ? 'Recipe' : 'Staple'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'recipes' && (
        <div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading recipes...</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No recipes yet. Create your first recipe!</p>
              <button
                onClick={handleCreateRecipe}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Your First Recipe</span>
              </button>
            </div>
          ) : (
            <RecipeGrid
              recipes={recipes}
              onEdit={setEditingRecipe}
              onDelete={handleDeleteRecipe}
            />
          )}
        </div>
      )}

      {activeTab === 'staples' && (
        <div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading staples...</p>
            </div>
          ) : staples.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No staples yet. Create your first staple!</p>
              <button
                onClick={handleCreateStaple}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Your First Staple</span>
              </button>
            </div>
          ) : (
            <StaplesList
              staples={staples}
              sectors={sectors}
              onEdit={setEditingStaple}
              onDelete={handleDeleteStaple}
            />
          )}
        </div>
      )}

      {/* Modals */}
      {editingRecipe && (
        <RecipeEditModal
          recipe={editingRecipe}
          isCreating={isCreatingRecipe}
          onClose={handleCloseRecipeModal}
        />
      )}

      {editingStaple && (
        <StapleEditModal
          staple={editingStaple}
          isCreating={isCreatingStaple}
          onClose={handleCloseStapleModal}
        />
      )}

      {showBulkUpload && (
        <BulkUploadModal
          type={activeTab}
          onClose={() => {
            setShowBulkUpload(false)
            if (activeTab === 'recipes') {
              fetchRecipes()
            } else {
              fetchStaples()
            }
          }}
        />
      )}

      {showSectorManager && (
        <SectorManager 
          onClose={() => setShowSectorManager(false)} 
          onSectorsChanged={() => {
            // Refresh ALL data to reflect sector name changes
            fetchRecipes()
            fetchStaples()
          }}
        />
      )}
    </div>
  )
}
