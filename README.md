# Meal Planner App

A full-stack web application for weekly meal planning and grocery shopping, built with React, Vite, TypeScript, Tailwind CSS, and Supabase.

## Features

- 📋 **Shopping List Generation** - Select recipes and staples to generate organized shopping lists
- 🍽️ **Recipe Management** - Add, edit, and manage your favorite recipes
- 🛒 **Smart Organization** - Shopping lists organized by supermarket layout (2x3 grid)
- ✅ **Interactive Shopping** - Check off items as you shop
- 📤 **Share Lists** - Share shopping lists via WhatsApp or Email
- 📊 **Shopping History** - View and archive past shopping lists
- 📥 **Bulk Upload** - Import recipes and staples via CSV/Excel

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + REST API)
- **Authentication**: Supabase Auth
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works great)

### Installation

1. **Clone or navigate to the project directory**

2. **Create directory structure**
   ```bash
   .\create-dirs.bat
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up Supabase**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Wait for the database to be provisioned
   - Go to Settings > API and copy your project URL and anon key
   
5. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

6. **Run database migration**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase-migration.sql`
   - Click "Run" to create all tables and seed data

7. **Create a user account**
   - In Supabase dashboard, go to Authentication > Users
   - Click "Add user" and create your login credentials
   - Or enable email authentication and sign up through the app

8. **Start the development server**
   ```bash
   npm run dev
   ```

The app will open at http://localhost:3000

## Project Structure

```
meal-planner-app/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable React components
│   ├── pages/          # Page components (routes)
│   ├── lib/            # Supabase client and utilities
│   ├── types/          # TypeScript type definitions
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Helper functions
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # App entry point
│   └── index.css       # Global styles
├── supabase-migration.sql  # Database schema
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Development Phases

This project is being built in phases:

- ✅ **Phase 1**: Foundation & Setup (Current)
- ⏳ **Phase 2**: Recipe Management
- ⏳ **Phase 3**: Staples Management
- ⏳ **Phase 4**: Shopping List Generation
- ⏳ **Phase 5**: Shopping List Features
- ⏳ **Phase 6**: Bulk Upload
- ⏳ **Phase 7**: Polish & Optimization

See `PROJECT_CONTEXT.md` for detailed information about the architecture and development plan.

## Database Schema

The app uses the following main tables:
- `recipes` - Recipe information
- `ingredients` - Ingredient catalog
- `recipe_ingredients` - Links recipes to ingredients
- `staples` - Regular shopping items
- `shopping_lists` - Generated shopping lists
- `shopping_list_items` - Items in shopping lists
- `supermarket_sectors` - Store layout configuration

See `supabase-migration.sql` for the complete schema with relationships and indexes.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Authentication

This app uses single-user authentication. Create one user account in Supabase and use it to log in.

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT

## Author

Built for efficient meal planning and grocery shopping.
