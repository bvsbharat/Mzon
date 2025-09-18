# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered digital photography studio application called "Mzon" built with React 19, TypeScript, and Vite. The application provides multiple AI-driven image editing and generation capabilities using Google's Gemini API.

## Common Development Commands

- **Development server**: `npm run dev`
- **Production build**: `npm run build`
- **Preview build**: `npm run preview`
- **Install dependencies**: `npm install`

## Environment Setup

The application requires a Gemini API key to be set in `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

## Application Architecture

### Core Structure
- **App.tsx**: Main application component that manages all global state and view routing
- **views/**: Eight main studio views (PhotoStudio, VariationStudio, ImageComposer, MagicEdit, AssetLibrary, ImageGenerator, CampaignStudio, PlatformStudio)
- **components/**: Reusable UI components including modals, galleries, toolbars, and specialized editors
- **services/geminiService.ts**: Centralized API service handling all Google Gemini interactions
- **types.ts**: Global TypeScript type definitions
- **constants.ts**: All prompts, templates, and configuration constants for AI generation

### State Management
The application uses React hooks for state management with the main App component acting as a central state container. Key state includes:
- `activeView`: Current studio view
- `activeStudioImage`: The master image being worked on
- `galleryImages`: User's image library
- `credits`: User's remaining credits
- Various view-specific states (latestVariationUrl, composedImageUrl, etc.)

### AI Integration Pattern
All AI operations follow a consistent pattern:
1. User input (image + prompt/configuration)
2. Data conversion to Gemini-compatible format (via `dataUrlToPart`)
3. API call using appropriate prompt template from constants.ts
4. Response handling and error management
5. State updates and user feedback

### Key AI Capabilities
- **Pro Shot Generation**: Creates professional product photography from user uploads
- **Scene Variations**: Generates new backgrounds/environments for existing product shots
- **Image Composition**: Combines multiple images into cohesive scenes
- **Magic Edit**: Inpainting-based image editing with mask support
- **Prompt Enhancement**: AI-powered prompt improvement
- **Campaign Generation**: Bulk creative asset generation for marketing

### View Navigation System
The app uses a custom view routing system where each view is a distinct "studio":
- Views are managed by `activeView` state
- Each view receives common props (navigation handlers, image library functions, credits)
- Navigation preserves context and results between views

### Image Library System
Central image management with:
- Automatic image tagging and metadata
- Master image designation
- Cross-view image sharing
- Gallery operations (favorite, delete, rename)

## Development Notes

- Uses path alias `@/*` for imports (configured in tsconfig.json and vite.config.ts)
- All AI prompts and templates are centralized in constants.ts
- Error handling includes user-friendly notifications
- Canvas operations for image manipulation (cropping, masking, composition)
- Responsive design with mobile sidebar navigation