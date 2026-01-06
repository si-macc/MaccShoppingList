import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface BulkUploadModalProps {
  type: 'recipes' | 'staples'
  onClose: () => void
}

export default function BulkUploadModal({ type, onClose }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('Please select a valid CSV file')
      setFile(null)
    }
  }

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n')
    return lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const values: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim())
        return values
      })
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      
      if (rows.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row')
      }

      const headers = rows[0].map(h => h.toLowerCase())
      const dataRows = rows.slice(1)

      if (type === 'recipes') {
        await uploadRecipes(headers, dataRows)
      } else {
        await uploadStaples(headers, dataRows)
      }

      setSuccess(`Successfully uploaded ${dataRows.length} ${type}!`)
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const uploadRecipes = async (headers: string[], rows: string[][]) => {
    const nameIdx = headers.indexOf('name')
    const ingredientIdx = headers.indexOf('ingredients')
    const sectorIdx = headers.indexOf('sector')
    const quantityIdx = headers.indexOf('quantity')
    const unitIdx = headers.indexOf('unit')
    const instructionsIdx = headers.indexOf('instructions')
    const imageIdx = headers.indexOf('image_url')

    if (nameIdx === -1 || ingredientIdx === -1 || sectorIdx === -1) {
      throw new Error('CSV must have columns: name, ingredients, sector')
    }

    const recipeMap = new Map<string, any>()

    for (const row of rows) {
      const recipeName = row[nameIdx]
      const ingredientName = row[ingredientIdx]
      const sector = row[sectorIdx]
      const quantity = quantityIdx !== -1 ? row[quantityIdx] : null
      const unit = unitIdx !== -1 ? row[unitIdx] : null
      const instructions = instructionsIdx !== -1 ? row[instructionsIdx] : null
      const imageUrl = imageIdx !== -1 ? row[imageIdx] : null

      if (!recipeMap.has(recipeName)) {
        recipeMap.set(recipeName, {
          name: recipeName,
          instructions,
          image_url: imageUrl,
          ingredients: []
        })
      }

      recipeMap.get(recipeName).ingredients.push({
        name: ingredientName,
        sector,
        quantity,
        unit
      })
    }

    for (const recipeData of recipeMap.values()) {
      // Create or get recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: recipeData.name,
          instructions: recipeData.instructions,
          image_url: recipeData.image_url
        })
        .select()
        .single()

      if (recipeError) throw recipeError

      // Create or get ingredients and link them
      for (const ing of recipeData.ingredients) {
        let { data: ingredient } = await supabase
          .from('ingredients')
          .select()
          .eq('name', ing.name)
          .single()

        if (!ingredient) {
          const { data: newIng, error: ingError } = await supabase
            .from('ingredients')
            .insert({ name: ing.name, sector: ing.sector })
            .select()
            .single()

          if (ingError) throw ingError
          ingredient = newIng
        }

        await supabase
          .from('recipe_ingredients')
          .insert({
            recipe_id: recipe.id,
            ingredient_id: ingredient.id,
            quantity: ing.quantity,
            unit: ing.unit
          })
      }
    }
  }

  const uploadStaples = async (headers: string[], rows: string[][]) => {
    const nameIdx = headers.indexOf('name')
    const sectorIdx = headers.indexOf('sector')
    const isDefaultIdx = headers.indexOf('is_default')

    if (nameIdx === -1 || sectorIdx === -1) {
      throw new Error('CSV must have columns: name, sector')
    }

    const staples = rows.map(row => ({
      name: row[nameIdx],
      sector: row[sectorIdx],
      is_default: isDefaultIdx !== -1 ? row[isDefaultIdx].toLowerCase() === 'true' : false
    }))

    const { error } = await supabase
      .from('staples')
      .insert(staples)

    if (error) throw error
  }

  const exampleCSV = type === 'recipes'
    ? `name,ingredients,sector,quantity,unit,instructions,image_url
"Spaghetti Bolognese","Ground Beef","Meat & Seafood",500,g,"Cook pasta...",
"Spaghetti Bolognese","Spaghetti","Pantry & Canned Goods",400,g,,
"Spaghetti Bolognese","Tomato Sauce","Pantry & Canned Goods",400,ml,,`
    : `name,sector,is_default
Milk,"Dairy & Eggs",true
Bread,"Bakery & Bread",true
Eggs,"Dairy & Eggs",false`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-down">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bulk Upload {type === 'recipes' ? 'Recipes' : 'Staples'}
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
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">CSV Format</h3>
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
              Upload a CSV file with the following format:
            </p>
            <pre className="bg-white dark:bg-gray-900 p-3 rounded border border-blue-200 dark:border-blue-800 text-xs overflow-x-auto text-gray-800 dark:text-gray-200">
              {exampleCSV}
            </pre>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary-50 dark:file:bg-primary-900 file:text-primary-700 dark:file:text-primary-300"
            />
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}
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
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
