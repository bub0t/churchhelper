# Church Helper

A browser-based application to help churches plan activities and select songs based on Bible verses and themes.

## Features

- **Basic Mode**: Free access to children's church activity planning
- **Advanced Mode**: Church accounts with song database management
- **AI-Powered**: Uses OpenAI to generate themes and suggestions
- **Weather-Aware**: Considers local weather for activity recommendations
- **Simple UI**: Designed for non-technical users with natural conversation flow

## Tech Stack

- **Frontend**: Next.js 15 with React 18 and TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI**: OpenAI API
- **Database**: Supabase (PostgreSQL) - configured but not yet connected
- **Icons**: Lucide React

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run development server: `npm run dev`

## Environment Variables

Create a `.env.local` file with:

```
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENWEATHER_API_KEY=your_openweather_api_key
```

## Current Implementation Status

### ✅ **Completed**
- Project setup with Next.js + TypeScript + Tailwind CSS
- shadcn/ui component library integration
- OpenAI API integration for theme and content generation
- Disclaimer modal with Holy Spirit discernment warning
- Natural conversation flow UI (step-based navigation)
- Bible verse input with optional context
- AI-powered theme generation (with regeneration limit)
- Theme selection interface
- Activity vs Songs choice with user tier restrictions
- Simple church authentication (CBC church configured)
- Children's activities generation with age/size/weather considerations
- Activity cards with expand/collapse functionality
- Activity level indicators (laid-back, moderate, active)
- Materials lists and discussion questions
- Song suggestions from church database
- CCLI numbers and YouTube links
- Responsive design for mobile and desktop

### 🔄 **Next Steps**
1. **Weather API Integration**: Replace mock weather with OpenWeatherMap API
2. **Supabase Database**: Set up database schema and connect to application
3. **User Registration**: Allow new churches to sign up
4. **Song Management**: Admin interface for song database
5. **Export Features**: Print/save generated plans
6. **Production Deployment**: Deploy to Vercel

## CBC Church Configuration

- **Location**: Canterbury, Victoria, Australia
- **User**: "CBC"
- **Password**: "John3:16"
- **Songs**: 12 songs with complete metadata (CCLI, tempo, band requirements)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Architecture

- **Conversational Flow**: Step-based state management for natural user experience
- **AI Integration**: OpenAI GPT-4 for content generation with fallback handling
- **Component-Based**: Modular UI components with shadcn/ui
- **Type-Safe**: Full TypeScript implementation
- **Extensible**: Database-ready architecture for future features
