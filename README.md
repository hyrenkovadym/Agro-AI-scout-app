# Agro AI Scout

Mobile app for farmers and agronomy teams that helps to:
- analyze plant condition from a photo using AI;
- identify likely issues and provide practical recommendations;
- browse a plant and seasonal disease catalog;
- store user data and analysis history.

## Features

- User authentication (sign up / sign in)
- Plant and disease search
- Separate catalog screens:
  - all plants
  - all diseases
- Plant photo analysis via OpenAI API
- Add extra context to refine a repeated analysis
- User profile settings (language, email, password change, help)

## Tech Stack

### Frontend (mobile app)
- Language: `TypeScript`
- Framework: `React Native`
- Platform: `Expo`
- Main libraries:
  - `react`
  - `react-native`
  - `expo`
  - `expo-image-picker`
  - `expo-linear-gradient`
  - `expo-constants`
  - `expo-status-bar`

### Backend (API)
- Runtime / language: `Node.js (ESM JavaScript)`
- Framework: `Express`
- Main libraries:
  - `express`
  - `cors`
  - `dotenv`
  - `openai`

### AI
- OpenAI API via official npm package `openai`
- Model is configured by `OPENAI_MODEL` (backend default: `gpt-5`)

### Data storage
- Local JSON file: `backend/data/db.json`

## Project Structure

- `App.tsx` - main mobile UI and screen navigation
- `src/` - components, styles, types, constants, utilities
- `backend/server.js` - API (auth, clients, analyze, analyses)
- `backend/data/db.json` - local database file

## Quick Start

### 1) Install dependencies

```bash
npm install
npm --prefix backend install
```

### 2) Configure environment variables

```bash
copy .env.example .env
copy backend\\.env.example backend\\.env
```

Required in `backend/.env`:

```env
OPENAI_API_KEY=your_key_here
```

Optional:

```env
OPENAI_MODEL=gpt-5
OPENAI_BASE_URL=
PORT=8787
SESSION_TTL_HOURS=336
MAX_IMAGE_BYTES=7340032
```

If you run the app on a real phone in the same local network as your PC, set backend URL in root `.env`:

```env
EXPO_PUBLIC_AI_API_URL=http://192.168.0.25:8787
```

### 3) Start backend

```bash
npm run api
```

### 4) Start mobile app

```bash
npm run start
```

## Useful Scripts

### Frontend
- `npm run start` - start Expo
- `npm run android` - run Android
- `npm run ios` - run iOS
- `npm run web` - run Web

### Backend
- `npm run api` - backend dev mode
- `npm run api:start` - backend production start

## Main API Endpoints

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`
- `PATCH /me`
- `POST /me/password`
- `GET /clients`
- `POST /clients`
- `GET /analyses`
- `POST /analyze-plant`

## Note

AI output in this app is a likely preliminary diagnosis. For critical decisions, verify results with an agronomist.

