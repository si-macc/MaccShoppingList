-- Migration: Normalize sector references to use sector_id instead of sector name
-- This improves data integrity - sector names can be changed in one place

-- Step 1: Add sector_id columns to tables that reference sectors
ALTER TABLE ingredients ADD COLUMN sector_id UUID;
ALTER TABLE staples ADD COLUMN sector_id UUID;
ALTER TABLE shopping_list_items ADD COLUMN sector_id UUID;

-- Step 2: Populate sector_id based on existing sector names
UPDATE ingredients i
SET sector_id = s.id
FROM supermarket_sectors s
WHERE i.sector = s.name;

UPDATE staples st
SET sector_id = s.id
FROM supermarket_sectors s
WHERE st.sector = s.name;

UPDATE shopping_list_items sli
SET sector_id = s.id
FROM supermarket_sectors s
WHERE sli.sector = s.name;

-- Step 3: Handle any orphaned records (sectors that don't exist in supermarket_sectors)
-- First, let's see what orphaned sectors exist (run this to check):
-- SELECT DISTINCT sector FROM ingredients WHERE sector_id IS NULL;
-- SELECT DISTINCT sector FROM staples WHERE sector_id IS NULL;

-- Create missing sectors if needed (example - adjust based on what you find):
-- INSERT INTO supermarket_sectors (name, grid_row, grid_column, display_order)
-- SELECT DISTINCT sector, 1, 1, 99 FROM ingredients WHERE sector_id IS NULL;

-- After creating missing sectors, re-run the updates above

-- Step 4: Add foreign key constraints (run after all sector_id values are populated)
-- NOTE: Only run these after confirming all sector_id values are NOT NULL
-- ALTER TABLE ingredients ADD CONSTRAINT fk_ingredients_sector 
--   FOREIGN KEY (sector_id) REFERENCES supermarket_sectors(id);
-- ALTER TABLE staples ADD CONSTRAINT fk_staples_sector 
--   FOREIGN KEY (sector_id) REFERENCES supermarket_sectors(id);
-- ALTER TABLE shopping_list_items ADD CONSTRAINT fk_shopping_list_items_sector 
--   FOREIGN KEY (sector_id) REFERENCES supermarket_sectors(id);

-- Step 5: Make sector_id NOT NULL (run after confirming all values are populated)
-- ALTER TABLE ingredients ALTER COLUMN sector_id SET NOT NULL;
-- ALTER TABLE staples ALTER COLUMN sector_id SET NOT NULL;
-- Note: shopping_list_items.sector_id can stay nullable for backwards compatibility

-- Step 6: Drop the old sector text columns (run after frontend is updated and tested)
-- ALTER TABLE ingredients DROP COLUMN sector;
-- ALTER TABLE staples DROP COLUMN sector;
-- ALTER TABLE shopping_list_items DROP COLUMN sector;

-- Useful queries for verification:
-- Check for null sector_ids:
-- SELECT 'ingredients' as tbl, COUNT(*) as null_count FROM ingredients WHERE sector_id IS NULL
-- UNION ALL
-- SELECT 'staples', COUNT(*) FROM staples WHERE sector_id IS NULL
-- UNION ALL  
-- SELECT 'shopping_list_items', COUNT(*) FROM shopping_list_items WHERE sector_id IS NULL;
