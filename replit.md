# WordCraft - Scrabble App (2024 Rules)

## Overview
A mobile-first Scrabble app built with Expo/React Native that implements the 2024 official rules. Features single-player vs AI, interactive tutorial, rules reference, and anagram practice mode.

## Architecture
- **Frontend**: Expo Router (file-based routing), React Native, no tabs
- **Backend**: Express server (minimal, landing page only)
- **State**: React Context (GameProvider) + AsyncStorage for stats persistence
- **Navigation**: Stack navigator with headerShown: false

## Key Files
- `app/index.tsx` - Home screen with animated menu
- `app/game.tsx` - Full game board with AI opponent
- `app/tutorial.tsx` - Interactive step-by-step lessons
- `app/rules.tsx` - Searchable rules reference
- `app/practice.tsx` - Anagram trainer
- `lib/scrabble-engine.ts` - Game logic, scoring, validation, AI
- `lib/game-context.tsx` - Game state management
- `lib/tutorial-data.ts` - Tutorial lessons and rules data
- `lib/anagram-data.ts` - Practice puzzle data

## Design System
- Dark warm wood theme
- Font: Inter (Google Fonts)
- Color palette: warm wood (#E6D6C3), teal (#0F8F8F), tile off-white (#FFF8F0)
- No tabs, stack navigation throughout

## Recent Changes
- Initial build: Feb 2026
