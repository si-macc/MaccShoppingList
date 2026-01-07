import { useState, useEffect } from 'react'
import { RecipeWithIngredients, Staple } from '../types'
import { supabase } from '../lib/supabase'
import RecipeSelectionCard from '../components/RecipeSelectionCard'
import StapleSelector from '../components/StapleSelector'
import ShoppingListGrid from '../components/ShoppingListGrid'
import { useLoadedList } from '../contexts/LoadedListContext'

type ViewMode = 'selection' | 'list'

export default function ShoppingListPage() {
  const { loadedList, clearLoadedList } = useLoadedList()
  const [viewMode, setViewMode] = useState<ViewMode>('selection')
  const [activeTab, setActiveTab] = useState<'recipes' | 'staples'>('recipes')
  
  // Data
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
  const [staples, setStaples] = useState<Staple[]>([])
  const [loading, setLoading] = useState(true)
  
  // Selections
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set())
  const [selectedStapleIds, setSelectedStapleIds] = useState<Set<string>>(new Set())
  
  // Ingredient filters
  const [selectedIngredientFilters, setSelectedIngredientFilters] = useState<Set<string>>(new Set())
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([])
  
  // Generated list
  const [shoppingList, setShoppingList] = useState<any>(null)

  // Check for loaded list from history
  useEffect(() => {
    if (loadedList) {
      // Convert loaded list to shopping list format
      const grouped = loadedList.items.reduce((acc, item) => {
        if (!acc[item.sector]) {
          acc[item.sector] = []
        }
        acc[item.sector].push({
          name: item.name,
          sector: item.sector,
          quantity: item.quantity,
          is_checked: item.is_checked
        })
        return acc
      }, {} as Record<string, any[]>)

      setShoppingList({
        id: loadedList.id,
        name: loadedList.name,
        items: loadedList.items,
        grouped,
        createdAt: new Date().toISOString(),
        isLoaded: true
      })
      setViewMode('list')
      clearLoadedList()
    }
  }, [loadedList, clearLoadedList])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    // Fetch recipes with ingredients
    const { data: recipesData } = await supabase
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
      .order('name')

    // Fetch staples
    const { data: staplesData } = await supabase
      .from('staples')
      .select('*')
      .order('name')

    if (recipesData) {
      setRecipes(recipesData as RecipeWithIngredients[])
      // Extract all unique ingredients
      const allIngredients = new Set<string>()
      recipesData.forEach(recipe => {
        recipe.recipe_ingredients?.forEach(ri => {
          if (ri.ingredient?.name) {
            allIngredients.add(ri.ingredient.name)
          }
        })
      })
      setAvailableIngredients(Array.from(allIngredients).sort())
    }
    if (staplesData) {
      setStaples(staplesData)
      // Auto-select default staples
      const defaultIds = staplesData.filter(s => s.is_default).map(s => s.id)
      setSelectedStapleIds(new Set(defaultIds))
    }
    
    setLoading(false)
  }

  const toggleIngredientFilter = (ingredientName: string) => {
    const newSet = new Set(selectedIngredientFilters)
    if (newSet.has(ingredientName)) {
      newSet.delete(ingredientName)
    } else {
      newSet.add(ingredientName)
    }
    setSelectedIngredientFilters(newSet)
  }

  const clearIngredientFilters = () => {
    setSelectedIngredientFilters(new Set())
  }

  // Filter recipes based on selected ingredients
  const filteredRecipes = selectedIngredientFilters.size === 0 
    ? recipes
    : recipes.filter(recipe => {
        const recipeIngredients = recipe.recipe_ingredients?.map(ri => ri.ingredient?.name).filter(Boolean) || []
        // Recipe must contain ALL selected ingredients
        return Array.from(selectedIngredientFilters).every(filter => 
          recipeIngredients.includes(filter)
        )
      })

  const toggleRecipe = (id: string) => {
    const newSet = new Set(selectedRecipeIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedRecipeIds(newSet)
  }

  const toggleStaple = (id: string) => {
    const newSet = new Set(selectedStapleIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedStapleIds(newSet)
  }

  const handleGenerateList = async () => {
    const items: any[] = []

    // Add ingredients from selected recipes
    const selectedRecipes = recipes.filter(r => selectedRecipeIds.has(r.id))
    for (const recipe of selectedRecipes) {
      for (const ri of recipe.recipe_ingredients) {
        if (ri.ingredient) {
          items.push({
            name: ri.ingredient.name,
            sector: ri.ingredient.sector,
            quantity: ri.quantity,
            unit: ri.unit,
            from_recipe: recipe.name
          })
        }
      }
    }

    // Add selected staples
    const selectedStaplesData = staples.filter(s => selectedStapleIds.has(s.id))
    for (const staple of selectedStaplesData) {
      items.push({
        name: staple.name,
        sector: staple.sector,
        quantity: null,
        unit: null,
        from_staple: true
      })
    }

    // Group by sector
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.sector]) {
        acc[item.sector] = []
      }
      acc[item.sector].push(item)
      return acc
    }, {} as Record<string, any[]>)

    setShoppingList({
      items,
      grouped,
      createdAt: new Date().toISOString()
    })
    setViewMode('list')
  }

  const handleBackToSelection = () => {
    setViewMode('selection')
  }

  const handleNewList = () => {
    setSelectedRecipeIds(new Set())
    const defaultIds = staples.filter(s => s.is_default).map(s => s.id)
    setSelectedStapleIds(new Set(defaultIds))
    setShoppingList(null)
    setViewMode('selection')
    setActiveTab('recipes')
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (viewMode === 'list' && shoppingList) {
    return (
      <ShoppingListGrid 
        shoppingList={shoppingList}
        onBack={handleBackToSelection}
        onNewList={handleNewList}
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Shopping List</h2>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {selectedRecipeIds.size} recipes, {selectedStapleIds.size} staples selected
          </span>
          <button
            onClick={handleGenerateList}
            disabled={selectedRecipeIds.size === 0 && selectedStapleIds.size === 0}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🛒 Generate List
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6">
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

      {/* Content */}
      {activeTab === 'recipes' && (
        <div>
          {/* Ingredient Filters */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Filter by Ingredients</h3>
              {selectedIngredientFilters.size > 0 && (
                <button
                  onClick={clearIngredientFilters}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Clear filters ({selectedIngredientFilters.size})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableIngredients.map(ingredient => {
                const isSelected = selectedIngredientFilters.has(ingredient)
                return (
                  <button
                    key={ingredient}
                    onClick={() => toggleIngredientFilter(ingredient)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      isSelected
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {ingredient}
                  </button>
                )
              })}
            </div>
            {selectedIngredientFilters.size > 0 && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Showing recipes with all selected ingredients ({filteredRecipes.length} of {recipes.length})
              </p>
            )}
          </div>

          {/* Recipe Grid */}
          {recipes.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-gray-500 dark:text-gray-400">No recipes yet. Go to Edit page to create some!</p>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-gray-500 dark:text-gray-400">No recipes match the selected ingredients</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRecipes.map((recipe) => (
                <RecipeSelectionCard
                  key={recipe.id}
                  recipe={recipe}
                  isSelected={selectedRecipeIds.has(recipe.id)}
                  onToggle={() => toggleRecipe(recipe.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'staples' && (
        <StapleSelector
          staples={staples}
          selectedIds={selectedStapleIds}
          onToggle={toggleStaple}
        />
      )}
    </div>
  )
}
