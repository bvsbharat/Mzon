# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mzon is an AI-powered digital photography studio application built with React 19, TypeScript, and Vite. It provides multiple AI-driven image editing and generation capabilities using Google's Gemini API, plus real-time news discovery and social media content generation via a FastAPI backend.

## Common Development Commands

- **Development server**: `npm run dev` (frontend), `cd backend && python main_deepagent.py` (backend)
- **Production build**: `npm run build`
- **Preview build**: `npm run preview`
- **Install dependencies**: `npm install`

## Environment Setup

Required environment variables in `.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
VITE_FAL_KEY=your_fal_ai_api_key_here
VITE_AWS_ACCESS_KEY_ID=your_aws_key
VITE_AWS_SECRET_ACCESS_KEY=your_aws_secret
VITE_AWS_BUCKET_NAME=your_s3_bucket_name
VITE_AWS_REGION=your_aws_region
```

**New**: `VITE_FAL_KEY` is required for AI video generation features using FAL AI's Veo 3 Fast and Nano Banana services.

Backend requires Python dependencies and additional API keys (see backend/.env).

## Application Architecture

### Core Structure
- **App.tsx**: Central state container managing global application state and custom view routing
- **views/**: Ten main studio views (PhotoStudio, VariationStudio, ImageComposer, MagicEdit, AssetLibrary, ImageGenerator, CampaignStudio, PlatformStudio, NewsHub, ContentCreator)
- **components/**: Reusable UI components including specialized AI tools, modals, galleries, and news components
- **services/**: Service layer for AI operations, storage, news data, and WebSocket connections
- **backend/**: FastAPI backend with multi-agent news discovery system
- **types.ts**: Comprehensive TypeScript definitions for all data structures
- **constants.ts**: Centralized AI prompts, templates, and configuration constants

### State Management Architecture
Uses React hooks with centralized state management pattern:
- **App.tsx** acts as the central state container (no Redux/Zustand)
- **Prop drilling** for state distribution to child components
- **View-specific state** preserved across navigation (latestVariationUrl, composedImageUrl, etc.)
- **Authentication state** managed via AuthContext with localStorage persistence
- **Real-time state** updates via WebSocket connections for news feeds

### Custom View Routing System
Unlike traditional React Router, uses state-based view management:
```typescript
type View = 'photo' | 'variation' | 'composer' | 'edit' | 'library' | 'imageGenerator' | 'campaign' | 'platform' | 'newsHub' | 'contentCreator';
const [activeView, setActiveView] = React.useState<View>('photo');
```
- Views receive common props (navigation handlers, image library functions, credits)
- Context preservation between views
- No URL-based routing (consider migrating to React Router)

### AI Integration Architecture
Standardized AI workflow pattern across all operations:
1. **Data Conversion**: `dataUrlToPart()` converts images to Gemini-compatible format
2. **Prompt Selection**: Templates from constants.ts based on user configuration
3. **API Orchestration**: Centralized calls via `services/geminiService.ts`
4. **Response Processing**: Consistent parsing and error handling
5. **State Integration**: Results flow back to global state and UI updates

**Key Services**:
- `geminiService.ts`: All Gemini API interactions (generateProShot, generateVariation, etc.)
- `storageService.ts`: Dual-layer persistence (S3 primary, localStorage fallback)
- `newsService.ts`: Backend communication for news data
- `liveNewsService.ts`: WebSocket management for real-time feeds

### Dual Storage Architecture
Sophisticated storage strategy with automatic fallback:
```typescript
// Priority: AWS S3 → localStorage → data URLs
async storeImage(dataUrl: string): Promise<StorageResult> {
  // Try S3 first for scalable cloud storage
  // Fall back to localStorage for offline capability
  // Ultimate fallback to data URLs for guaranteed functionality
}
```

### Backend Integration (FastAPI)
**Multi-agent news discovery system** in `backend/main_deepagent.py`:
- **REST API**: `/api/news/*` endpoints for standard operations
- **WebSocket Streaming**: `/ws/query` and `/ws/live-news` for real-time updates
- **Agent Architecture**: Specialized agents for news hunting, social media analysis
- **Async Processing**: Event-driven backend with asyncio

### Component Communication Patterns
- **Parent → Child**: Props for data and callback functions
- **Service Layer**: Promise-based async patterns with consistent error handling
- **Backend Communication**: REST + WebSocket dual approach
- **Cross-View Data Flow**: Shared state preservation across navigation

## Key Architectural Patterns

### AI Operations
All AI functions follow consistent patterns. When adding new AI features:
1. Add prompt template to `constants.ts`
2. Implement service function in `geminiService.ts`
3. Handle data conversion via `dataUrlToPart()`
4. Integrate response into application state
5. Update UI with loading states and error handling

### Storage Operations
When handling images:
1. Always attempt S3 storage first (if configured)
2. Fall back to localStorage with metadata
3. Use data URLs as final fallback
4. Include error handling for storage failures
5. Update gallery state and user notifications

### Real-time Features
For live data features:
1. Establish WebSocket connection via appropriate service
2. Handle connection states (connecting, connected, disconnected)
3. Process streaming updates in real-time
4. Update UI progressively as data arrives
5. Implement reconnection logic for reliability

## Development Notes

### Configuration
- **Path aliases**: `@/*` maps to project root (configured in tsconfig.json and vite.config.ts)
- **Environment variables**: Loaded via Vite with `process.env` definitions in vite.config.ts
- **Type definitions**: Comprehensive types in `types.ts` - always update when adding new features

### Common Patterns
- **Error Boundaries**: Consider adding for better error handling
- **Loading States**: Consistent loading indicators across all async operations
- **Responsive Design**: Mobile-first approach with sidebar navigation
- **Canvas Operations**: Complex image manipulation via HTML5 Canvas API

### Testing Considerations
- No testing framework currently configured
- Consider Jest/Vitest for unit tests
- Playwright/Cypress for E2E testing
- Test AI service functions with mock responses