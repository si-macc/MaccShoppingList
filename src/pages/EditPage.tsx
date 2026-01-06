import { useState, useEffect } from 'react'
import RecipeGrid from '../components/RecipeGrid'
import RecipeEditModal from '../components/RecipeEditModal'
import StaplesList from '../components/StaplesList'
import StapleEditModal from '../components/StapleEditModal'
import BulkUploadModal from '../components/BulkUploadModal'
import { RecipeWithIngredients, Staple } from '../types'
import { supabase } from '../lib/supabase'

export default function EditPage() {
  const [activeTab, setActiveTab] = useState<'recipes' | 'staples'>('recipes')
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
  const [staples, setStaples] = useState<Staple[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null)
  const [editingStaple, setEditingStaple] = useState<Staple | null>(null)
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false)
  const [isCreatingStaple, setIsCreatingStaple] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)

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
            sector
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
      .select('*')
      .order('sector')
      .order('name')

    if (!error && data) {
      setStaples(data)
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
    setEditingStaple({
      id: '',
      name: '',
      sector: 'Fresh Produce',
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('recipes')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'recipes'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Recipes
          </button>
          <button
            onClick={() => setActiveTab('staples')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'staples'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Staples
          </button>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          >
            📤 Bulk Upload
          </button>
          <button
            onClick={activeTab === 'recipes' ? handleCreateRecipe : handleCreateStaple}
            className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            ➕ Add {activeTab === 'recipes' ? 'Recipe' : 'Staple'}
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'recipes' && (
        <div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading recipes...</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 mb-4">No recipes yet. Create your first recipe!</p>
              <button
                onClick={handleCreateRecipe}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                ➕ Add Your First Recipe
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
              <p className="mt-4 text-gray-600">Loading staples...</p>
            </div>
          ) : staples.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 mb-4">No staples yet. Create your first staple!</p>
              <button
                onClick={handleCreateStaple}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                ➕ Add Your First Staple
              </button>
            </div>
          ) : (
            <StaplesList
              staples={staples}
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
    </div>
  )
}
