import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { UploadIcon } from './Icons'

interface SettingsModalProps {
  onClose: () => void
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const recipeFileRef = useRef<HTMLInputElement>(null)
  const stapleFileRef = useRef<HTMLInputElement>(null)

  // Export Recipes to CSV
  const exportRecipes = async () => {
    setLoading('export-recipes')
    setMessage(null)
    try {
      // Fetch recipes with ingredients
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (
            id,
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

      if (error) throw error

      // Build CSV content - one row per recipe-ingredient combination
      const rows: string[] = []
      rows.push('recipe_name,recipe_image_url,recipe_instructions,ingredient_name,ingredient_sector,quantity,unit')

      for (const recipe of recipes || []) {
        if (recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0) {
          for (const ri of recipe.recipe_ingredients) {
            rows.push([
              escapeCsv(recipe.name),
              escapeCsv(recipe.image_url || ''),
              escapeCsv(recipe.instructions || ''),
              escapeCsv(ri.ingredient?.name || ''),
              escapeCsv(ri.ingredient?.sector || ''),
              escapeCsv(ri.quantity || ''),
              escapeCsv(ri.unit || '')
            ].join(','))
          }
        } else {
          // Recipe with no ingredients
          rows.push([
            escapeCsv(recipe.name),
            escapeCsv(recipe.image_url || ''),
            escapeCsv(recipe.instructions || ''),
            '', '', '', ''
          ].join(','))
        }
      }

      downloadCsv(rows.join('\n'), `recipes-export-${new Date().toISOString().split('T')[0]}.csv`)
      setMessage({ type: 'success', text: `Exported ${recipes?.length || 0} recipes` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to export recipes' })
    } finally {
      setLoading(null)
    }
  }

  // Export Staples to CSV
  const exportStaples = async () => {
    setLoading('export-staples')
    setMessage(null)
    try {
      const { data: staples, error } = await supabase
        .from('staples')
        .select('*')
        .order('name')

      if (error) throw error

      const rows: string[] = []
      rows.push('name,sector,is_default')

      for (const staple of staples || []) {
        rows.push([
          escapeCsv(staple.name),
          escapeCsv(staple.sector),
          staple.is_default ? 'true' : 'false'
        ].join(','))
      }

      downloadCsv(rows.join('\n'), `staples-export-${new Date().toISOString().split('T')[0]}.csv`)
      setMessage({ type: 'success', text: `Exported ${staples?.length || 0} staples` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to export staples' })
    } finally {
      setLoading(null)
    }
  }

  // Import Recipes from CSV
  const importRecipes = async (file: File) => {
    setLoading('import-recipes')
    setMessage(null)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows')
      }

      // Parse header
      const header = parseCsvLine(lines[0])
      const requiredCols = ['recipe_name', 'ingredient_name', 'ingredient_sector']
      for (const col of requiredCols) {
        if (!header.includes(col)) {
          throw new Error(`Missing required column: ${col}`)
        }
      }

      const colIndex = (name: string) => header.indexOf(name)

      // Group by recipe name
      const recipeMap = new Map<string, {
        name: string
        image_url: string | null
        instructions: string | null
        ingredients: { name: string; sector: string; quantity: string | null; unit: string | null }[]
      }>()

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i])
        const recipeName = values[colIndex('recipe_name')]?.trim()
        
        if (!recipeName) continue

        if (!recipeMap.has(recipeName)) {
          recipeMap.set(recipeName, {
            name: recipeName,
            image_url: values[colIndex('recipe_image_url')]?.trim() || null,
            instructions: values[colIndex('recipe_instructions')]?.trim() || null,
            ingredients: []
          })
        }

        const ingredientName = values[colIndex('ingredient_name')]?.trim()
        if (ingredientName) {
          recipeMap.get(recipeName)!.ingredients.push({
            name: ingredientName,
            sector: values[colIndex('ingredient_sector')]?.trim() || 'Other',
            quantity: values[colIndex('quantity')]?.trim() || null,
            unit: values[colIndex('unit')]?.trim() || null
          })
        }
      }

      let importedCount = 0
      let updatedCount = 0

      for (const recipe of recipeMap.values()) {
        // Check if recipe exists
        const { data: existing } = await supabase
          .from('recipes')
          .select(`
            id,
            image_url,
            instructions,
            recipe_ingredients (
              id,
              quantity,
              unit,
              ingredient:ingredients (
                id,
                name,
                sector
              )
            )
          `)
          .eq('name', recipe.name)
          .maybeSingle()

        if (existing) {
          // Check if recipe needs updating
          let needsUpdate = false

          // Check if image_url or instructions changed
          if (recipe.image_url !== existing.image_url || recipe.instructions !== existing.instructions) {
            needsUpdate = true
            await supabase
              .from('recipes')
              .update({ image_url: recipe.image_url, instructions: recipe.instructions })
              .eq('id', existing.id)
          }

          // Get current ingredients from DB
          const currentIngredients = (existing.recipe_ingredients || []).map((ri: any) => ({
            name: ri.ingredient?.name || '',
            sector: ri.ingredient?.sector || '',
            quantity: ri.quantity || null,
            unit: ri.unit || null,
            recipeIngredientId: ri.id,
            ingredientId: ri.ingredient?.id
          }))

          // Compare ingredients
          const csvIngredientKeys = recipe.ingredients.map(i => 
            `${i.name}|${i.sector}|${i.quantity || ''}|${i.unit || ''}`
          ).sort()
          const dbIngredientKeys = currentIngredients.map((i: any) => 
            `${i.name}|${i.sector}|${i.quantity || ''}|${i.unit || ''}`
          ).sort()

          const ingredientsMatch = 
            csvIngredientKeys.length === dbIngredientKeys.length &&
            csvIngredientKeys.every((key, idx) => key === dbIngredientKeys[idx])

          if (!ingredientsMatch) {
            needsUpdate = true

            // Delete existing recipe_ingredients
            await supabase
              .from('recipe_ingredients')
              .delete()
              .eq('recipe_id', existing.id)

            // Add new ingredients from CSV
            for (const ing of recipe.ingredients) {
              // Find or create ingredient, and update sector if changed
              let { data: ingredient } = await supabase
                .from('ingredients')
                .select('id, sector')
                .eq('name', ing.name)
                .maybeSingle()

              if (!ingredient) {
                const { data: newIng, error: ingError } = await supabase
                  .from('ingredients')
                  .insert({ name: ing.name, sector: ing.sector })
                  .select()
                  .single()
                if (ingError) throw ingError
                ingredient = newIng
              } else if (ingredient.sector !== ing.sector) {
                // Update sector if it changed
                await supabase
                  .from('ingredients')
                  .update({ sector: ing.sector })
                  .eq('id', ingredient.id)
              }

              if (!ingredient) continue

              // Link to recipe
              await supabase
                .from('recipe_ingredients')
                .insert({
                  recipe_id: existing.id,
                  ingredient_id: ingredient.id,
                  quantity: ing.quantity,
                  unit: ing.unit
                })
            }
          }

          if (needsUpdate) {
            updatedCount++
          }
          continue
        }

        // Create recipe
        const { data: newRecipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({ name: recipe.name, image_url: recipe.image_url, instructions: recipe.instructions })
          .select()
          .single()

        if (recipeError) throw recipeError

        // Add ingredients
        for (const ing of recipe.ingredients) {
          // Find or create ingredient, and update sector if changed
          let { data: ingredient } = await supabase
            .from('ingredients')
            .select('id, sector')
            .eq('name', ing.name)
            .maybeSingle()

          if (!ingredient) {
            const { data: newIng, error: ingError } = await supabase
              .from('ingredients')
              .insert({ name: ing.name, sector: ing.sector })
              .select()
              .single()
            if (ingError) throw ingError
            ingredient = newIng
          } else if (ingredient.sector !== ing.sector) {
            // Update sector if it changed
            await supabase
              .from('ingredients')
              .update({ sector: ing.sector })
              .eq('id', ingredient.id)
          }

          if (!ingredient) continue

          // Link to recipe
          await supabase
            .from('recipe_ingredients')
            .insert({
              recipe_id: newRecipe.id,
              ingredient_id: ingredient.id,
              quantity: ing.quantity,
              unit: ing.unit
            })
        }

        importedCount++
      }

      const messages = []
      if (importedCount > 0) messages.push(`${importedCount} new`)
      if (updatedCount > 0) messages.push(`${updatedCount} updated`)
      if (messages.length === 0) messages.push('No changes needed')
      setMessage({ type: 'success', text: `Recipes: ${messages.join(', ')}` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to import recipes' })
    } finally {
      setLoading(null)
      if (recipeFileRef.current) recipeFileRef.current.value = ''
    }
  }

  // Import Staples from CSV
  const importStaples = async (file: File) => {
    setLoading('import-staples')
    setMessage(null)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows')
      }

      const header = parseCsvLine(lines[0])
      const requiredCols = ['name', 'sector']
      for (const col of requiredCols) {
        if (!header.includes(col)) {
          throw new Error(`Missing required column: ${col}`)
        }
      }

      const colIndex = (name: string) => header.indexOf(name)

      let importedCount = 0
      let updatedCount = 0

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i])
        const name = values[colIndex('name')]?.trim()
        const sector = values[colIndex('sector')]?.trim()
        const isDefault = values[colIndex('is_default')]?.trim().toLowerCase() === 'true'

        if (!name || !sector) continue

        // Check if exists
        const { data: existing } = await supabase
          .from('staples')
          .select('id, sector, is_default')
          .eq('name', name)
          .maybeSingle()

        if (existing) {
          // Check if anything changed
          if (existing.sector !== sector || existing.is_default !== isDefault) {
            const { error } = await supabase
              .from('staples')
              .update({ sector, is_default: isDefault })
              .eq('id', existing.id)
            if (error) throw error
            updatedCount++
          }
          continue
        }

        const { error } = await supabase
          .from('staples')
          .insert({ name, sector, is_default: isDefault })

        if (error) throw error
        importedCount++
      }

      const messages = []
      if (importedCount > 0) messages.push(`${importedCount} new`)
      if (updatedCount > 0) messages.push(`${updatedCount} updated`)
      if (messages.length === 0) messages.push('No changes needed')
      setMessage({ type: 'success', text: `Staples: ${messages.join(', ')}` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to import staples' })
    } finally {
      setLoading(null)
      if (stapleFileRef.current) stapleFileRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            }`}>
              {message.text}
            </div>
          )}

          {/* Recipes Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recipes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Export recipes and ingredients to CSV for backup, or import from a CSV file.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportRecipes}
                disabled={loading !== null}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {loading === 'export-recipes' ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                <span>Export Recipes</span>
              </button>
              
              <label className={`flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition cursor-pointer ${loading !== null ? 'opacity-50 pointer-events-none' : ''}`}>
                {loading === 'import-recipes' ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <UploadIcon className="w-4 h-4" />
                )}
                <span>Import Recipes</span>
                <input
                  ref={recipeFileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && importRecipes(e.target.files[0])}
                  disabled={loading !== null}
                />
              </label>
            </div>
          </div>

          {/* Staples Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Staples</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Export staples to CSV for backup, or import from a CSV file.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportStaples}
                disabled={loading !== null}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {loading === 'export-staples' ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                <span>Export Staples</span>
              </button>
              
              <label className={`flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition cursor-pointer ${loading !== null ? 'opacity-50 pointer-events-none' : ''}`}>
                {loading === 'import-staples' ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <UploadIcon className="w-4 h-4" />
                )}
                <span>Import Staples</span>
                <input
                  ref={stapleFileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && importStaples(e.target.files[0])}
                  disabled={loading !== null}
                />
              </label>
            </div>
          </div>

          {/* CSV Format Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">CSV Format Info</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>Recipes CSV columns:</strong><br />
                recipe_name, recipe_image_url, recipe_instructions, ingredient_name, ingredient_sector, quantity, unit
              </p>
              <p><strong>Staples CSV columns:</strong><br />
                name, sector, is_default
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current)
  return result
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
