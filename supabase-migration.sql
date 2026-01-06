-- Meal Planner Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create supermarket_sectors table
CREATE TABLE supermarket_sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  grid_row INTEGER NOT NULL,
  grid_column INTEGER NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create ingredients table
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create recipe_ingredients junction table
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity TEXT,
  unit TEXT,
  UNIQUE(recipe_id, ingredient_id)
);

-- Create staples table
CREATE TABLE staples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create shopping_lists table
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create shopping_list_items table
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  staple_id UUID REFERENCES staples(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  quantity TEXT
);

-- Create indexes for better query performance
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_shopping_list_items_list ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_lists_completed ON shopping_lists(completed_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staples_updated_at BEFORE UPDATE ON staples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default supermarket sectors (2x3 grid)
INSERT INTO supermarket_sectors (name, grid_row, grid_column, display_order) VALUES
  ('Fresh Produce', 1, 1, 1),
  ('Meat & Seafood', 1, 2, 2),
  ('Dairy & Eggs', 1, 3, 3),
  ('Bakery & Bread', 2, 1, 4),
  ('Pantry & Canned Goods', 2, 2, 5),
  ('Frozen Foods', 2, 3, 6);

-- Enable Row Level Security (RLS)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE staples ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supermarket_sectors ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (single user app)
-- Allow all operations for authenticated users

-- Recipes policies
CREATE POLICY "Allow all for authenticated users" ON recipes
  FOR ALL USING (auth.role() = 'authenticated');

-- Ingredients policies
CREATE POLICY "Allow all for authenticated users" ON ingredients
  FOR ALL USING (auth.role() = 'authenticated');

-- Recipe ingredients policies
CREATE POLICY "Allow all for authenticated users" ON recipe_ingredients
  FOR ALL USING (auth.role() = 'authenticated');

-- Staples policies
CREATE POLICY "Allow all for authenticated users" ON staples
  FOR ALL USING (auth.role() = 'authenticated');

-- Shopping lists policies
CREATE POLICY "Allow all for authenticated users" ON shopping_lists
  FOR ALL USING (auth.role() = 'authenticated');

-- Shopping list items policies
CREATE POLICY "Allow all for authenticated users" ON shopping_list_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Supermarket sectors policies (read-only for all authenticated users)
CREATE POLICY "Allow read for authenticated users" ON supermarket_sectors
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insert some sample data for testing
INSERT INTO ingredients (name, sector) VALUES
  ('Tomatoes', 'Fresh Produce'),
  ('Lettuce', 'Fresh Produce'),
  ('Chicken Breast', 'Meat & Seafood'),
  ('Salmon Fillet', 'Meat & Seafood'),
  ('Milk', 'Dairy & Eggs'),
  ('Eggs', 'Dairy & Eggs'),
  ('Bread', 'Bakery & Bread'),
  ('Pasta', 'Pantry & Canned Goods'),
  ('Rice', 'Pantry & Canned Goods'),
  ('Frozen Peas', 'Frozen Foods');

INSERT INTO staples (name, sector, is_default) VALUES
  ('Milk', 'Dairy & Eggs', true),
  ('Bread', 'Bakery & Bread', true),
  ('Eggs', 'Dairy & Eggs', true),
  ('Butter', 'Dairy & Eggs', false),
  ('Coffee', 'Pantry & Canned Goods', false);

-- Sample recipe
INSERT INTO recipes (name, instructions) VALUES
  ('Simple Salad', 'Chop lettuce and tomatoes, mix together with dressing.');

-- Link ingredients to the sample recipe
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
SELECT 
  (SELECT id FROM recipes WHERE name = 'Simple Salad'),
  id,
  CASE name
    WHEN 'Lettuce' THEN '1'
    WHEN 'Tomatoes' THEN '2'
  END,
  CASE name
    WHEN 'Lettuce' THEN 'head'
    WHEN 'Tomatoes' THEN 'whole'
  END
FROM ingredients
WHERE name IN ('Lettuce', 'Tomatoes');
