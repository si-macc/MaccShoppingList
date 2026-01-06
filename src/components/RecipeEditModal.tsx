import { useState, useEffect } from 'react'
import { RecipeWithIngredients, Ingredient, RecipeIngredient } from '../types'
import { supabase } from '../lib/supabase'

interface RecipeEditModalProps {
  recipe: RecipeWithIngredients
  isCreating: boolean
  onClose: () => void
}

const SECTORS = [
  'Fresh Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery & Bread',
  'Pantry & Canned Goods',
  'Frozen Foods'
]

export default function RecipeEditModal({ recipe, isCreating, onClose }: RecipeEditModalProps) {
  const [name, setName] = useState(recipe.name)
  const [instructions, setInstructions] = useState(recipe.instructions || '')
  const [imageUrl, setImageUrl] = useState(recipe.image_url || '')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe.recipe_ingredients)
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
  const [saving, setSaving] = useState(false)

  // New ingredient form
  const [newIngredientName, setNewIngredientName] = useState('')
  const [newIngredientSector, setNewIngredientSector] = useState(SECTORS[0])
  const [newIngredientQuantity, setNewIngredientQuantity] = useState('')
  const [newIngredientUnit, setNewIngredientUnit] = useState('')

  useEffect(() => {
    fetchIngredients()
  }, [])

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
                  <div key={ing.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
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
                    <button
                      onClick={() => handleRemoveIngredient(ing.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                    >
                      Remove
                    </button>
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
                  {SECTORS.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
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
