-- Migration: Add shopping_list_recipes and shopping_list_staples junction tables
-- This tracks which recipes and staples were used to create a shopping list

-- Create shopping_list_recipes junction table
CREATE TABLE IF NOT EXISTS shopping_list_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(shopping_list_id, recipe_id)
);

-- Create shopping_list_staples junction table
CREATE TABLE IF NOT EXISTS shopping_list_staples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  staple_id UUID NOT NULL REFERENCES staples(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(shopping_list_id, staple_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shopping_list_recipes_list ON shopping_list_recipes(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_recipes_recipe ON shopping_list_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_staples_list ON shopping_list_staples(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_staples_staple ON shopping_list_staples(staple_id);
