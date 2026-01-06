# Phase 1 Setup Instructions

## Step 1: Create Directory Structure
Run the batch file to create the necessary directories:
```bash
.\create-dirs.bat
```

Or manually create these directories:
- src/
- src/lib/
- src/types/
- src/components/
- src/pages/
- src/hooks/
- src/utils/
- public/

## Step 2: Install Dependencies
```bash
npm install
```

This will install all dependencies defined in package.json including:
- React & React DOM
- React Router
- Supabase client
- TypeScript
- Tailwind CSS
- Vite

## Step 3: Set Up Supabase
1. Go to https://supabase.com and create a new project
2. Wait for the database to be provisioned
3. Copy your project URL and anon key from Settings > API
4. Create a `.env` file in the root directory:
```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Step 4: Create Database Schema
In your Supabase dashboard, go to SQL Editor and run the migration script:
See `supabase-migration.sql` for the complete schema.

## Step 5: Create Source Files
I've prepared all the necessary files. After creating the directories, I'll add:
- src/index.css
- src/main.tsx
- src/App.tsx
- src/lib/supabase.ts
- src/types/index.ts
- Component and page files

## Step 6: Run Development Server
```bash
npm run dev
```

The app should open at http://localhost:3000

## What's Been Set Up So Far:
✅ package.json with all dependencies
✅ TypeScript configuration
✅ Vite configuration
✅ Tailwind CSS configuration
✅ PostCSS configuration
✅ .gitignore
✅ .env.example template
✅ index.html

## Next Steps After Running create-dirs.bat:
Let me know when you've created the directories and I'll add all the source files!
