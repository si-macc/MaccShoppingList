# Meal Planner App - Project Context

## Overview
A full-stack web application for weekly meal planning and grocery shopping, built with React/Vite frontend and Supabase backend.

## Purpose
Help users plan weekly evening meals and generate organized shopping lists based on selected recipes and staple items.

## Tech Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL database + REST API)
- **Authentication**: Single user login via Supabase Auth
- **Deployment**: Web app (mobile-first, responsive design)

## Core Features

### 1. Shopping List Generation
- Select recipes from a visual grid
- Select staple items from a list
- Generate organized shopping list by supermarket sectors
- Display as 2x3 grid layout (representing supermarket aisles)
- Check off items while shopping
- Share lists via WhatsApp/Email

### 2. Recipe Management
- View recipes with ingredients, images, and instructions
- Add/Edit/Delete recipes
- Upload recipe images or use placeholders
- Bulk upload via spreadsheet (CSV/Excel)
- Each recipe contains:
  - Name
  - Image (optional)
  - List of ingredients
  - Recipe instructions (optional)

### 3. Staples Management
- Maintain list of regular weekly items (e.g., milk)
- Mark items as "default" for auto-selection
- Add/Edit/Delete staples
- Quick selection for shopping list

### 4. Shopping List History
- Save completed shopping lists
- Archive past lists
- View historical shopping patterns

## Database Schema

### Tables

#### `recipes`
- `id` (uuid, primary key)
- `name` (text)
- `image_url` (text, nullable)
- `instructions` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `ingredients`
- `id` (uuid, primary key)
- `name` (text)
- `sector` (text) - supermarket section/aisle
- `created_at` (timestamp)

#### `recipe_ingredients`
- `id` (uuid, primary key)
- `recipe_id` (uuid, foreign key)
- `ingredient_id` (uuid, foreign key)
- `quantity` (text, nullable)
- `unit` (text, nullable)

#### `staples`
- `id` (uuid, primary key)
- `name` (text)
- `sector` (text)
- `is_default` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `shopping_lists`
- `id` (uuid, primary key)
- `name` (text)
- `created_at` (timestamp)
- `completed_at` (timestamp, nullable)

#### `shopping_list_items`
- `id` (uuid, primary key)
- `shopping_list_id` (uuid, foreign key)
- `ingredient_id` (uuid, foreign key, nullable)
- `staple_id` (uuid, foreign key, nullable)
- `item_name` (text)
- `sector` (text)
- `is_checked` (boolean)
- `quantity` (text, nullable)

#### `supermarket_sectors`
- `id` (uuid, primary key)
- `name` (text)
- `grid_row` (integer) - position in 2x3 grid
- `grid_column` (integer)
- `display_order` (integer)

## User Journey

### Creating a Shopping List
1. User lands on Shopping List page (Recipes tab)
2. Views recipe cards in a grid with ingredient summaries
3. Selects desired recipes (can quick-edit via popup)
4. Switches to Staples tab
5. Selects/deselects staples (defaults pre-selected)
6. Clicks "Generate Shopping List" button
7. Views organized shopping list in 2x3 supermarket grid layout
8. Checks off items while shopping
9. Can share list via WhatsApp/Email
10. Saves/archives completed list

### Managing Recipes
1. Navigate to Edit page
2. View all recipes
3. Add new recipe manually or bulk upload via spreadsheet
4. Edit existing recipe (name, ingredients, image, instructions)
5. Delete unwanted recipes

### Managing Staples
1. Navigate to Edit page (Staples section)
2. View all staples
3. Add new staple items
4. Mark items as "default" for auto-selection
5. Edit or delete existing staples

## Application Structure

### Pages/Routes
- `/` - Shopping List Page (default)
  - Recipes tab
  - Staples tab
  - Generated Shopping List view
- `/edit` - Edit Page
  - Recipe management section
  - Staples management section
  - Bulk upload functionality
- `/history` - Shopping List History
- `/login` - Authentication

### Key Components
- **RecipeCard** - Display recipe with image and ingredients
- **RecipeGrid** - Grid layout of recipe cards
- **RecipeEditModal** - Popup for quick recipe editing
- **StaplesList** - Selectable list of staple items
- **StapleEditModal** - Popup for staple editing
- **ShoppingListGrid** - 2x3 grid display by supermarket sectors
- **ShoppingListItem** - Individual item with checkbox
- **BulkUploadModal** - CSV/Excel upload interface
- **ShareModal** - WhatsApp/Email sharing options

## Design Guidelines
- **Mobile-first**: Optimize for phone screens
- **Responsive**: Work on tablets and desktop browsers
- **Modern & Slick**: Clean UI with smooth interactions
- **Accessible**: Proper contrast, touch targets, keyboard navigation

## Default Supermarket Layout (2x3 Grid)
```
Row 1: [Sector 1] [Sector 2] [Sector 3]
Row 2: [Sector 4] [Sector 5] [Sector 6]
```

Default sectors:
1. Fresh Produce (Fruits & Vegetables)
2. Meat & Seafood
3. Dairy & Eggs
4. Bakery & Bread
5. Pantry & Canned Goods
6. Frozen Foods

## Development Phases

### Phase 1: Foundation & Setup
- Initialize Vite + React + TypeScript project
- Set up Tailwind CSS
- Configure Supabase project
- Create database schema and migrations
- Implement authentication (single user)
- Set up routing

### Phase 2: Recipe Management
- Create Recipe CRUD operations
- Build RecipeCard and RecipeGrid components
- Implement RecipeEditModal
- Add image upload functionality
- Set up placeholder images

### Phase 3: Staples Management
- Create Staples CRUD operations
- Build StaplesList component
- Implement StapleEditModal
- Add default staples functionality

### Phase 4: Shopping List Generation
- Implement recipe/staple selection logic
- Build shopping list generation algorithm
- Create ShoppingListGrid component (2x3 layout)
- Add item grouping by sector
- Implement checkbox functionality

### Phase 5: Shopping List Features
- Add save/archive functionality
- Create shopping list history page
- Implement share via WhatsApp/Email
- Add list completion tracking

### Phase 6: Bulk Upload
- Design spreadsheet template (CSV/Excel)
- Implement CSV parser
- Create BulkUploadModal component
- Add validation and error handling

### Phase 7: Polish & Optimization
- Refine UI/UX
- Add loading states and error handling
- Optimize performance
- Mobile testing and refinement
- Add animations and transitions

## CSV/Excel Upload Format

### Recipes CSV
```csv
name,ingredients,sector,quantity,unit,instructions,image_url
"Spaghetti Bolognese","Ground Beef",Meat & Seafood,500,g,"Cook pasta...",
"Spaghetti Bolognese","Spaghetti",Pantry & Canned Goods,400,g,,
"Spaghetti Bolognese","Tomato Sauce",Pantry & Canned Goods,400,ml,,
```

### Staples CSV
```csv
name,sector,is_default
Milk,Dairy & Eggs,true
Bread,Bakery & Bread,true
Eggs,Dairy & Eggs,false
```

## Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Future Enhancements (Out of Scope for MVP)
- Multiple user support
- Configurable supermarket layouts
- Recipe serving size adjustment
- Nutritional information
- Recipe ratings and favorites
- Meal calendar/weekly planner view
- Price tracking
- Budget management
- Recipe recommendations
- Integration with online grocery delivery services

## Notes
- Single user authentication means one login credential for the app owner
- Keep initial implementation simple and focused on core functionality
- Build incrementally, testing each phase before moving to next
- Prioritize mobile experience but ensure desktop usability
- Use TypeScript for type safety throughout the application
