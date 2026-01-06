import { RecipeWithIngredients } from '../types'
import RecipeCard from './RecipeCard'

interface RecipeGridProps {
  recipes: RecipeWithIngredients[]
  onEdit: (recipe: RecipeWithIngredients) => void
  onDelete: (id: string) => void
}

export default function RecipeGrid({ recipes, onEdit, onDelete }: RecipeGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
