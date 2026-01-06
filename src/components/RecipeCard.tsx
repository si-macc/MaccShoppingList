import { RecipeWithIngredients } from '../types'

interface RecipeCardProps {
  recipe: RecipeWithIngredients
  onEdit: (recipe: RecipeWithIngredients) => void
  onDelete: (id: string) => void
}

export default function RecipeCard({ recipe, onEdit, onDelete }: RecipeCardProps) {
  const placeholderImage = 'https://via.placeholder.com/400x300/22c55e/ffffff?text=Recipe'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 animate-fade-in hover:scale-[1.02]">
      {/* Image */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
        <img
          src={recipe.image_url || placeholderImage}
          alt={recipe.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 flex space-x-2">
          <button
            onClick={() => onEdit(recipe)}
            className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            title="Edit recipe"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(recipe.id)}
            className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-900/50 transition"
            title="Delete recipe"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{recipe.name}</h3>
        
        {recipe.recipe_ingredients.length > 0 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Ingredients:</p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {recipe.recipe_ingredients.slice(0, 4).map((ri) => (
                <li key={ri.id} className="flex items-start">
                  <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
                  <span>
                    {ri.ingredient?.name}
                    {ri.quantity && ` (${ri.quantity}${ri.unit || ''})`}
                  </span>
                </li>
              ))}
              {recipe.recipe_ingredients.length > 4 && (
                <li className="text-gray-400 dark:text-gray-500 text-xs">
                  +{recipe.recipe_ingredients.length - 4} more...
                </li>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">No ingredients added</p>
        )}
      </div>
    </div>
  )
}
