# Church Helper

An AI-powered browser-based tool to help churches plan services — including children's activities, worship songs, and youth group discussions — based on Bible verses and themes.

## Features

- **Bible Verse Lookup**: Enter up to 3 passages; full text is fetched and displayed for review
- **AI Theme Generation**: Generates governing themes from selected verses with an optional feedback loop
- **Children's Activities**: Age- and weather-aware games, crafts, and songs for kids
- **Worship Songs**: Suggests songs from the congregation's known repertoire (advanced accounts only)
- **Youth Group Discussion**: Generates 5 discussion questions for secondary students (12–18)
- **Weather-Aware**: Fetches live weather forecast for Canterbury, VIC to inform activity suggestions
- **Guest & Advanced Modes**: Guest access for activities; login required for worship song features
- **Song Database Management**: Add new songs to improve future suggestions

## Tech Stack

- **Frontend**: Next.js (App Router) + React + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: OpenAI gpt-4.1-mini via the Responses API
- **Database**: Supabase (PostgreSQL + pgvector for song embeddings)
- **Auth**: Supabase Auth with server-side fallback
- **Bible**: rest.api.bible proxy (NLT / NIV)
- **Weather**: OpenWeatherMap API
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env.local` with the required variables (see below)
4. Run the development server: `npm run dev`

## Environment Variables

Create a `.env.local` file:

```
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_KEY=sb_secret_...
OPENWEATHER_API_KEY=your_openweather_api_key
BIBLE_API_KEY=your_bible_api_key
```

Add the same variables in Vercel → Project Settings → Environment Variables.

> `SUPABASE_SERVICE_KEY` must never use the `NEXT_PUBLIC_` prefix — it is server-side only.

## Authentication

- **Guest**: click "Continue as Guest" — access to children's activities and youth discussion only
- **Advanced (church account)**: login with church credentials — unlocks worship song suggestions and song database management
- Usernames are case-insensitive

## Architecture

- Single-page step-based flow in `src/app/page.tsx`
- All OpenAI calls in `src/lib/openai.server.ts`
- Prompt templates in `src/lib/prompts.md`
- Song vector embeddings in `src/lib/embeddings.server.ts` (Supabase pgvector)
- API routes under `src/app/api/`: `activities`, `discussion`, `themes`, `songs`, `songs/add`, `bible/verses`, `weather`, `auth/login`, `embeddings/rebuild`

## Development

```bash
npm install       # install dependencies
npm run dev       # development server (Turbopack)
npm run build     # production build
npm start         # start production server
```
