import { useState, useEffect } from 'react'
import { RecipeWithIngredients, Staple } from '../types'
import { supabase } from '../lib/supabase'
import RecipeSelectionCard from '../components/RecipeSelectionCard'
import StapleSelector from '../components/StapleSelector'
import ShoppingListGrid from '../components/ShoppingListGrid'
import RecipeEditModal from '../components/RecipeEditModal'
import StapleEditModal from '../components/StapleEditModal'
import BulkUploadModal from '../components/BulkUploadModal'
import SectorManager from '../components/SectorManager'
import { useLoadedList } from '../contexts/LoadedListContext'
import { ShoppingCartIcon, PlusIcon, UploadIcon, CogIcon } from '../components/Icons'

type ViewMode = 'selection' | 'list'

export default function ShoppingListPage() {
  const { loadedList, clearLoadedList } = useLoadedList()
  const [viewMode, setViewMode] = useState<ViewMode>('selection')
  const [activeTab, setActiveTab] = useState<'recipes' | 'staples'>('recipes')
  
  // Data
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
  const [staples, setStaples] = useState<Staple[]>([])
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  
  // Selections
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set())
  const [selectedStapleIds, setSelectedStapleIds] = useState<Set<string>>(new Set())
  
  // Ingredient filters
  const [selectedIngredientFilters, setSelectedIngredientFilters] = useState<Set<string>>(new Set())
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([])
  const [ingredientDropdownOpen, setIngredientDropdownOpen] = useState(false)
  
  // Generated list
  const [shoppingList, setShoppingList] = useState<any>(null)
  
  // Edit modals
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null)
  const [editingStaple, setEditingStaple] = useState<Staple | null>(null)
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false)
  const [isCreatingStaple, setIsCreatingStaple] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showSectorManager, setShowSectorManager] = useState(false)

  // Check for loaded list from history
  useEffect(() => {
    if (loadedList) {
      // Convert loaded list to shopping list format with db_ids
      const itemsWithIds = loadedList.items.map(item => ({
        db_id: item.db_id,
        name: item.name,
        sector: item.sector || 'Other',
        sector_id: item.sector_id,
        quantity: item.quantity,
        is_checked: item.is_checked
      }))

      const grouped = itemsWithIds.reduce((acc, item) => {
        const sectorName = item.sector
        if (!acc[sectorName]) {
          acc[sectorName] = []
        }
        acc[sectorName].push(item)
        return acc
      }, {} as Record<string, any[]>)

      // Set the selected recipe IDs from the loaded list
      if (loadedList.recipeIds && loadedList.recipeIds.length > 0) {
        setSelectedRecipeIds(new Set(loadedList.recipeIds))
      }

      // Set the selected staple IDs from the loaded list
      if (loadedList.stapleIds && loadedList.stapleIds.length > 0) {
        setSelectedStapleIds(new Set(loadedList.stapleIds))
      }

      setShoppingList({
        id: loadedList.id,
        name: loadedList.name,
        items: itemsWithIds,
        grouped,
        createdAt: new Date().toISOString(),
        isLoaded: true,
        recipeIds: loadedList.recipeIds || [],
        stapleIds: loadedList.stapleIds || []
      })
      setViewMode('list')
      
      // Fetch data but skip setting default staples since we're loading from history
      fetchData(true)
      clearLoadedList()
    }
  }, [loadedList, clearLoadedList])

  useEffect(() => {
    // Only fetch with defaults if not coming from history
    if (!loadedList) {
      fetchData()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async (skipDefaultStaples = false) => {
    setLoading(true)
    
    // Fetch recipes with ingredients (including sector join)
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
            sector_id,
            sector:supermarket_sectors (
              id,
              name,
              display_order
            )
          )
        )
      `)
      .order('name')

    // Fetch staples with sector join
    const { data: staplesData } = await supabase
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

    if (recipesData) {
      setRecipes(recipesData as RecipeWithIngredients[])
      // Extract all unique ingredients
      const allIngredients = new Set<string>()
      recipesData.forEach(recipe => {
        recipe.recipe_ingredients?.forEach((ri: any) => {
          if (ri.ingredient?.name) {
            allIngredients.add(ri.ingredient.name)
          }
        })
      })
      setAvailableIngredients(Array.from(allIngredients).sort())
    }
    if (staplesData) {
      setStaples(staplesData)
      // Auto-select default staples only if not loading from history
      if (!skipDefaultStaples) {
        const defaultIds = staplesData.filter(s => s.is_default).map(s => s.id)
        setSelectedStapleIds(new Set(defaultIds))
      }
    }

    // Fetch sectors ordered by display_order
    const { data: sectorsData } = await supabase
      .from('supermarket_sectors')
      .select('id, name')
      .order('display_order')

    if (sectorsData) {
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
    setEditingStaple({
      id: '',
      name: '',
      sector_id: sectors.length > 0 ? sectors[0].id : '',
      is_default: false,
      created_at: '',
      updated_at: ''
    })
  }

  const handleCloseRecipeModal = () => {
    setEditingRecipe(null)
    setIsCreatingRecipe(false)
    fetchData()
  }

  const handleCloseStapleModal = () => {
    setEditingStaple(null)
    setIsCreatingStaple(false)
    fetchData()
  }

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchData()
    }
  }

  const handleDeleteStaple = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staple?')) return

    const { error } = await supabase
      .from('staples')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchData()
    }
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
    const rawItems: any[] = []

    // Add ingredients from selected recipes
    const selectedRecipes = recipes.filter(r => selectedRecipeIds.has(r.id))
    for (const recipe of selectedRecipes) {
      for (const ri of recipe.recipe_ingredients) {
        if (ri.ingredient) {
          rawItems.push({
            name: ri.ingredient.name,
            sector: ri.ingredient.sector?.name || 'Other',
            sector_id: ri.ingredient.sector_id,
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
      rawItems.push({
        name: staple.name,
        sector: staple.sector?.name || 'Other',
        sector_id: staple.sector_id,
        quantity: null,
        unit: null,
        from_staple: true
      })
    }

    // Consolidate duplicate items by name (case-insensitive)
    const consolidatedMap = new Map<string, any>()
    for (const item of rawItems) {
      const key = item.name.toLowerCase().trim()
      if (consolidatedMap.has(key)) {
        const existing = consolidatedMap.get(key)
        // Add this requirement to the list
        const requirement: any = {}
        if (item.quantity) {
          requirement.quantity = item.quantity
          requirement.unit = item.unit || ''
        }
        if (item.from_recipe) {
          requirement.source = item.from_recipe
        } else if (item.from_staple) {
          requirement.source = 'Staple'
        }
        // Only add if there's meaningful info and not a duplicate
        if (requirement.quantity || requirement.source) {
          const isDuplicate = existing.requirements.some((r: any) => 
            r.quantity === requirement.quantity && 
            r.unit === requirement.unit && 
            r.source === requirement.source
          )
          if (!isDuplicate) {
            existing.requirements.push(requirement)
          }
        }
      } else {
        // First occurrence - create new consolidated item
        const requirements: any[] = []
        const requirement: any = {}
        if (item.quantity) {
          requirement.quantity = item.quantity
          requirement.unit = item.unit || ''
        }
        if (item.from_recipe) {
          requirement.source = item.from_recipe
        } else if (item.from_staple) {
          requirement.source = 'Staple'
        }
        if (requirement.quantity || requirement.source) {
          requirements.push(requirement)
        }
        
        consolidatedMap.set(key, {
          name: item.name,
          sector: item.sector,
          sector_id: item.sector_id,
          requirements
        })
      }
    }

    const items = Array.from(consolidatedMap.values())

    // Group by sector
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.sector]) {
        acc[item.sector] = []
      }
      acc[item.sector].push(item)
      return acc
    }, {} as Record<string, any[]>)

    // Auto-save to database
    const listName = `Shopping List - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    
    try {
      // Create shopping list
      const { data: savedList, error: listError } = await supabase
        .from('shopping_lists')
        .insert({
          name: listName,
          completed_at: null
        })
        .select()
        .single()

      if (listError) throw listError

      // Insert all items and get their IDs back
      // Format requirements as a readable string for storage
      const itemsToInsert = items.map((item: any) => {
        const quantityStr = item.requirements
          .map((r: any) => {
            const parts = []
            if (r.quantity) parts.push(`${r.quantity}${r.unit || ''}`)
            if (r.source) parts.push(`(${r.source})`)
            return parts.join(' ')
          })
          .filter(Boolean)
          .join(', ') || null
        
        return {
          shopping_list_id: savedList.id,
          item_name: item.name,
          sector_id: item.sector_id,
          quantity: quantityStr,
          is_checked: false
        }
      })

      const { data: savedItems, error: itemsError } = await supabase
        .from('shopping_list_items')
        .insert(itemsToInsert)
        .select()

      if (itemsError) throw itemsError

      // Map database IDs back to items
      const itemsWithIds = items.map((item, index) => ({
        ...item,
        db_id: savedItems[index]?.id,
        is_checked: false
      }))

      // Update grouped with db_ids
      const groupedWithIds = itemsWithIds.reduce((acc, item) => {
        if (!acc[item.sector]) {
          acc[item.sector] = []
        }
        acc[item.sector].push(item)
        return acc
      }, {} as Record<string, any[]>)

      // Save the recipe IDs to the junction table
      const recipeIdsArray = Array.from(selectedRecipeIds)
      if (recipeIdsArray.length > 0) {
        const recipeLinks = recipeIdsArray.map(recipeId => ({
          shopping_list_id: savedList.id,
          recipe_id: recipeId
        }))
        const { error: recipeError } = await supabase
          .from('shopping_list_recipes')
          .insert(recipeLinks)
        if (recipeError) {
          console.error('Error saving recipe links:', recipeError)
        }
      }

      // Save the staple IDs to the junction table
      const stapleIdsArray = Array.from(selectedStapleIds)
      if (stapleIdsArray.length > 0) {
        const stapleLinks = stapleIdsArray.map(stapleId => ({
          shopping_list_id: savedList.id,
          staple_id: stapleId
        }))
        const { error: stapleError } = await supabase
          .from('shopping_list_staples')
          .insert(stapleLinks)
        if (stapleError) {
          console.error('Error saving staple links:', stapleError)
        }
      }

      setShoppingList({
        id: savedList.id,
        name: listName,
        items: itemsWithIds,
        grouped: groupedWithIds,
        createdAt: new Date().toISOString(),
        recipeIds: recipeIdsArray,
        stapleIds: stapleIdsArray
      })
    } catch (error) {
      console.error('Error auto-saving list:', error)
      // Still show the list even if save failed
      setShoppingList({
        items,
        grouped,
        createdAt: new Date().toISOString()
      })
    }

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

  const handleUpdateExistingList = async () => {
    if (!shoppingList?.id) return

    // Build new items from current selections
    const rawItems: any[] = []

    // Add ingredients from selected recipes
    const selectedRecipes = recipes.filter(r => selectedRecipeIds.has(r.id))
    for (const recipe of selectedRecipes) {
      for (const ri of recipe.recipe_ingredients) {
        if (ri.ingredient) {
          rawItems.push({
            name: ri.ingredient.name,
            sector: ri.ingredient.sector?.name || 'Other',
            sector_id: ri.ingredient.sector_id,
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
      rawItems.push({
        name: staple.name,
        sector: staple.sector?.name || 'Other',
        sector_id: staple.sector_id,
        quantity: null,
        unit: null,
        from_staple: true
      })
    }

    // Consolidate items
    const consolidatedMap = new Map<string, any>()
    for (const item of rawItems) {
      const key = item.name.toLowerCase().trim()
      if (consolidatedMap.has(key)) {
        const existing = consolidatedMap.get(key)
        const requirement: any = {}
        if (item.quantity) {
          requirement.quantity = item.quantity
          requirement.unit = item.unit || ''
        }
        if (item.from_recipe) {
          requirement.source = item.from_recipe
        } else if (item.from_staple) {
          requirement.source = 'Staple'
        }
        if (requirement.quantity || requirement.source) {
          const isDuplicate = existing.requirements.some((r: any) => 
            r.quantity === requirement.quantity && 
            r.unit === requirement.unit && 
            r.source === requirement.source
          )
          if (!isDuplicate) {
            existing.requirements.push(requirement)
          }
        }
      } else {
        const requirements: any[] = []
        const requirement: any = {}
        if (item.quantity) {
          requirement.quantity = item.quantity
          requirement.unit = item.unit || ''
        }
        if (item.from_recipe) {
          requirement.source = item.from_recipe
        } else if (item.from_staple) {
          requirement.source = 'Staple'
        }
        if (requirement.quantity || requirement.source) {
          requirements.push(requirement)
        }
        
        consolidatedMap.set(key, {
          name: item.name,
          sector: item.sector,
          sector_id: item.sector_id,
          requirements
        })
      }
    }

    const newItems = Array.from(consolidatedMap.values())

    try {
      // Delete existing items from the list
      await supabase
        .from('shopping_list_items')
        .delete()
        .eq('shopping_list_id', shoppingList.id)

      // Insert new items
      const itemsToInsert = newItems.map((item: any) => {
        const quantityStr = item.requirements
          .map((r: any) => {
            const parts = []
            if (r.quantity) parts.push(`${r.quantity}${r.unit || ''}`)
            if (r.source) parts.push(`(${r.source})`)
            return parts.join(' ')
          })
          .filter(Boolean)
          .join(', ') || null
        
        return {
          shopping_list_id: shoppingList.id,
          item_name: item.name,
          sector_id: item.sector_id,
          quantity: quantityStr,
          is_checked: false
        }
      })

      const { data: savedItems, error: itemsError } = await supabase
        .from('shopping_list_items')
        .insert(itemsToInsert)
        .select()

      if (itemsError) throw itemsError

      // Update recipe associations
      await supabase
        .from('shopping_list_recipes')
        .delete()
        .eq('shopping_list_id', shoppingList.id)

      const recipeIdsArray = Array.from(selectedRecipeIds)
      if (recipeIdsArray.length > 0) {
        const recipeLinks = recipeIdsArray.map(recipeId => ({
          shopping_list_id: shoppingList.id,
          recipe_id: recipeId
        }))
        await supabase
          .from('shopping_list_recipes')
          .insert(recipeLinks)
      }

      // Update staple associations
      await supabase
        .from('shopping_list_staples')
        .delete()
        .eq('shopping_list_id', shoppingList.id)

      const stapleIdsArray = Array.from(selectedStapleIds)
      if (stapleIdsArray.length > 0) {
        const stapleLinks = stapleIdsArray.map(stapleId => ({
          shopping_list_id: shoppingList.id,
          staple_id: stapleId
        }))
        await supabase
          .from('shopping_list_staples')
          .insert(stapleLinks)
      }

      // Map database IDs back to items
      const itemsWithIds = newItems.map((item, index) => ({
        ...item,
        db_id: savedItems[index]?.id,
        is_checked: false
      }))

      // Update grouped with db_ids
      const groupedWithIds = itemsWithIds.reduce((acc, item) => {
        if (!acc[item.sector]) {
          acc[item.sector] = []
        }
        acc[item.sector].push(item)
        return acc
      }, {} as Record<string, any[]>)

      setShoppingList({
        ...shoppingList,
        items: itemsWithIds,
        grouped: groupedWithIds,
        recipeIds: recipeIdsArray,
        stapleIds: stapleIdsArray
      })

      setViewMode('list')
    } catch (error) {
      console.error('Error updating list:', error)
      alert('Failed to update shopping list')
    }
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
      {/* Header with Generate List and Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shopping List</h2>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {selectedRecipeIds.size} recipes, {selectedStapleIds.size} staples selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateList}
                disabled={selectedRecipeIds.size === 0 && selectedStapleIds.size === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                <span>New List</span>
              </button>
              {shoppingList && (
                <button
                  onClick={handleUpdateExistingList}
                  disabled={selectedRecipeIds.size === 0 && selectedStapleIds.size === 0}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  <span>Update List</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowSectorManager(true)}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition"
          >
            <CogIcon className="w-4 h-4" />
            <span>Sectors</span>
          </button>
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition"
          >
            <UploadIcon className="w-4 h-4" />
            <span>Upload</span>
          </button>
          <button
            onClick={activeTab === 'recipes' ? handleCreateRecipe : handleCreateStaple}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add {activeTab === 'recipes' ? 'Recipe' : 'Staple'}</span>
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
                  Clear all ({selectedIngredientFilters.size})
                </button>
              )}
            </div>
            
            {/* Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIngredientDropdownOpen(!ingredientDropdownOpen)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {selectedIngredientFilters.size === 0 
                    ? 'Select ingredients...' 
                    : `${selectedIngredientFilters.size} ingredient${selectedIngredientFilters.size > 1 ? 's' : ''} selected`
                  }
                </span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${ingredientDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {ingredientDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {availableIngredients.map(ingredient => {
                    const isSelected = selectedIngredientFilters.has(ingredient)
                    return (
                      <button
                        key={ingredient}
                        onClick={() => toggleIngredientFilter(ingredient)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center space-x-3"
                      >
                        <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                          isSelected 
                            ? 'bg-primary-600 border-primary-600' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-gray-900 dark:text-white">{ingredient}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            
            {/* Selected Chips */}
            {selectedIngredientFilters.size > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from(selectedIngredientFilters).map(ingredient => (
                  <span
                    key={ingredient}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                  >
                    <span>{ingredient}</span>
                    <button
                      onClick={() => toggleIngredientFilter(ingredient)}
                      className="hover:text-primary-900 dark:hover:text-primary-100"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {selectedIngredientFilters.size > 0 && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Showing recipes with all selected ingredients ({filteredRecipes.length} of {recipes.length})
              </p>
            )}
          </div>

          {/* Recipe Grid */}
          {recipes.length === 0 ? (
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
                  isInCurrentList={shoppingList?.recipeIds?.includes(recipe.id) || false}
                  onToggle={() => toggleRecipe(recipe.id)}
                  onEdit={() => setEditingRecipe(recipe)}
                  onDelete={() => handleDeleteRecipe(recipe.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'staples' && (
        <div>
          {staples.length === 0 ? (
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
            <StapleSelector
              staples={staples}
              selectedIds={selectedStapleIds}
              onToggle={toggleStaple}
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
            fetchData()
          }}
        />
      )}

      {showSectorManager && (
        <SectorManager 
          onClose={() => setShowSectorManager(false)} 
          onSectorsChanged={() => {
            fetchData()
          }}
        />
      )}
    </div>
  )
}
