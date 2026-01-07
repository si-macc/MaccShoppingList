import { useState, useEffect } from 'react'
import { RecipeWithIngredients, Ingredient, RecipeIngredient, SupermarketSector } from '../types'
import { supabase } from '../lib/supabase'
import { TrashIcon, PencilIcon } from './Icons'

interface RecipeEditModalProps {
  recipe: RecipeWithIngredients
  isCreating: boolean
  onClose: () => void
}

export default function RecipeEditModal({ recipe, isCreating, onClose }: RecipeEditModalProps) {
  const [name, setName] = useState(recipe.name)
  const [instructions, setInstructions] = useState(recipe.instructions || '')
  const [imageUrl, setImageUrl] = useState(recipe.image_url || '')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe.recipe_ingredients)
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
  const [sectors, setSectors] = useState<SupermarketSector[]>([])
  const [saving, setSaving] = useState(false)

  // New ingredient form
  const [newIngredientName, setNewIngredientName] = useState('')
  const [newIngredientSector, setNewIngredientSector] = useState('')
  const [newIngredientQuantity, setNewIngredientQuantity] = useState('')
  const [newIngredientUnit, setNewIngredientUnit] = useState('')

  // Edit ingredient state
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editSector, setEditSector] = useState('')

  useEffect(() => {
    fetchIngredients()
    fetchSectors()
  }, [])

  const fetchSectors = async () => {
    const { data, error } = await supabase
      .from('supermarket_sectors')
      .select('*')
      .order('display_order')

    if (!error && data) {
      setSectors(data)
      if (data.length > 0 && !newIngredientSector) {
        setNewIngredientSector(data[0].name)
      }
    }
  }

  const fetchIngredients = async () => {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name')

    if (!error && data) {
      setAvailableIngredients(data)
    }
  }

  const handleAddIngredient = async () => {
    if (!newIngredientName.trim()) return

    // Check if ingredient exists
    let ingredient = availableIngredients.find(
      i => i.name.toLowerCase() === newIngredientName.toLowerCase()
    )

    // Create new ingredient if doesn't exist
    if (!ingredient) {
      const { data, error } = await supabase
        .from('ingredients')
        .insert({
          name: newIngredientName,
          sector: newIngredientSector
        })
        .select()
        .single()

      if (error || !data) return
      
      ingredient = data
      setAvailableIngredients([...availableIngredients, data])
    }

    // Add to recipe ingredients (ingredient is guaranteed to be defined at this point)
    const newRecipeIngredient: RecipeIngredient = {
      id: `temp-${Date.now()}`,
      recipe_id: recipe.id,
      ingredient_id: ingredient!.id,
      quantity: newIngredientQuantity || null,
      unit: newIngredientUnit || null,
      ingredient: ingredient!
    }

    setIngredients([...ingredients, newRecipeIngredient])
    
    // Reset form
    setNewIngredientName('')
    setNewIngredientQuantity('')
    setNewIngredientUnit('')
  }

  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id))
  }

  const handleStartEditIngredient = (ing: RecipeIngredient) => {
    setEditingIngredientId(ing.id)
    setEditQuantity(ing.quantity || '')
    setEditUnit(ing.unit || '')
    setEditSector(ing.ingredient?.sector || '')
  }

  const handleSaveEditIngredient = async (id: string) => {
    const ingredient = ingredients.find(ing => ing.id === id)
    if (ingredient?.ingredient_id && editSector !== ingredient.ingredient?.sector) {
      // Update the ingredient's sector in the database
      await supabase
        .from('ingredients')
        .update({ sector: editSector })
        .eq('id', ingredient.ingredient_id)
    }

    setIngredients(ingredients.map(ing => 
      ing.id === id 
        ? { 
            ...ing, 
            quantity: editQuantity || null, 
            unit: editUnit || null,
            ingredient: ing.ingredient ? { ...ing.ingredient, sector: editSector } : undefined
          }
        : ing
    ))
    setEditingIngredientId(null)
    setEditQuantity('')
    setEditUnit('')
    setEditSector('')
  }

  const handleCancelEditIngredient = () => {
    setEditingIngredientId(null)
    setEditQuantity('')
    setEditUnit('')
    setEditSector('')
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a recipe name')
      return
    }

    setSaving(true)

    try {
      let recipeId = recipe.id

      if (isCreating) {
        // Create new recipe
        const { data, error } = await supabase
          .from('recipes')
          .insert({
            name,
            instructions: instructions || null,
            image_url: imageUrl || null
          })
          .select()
          .single()

        if (error) throw error
        recipeId = data.id
      } else {
        // Update existing recipe
        const { error } = await supabase
          .from('recipes')
          .update({
            name,
            instructions: instructions || null,
            image_url: imageUrl || null
          })
          .eq('id', recipe.id)

        if (error) throw error

        // Delete existing recipe ingredients
        await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', recipe.id)
      }

      // Insert recipe ingredients
      if (ingredients.length > 0) {
        const recipeIngredients = ingredients.map(i => ({
          recipe_id: recipeId,
          ingredient_id: i.ingredient_id,
          quantity: i.quantity,
          unit: i.unit
        }))

        const { error } = await supabase
          .from('recipe_ingredients')
          .insert(recipeIngredients)

        if (error) throw error
      }

      onClose()
    } catch (error) {
      console.error('Error saving recipe:', error)
      alert('Failed to save recipe')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-down">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isCreating ? 'Create Recipe' : 'Edit Recipe'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Recipe Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recipe Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="e.g., Spaghetti Bolognese"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Image URL (optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty to use placeholder image
            </p>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Instructions (optional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Enter cooking instructions..."
            />
          </div>

          {/* Ingredients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Ingredients
            </label>

            {/* Current Ingredients */}
            {ingredients.length > 0 && (
              <div className="mb-4 space-y-2">
                {ingredients.map((ing) => (
                  <div key={ing.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {editingIngredientId === ing.id ? (
                      // Edit mode
                      <div className="space-y-2">
                        <div className="font-medium text-gray-900 dark:text-white">{ing.ingredient?.name}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            placeholder="Quantity (e.g., 2)"
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
                          />
                          <input
                            type="text"
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            placeholder="Unit (e.g., cups)"
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
                          />
                        </div>
                        <select
                          value={editSector}
                          onChange={(e) => setEditSector(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded focus:ring-2 focus:ring-primary-500"
                        >
                          {sectors.map(sector => (
                            <option key={sector.id} value={sector.name}>{sector.name}</option>
                          ))}
                        </select>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleCancelEditIngredient}
                            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEditIngredient(ing.id)}
                            className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{ing.ingredient?.name}</span>
                          {ing.quantity && (
                            <span className="text-gray-600 dark:text-gray-400 ml-2">
                              ({ing.quantity}{ing.unit || ''})
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            • {ing.ingredient?.sector}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEditIngredient(ing)}
                            className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded transition"
                            title="Edit ingredient"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveIngredient(ing.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                            title="Remove ingredient"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Ingredient Form */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Ingredient</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  placeholder="Ingredient name"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                />
                <select
                  value={newIngredientSector}
                  onChange={(e) => setNewIngredientSector(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {sectors.map(sector => (
                    <option key={sector.id} value={sector.name}>{sector.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newIngredientQuantity}
                  onChange={(e) => setNewIngredientQuantity(e.target.value)}
                  placeholder="Quantity (e.g., 500)"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                />
                <input
                  type="text"
                  value={newIngredientUnit}
                  onChange={(e) => setNewIngredientUnit(e.target.value)}
                  placeholder="Unit (e.g., g, ml)"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <button
                onClick={handleAddIngredient}
                className="w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition"
              >
                + Add Ingredient
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}
