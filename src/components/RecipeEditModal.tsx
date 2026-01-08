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
  const [uploading, setUploading] = useState(false)

  // New ingredient form
  const [newIngredientName, setNewIngredientName] = useState('')
  const [newIngredientSectorId, setNewIngredientSectorId] = useState('')
  const [newIngredientQuantity, setNewIngredientQuantity] = useState('')
  const [newIngredientUnit, setNewIngredientUnit] = useState('')
  
  // Existing ingredient selection
  const [selectedExistingIngredient, setSelectedExistingIngredient] = useState('')
  const [existingIngredientQuantity, setExistingIngredientQuantity] = useState('')
  const [existingIngredientUnit, setExistingIngredientUnit] = useState('')

  // Edit ingredient state
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editSectorId, setEditSectorId] = useState('')

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
      if (data.length > 0 && !newIngredientSectorId) {
        setNewIngredientSectorId(data[0].id)
      }
    }
  }

  const fetchIngredients = async () => {
    const { data, error } = await supabase
      .from('ingredients')
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
          sector_id: newIngredientSectorId
        })
        .select(`
          *,
          sector:supermarket_sectors (
            id,
            name,
            display_order
          )
        `)
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

  const handleAddExistingIngredient = () => {
    if (!selectedExistingIngredient) return

    const ingredient = availableIngredients.find(i => i.id === selectedExistingIngredient)
    if (!ingredient) return

    // Check if already added
    if (ingredients.some(i => i.ingredient_id === ingredient.id)) {
      alert('This ingredient is already in the recipe')
      return
    }

    const newRecipeIngredient: RecipeIngredient = {
      id: `temp-${Date.now()}`,
      recipe_id: recipe.id,
      ingredient_id: ingredient.id,
      quantity: existingIngredientQuantity || null,
      unit: existingIngredientUnit || null,
      ingredient: ingredient
    }

    setIngredients([...ingredients, newRecipeIngredient])
    
    // Reset form
    setSelectedExistingIngredient('')
    setExistingIngredientQuantity('')
    setExistingIngredientUnit('')
  }

  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}` // Upload to bucket root, not in subfolder

      console.log('Uploading to path:', filePath)

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recipe-photos')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        if (uploadError.message.includes('Bucket not found')) {
          alert('Storage bucket not found. Please create a public bucket named "recipe-photos" in your Supabase project:\n\n1. Go to Supabase Dashboard → Storage\n2. Click "New bucket"\n3. Name it "recipe-photos"\n4. Make it Public\n5. Click "Create bucket"')
        } else if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
          alert('Storage permissions not configured. Please add storage policies in Supabase:\n\n1. Go to Storage → recipe-photos → Policies\n2. Add INSERT policy for authenticated users\n3. Add SELECT policy for public access\n\nOr run this SQL:\n\nCREATE POLICY "Allow authenticated uploads"\nON storage.objects FOR INSERT TO authenticated\nWITH CHECK (bucket_id = \'recipe-photos\');\n\nCREATE POLICY "Allow public reads"\nON storage.objects FOR SELECT\nUSING (bucket_id = \'recipe-photos\');')
        } else {
          alert(`Failed to upload image: ${uploadError.message}`)
        }
        throw uploadError
      }

      console.log('Upload successful:', uploadData)

      // Try to get public URL first
      const { data: urlData } = supabase.storage
        .from('recipe-photos')
        .getPublicUrl(uploadData.path)

      console.log('Public URL:', urlData.publicUrl)
      
      // Verify the URL works by testing it
      try {
        const testResponse = await fetch(urlData.publicUrl, { method: 'HEAD' })
        if (testResponse.ok) {
          setImageUrl(urlData.publicUrl)
        } else {
          // If public URL doesn't work, try signed URL (for private buckets)
          console.log('Public URL failed, trying signed URL')
          const { data: signedData, error: signedError } = await supabase.storage
            .from('recipe-photos')
            .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365) // 1 year
          
          if (signedError) throw signedError
          if (signedData) {
            setImageUrl(signedData.signedUrl)
          }
        }
      } catch (error) {
        console.error('Error verifying URL:', error)
        setImageUrl(urlData.publicUrl) // Try it anyway
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleStartEditIngredient = (ing: RecipeIngredient) => {
    setEditingIngredientId(ing.id)
    setEditQuantity(ing.quantity || '')
    setEditUnit(ing.unit || '')
    setEditSectorId(ing.ingredient?.sector_id || '')
  }

  const handleSaveEditIngredient = async (id: string) => {
    const ingredient = ingredients.find(ing => ing.id === id)
    if (ingredient?.ingredient_id && editSectorId !== ingredient.ingredient?.sector_id) {
      // Update the ingredient's sector_id in the database
      await supabase
        .from('ingredients')
        .update({ sector_id: editSectorId })
        .eq('id', ingredient.ingredient_id)
    }

    // Find the sector object for display
    const newSector = sectors.find(s => s.id === editSectorId)

    setIngredients(ingredients.map(ing => 
      ing.id === id 
        ? { 
            ...ing, 
            quantity: editQuantity || null, 
            unit: editUnit || null,
            ingredient: ing.ingredient ? { ...ing.ingredient, sector_id: editSectorId, sector: newSector } : undefined
          }
        : ing
    ))
    setEditingIngredientId(null)
    setEditQuantity('')
    setEditUnit('')
    setEditSectorId('')
  }

  const handleCancelEditIngredient = () => {
    setEditingIngredientId(null)
    setEditQuantity('')
    setEditUnit('')
    setEditSectorId('')
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
              Recipe Image (optional)
            </label>
            
            {/* Image Preview */}
            {imageUrl && (
              <div className="mb-3 relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img
                  src={imageUrl}
                  alt="Recipe preview"
                  className="w-full h-full object-cover"
                  onLoad={() => console.log('Image loaded successfully:', imageUrl)}
                  onError={(e) => {
                    console.error('Failed to load image:', imageUrl)
                    console.error('Check if file exists at:', imageUrl)
                    // Try to fetch and see the actual error
                    fetch(imageUrl).then(r => console.log('Fetch response:', r.status, r.statusText)).catch(err => console.error('Fetch error:', err))
                    e.currentTarget.src = 'https://placehold.co/400x300/22c55e/ffffff?text=Image+Load+Error'
                  }}
                />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                  title="Remove image"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex gap-2">
              {/* Upload Button */}
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer text-center">
                  {uploading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    <span>📷 Upload Photo</span>
                  )}
                </div>
              </label>

              {/* OR separator and URL input */}
              <span className="flex items-center text-gray-500 dark:text-gray-400 text-sm">or</span>
            </div>

            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="mt-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Or paste image URL"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Upload a photo or provide an image URL. Max 5MB.
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
                          value={editSectorId}
                          onChange={(e) => setEditSectorId(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded focus:ring-2 focus:ring-primary-500"
                        >
                          {sectors.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
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
                            • {ing.ingredient?.sector?.name || 'Other'}
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

            {/* Add Existing Ingredient */}
            {availableIngredients.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Existing Ingredient</p>
                
                <select
                  value={selectedExistingIngredient}
                  onChange={(e) => setSelectedExistingIngredient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select an ingredient...</option>
                  {availableIngredients
                    .filter(ing => !ingredients.some(i => i.ingredient_id === ing.id))
                    .map(ing => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.sector?.name || 'Other'})
                      </option>
                    ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={existingIngredientQuantity}
                    onChange={(e) => setExistingIngredientQuantity(e.target.value)}
                    placeholder="Quantity (e.g., 500)"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <input
                    type="text"
                    value={existingIngredientUnit}
                    onChange={(e) => setExistingIngredientUnit(e.target.value)}
                    placeholder="Unit (e.g., g, ml)"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <button
                  onClick={handleAddExistingIngredient}
                  disabled={!selectedExistingIngredient}
                  className="w-full py-2 bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Selected Ingredient
                </button>
              </div>
            )}

            {/* Add New Ingredient Form */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add New Ingredient</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  placeholder="Ingredient name"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                />
                <select
                  value={newIngredientSectorId}
                  onChange={(e) => setNewIngredientSectorId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {sectors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
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
