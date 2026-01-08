export interface Recipe {
  id: string
  name: string
  image_url: string | null
  instructions: string | null
  created_at: string
  updated_at: string
}

export interface Ingredient {
  id: string
  name: string
  sector_id: string
  sector?: SupermarketSector  // Joined data
  created_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  ingredient_id: string
  quantity: string | null
  unit: string | null
  ingredient?: Ingredient
}

export interface RecipeWithIngredients extends Recipe {
  recipe_ingredients: RecipeIngredient[]
}

export interface Staple {
  id: string
  name: string
  sector_id: string
  sector?: SupermarketSector  // Joined data
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface ShoppingList {
  id: string
  name: string
  created_at: string
  completed_at: string | null
}

export interface ShoppingListItem {
  id: string
  shopping_list_id: string
  ingredient_id: string | null
  staple_id: string | null
  item_name: string
  sector_id: string | null
  sector?: SupermarketSector  // Joined data
  is_checked: boolean
  quantity: string | null
}

export interface SupermarketSector {
  id: string
  name: string
  grid_row: number
  grid_column: number
  display_order: number
}
