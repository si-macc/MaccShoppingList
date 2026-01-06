import { RecipeWithIngredients } from '../types'

interface RecipeSelectionCardProps {
  recipe: RecipeWithIngredients
  isSelected: boolean
  onToggle: () => void
}

export default function RecipeSelectionCard({ recipe, isSelected, onToggle }: RecipeSelectionCardProps) {
  const placeholderImage = 'https://via.placeholder.com/400x300/22c55e/ffffff?text=Recipe'

  return (
    <div
      onClick={onToggle}
      className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all ${
        isSelected 
          ? 'ring-4 ring-primary-500 shadow-lg' 
          : 'hover:shadow-lg hover:scale-105'
      }`}
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-200">
        <img
          src={recipe.image_url || placeholderImage}
          alt={recipe.name}
          className="w-full h-full object-cover"
        />
        {isSelected && (
          <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
            ✓
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{recipe.name}</h3>
        
        {recipe.recipe_ingredients.length > 0 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Ingredients:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {recipe.recipe_ingredients.slice(0, 3).map((ri) => (
                <li key={ri.id} className="flex items-start">
                  <span className="text-primary-600 mr-2">•</span>
                  <span>{ri.ingredient?.name}</span>
                </li>
              ))}
              {recipe.recipe_ingredients.length > 3 && (
                <li className="text-gray-400 text-xs">
                  +{recipe.recipe_ingredients.length - 3} more...
                </li>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No ingredients</p>
        )}
      </div>
    </div>
  )
}
