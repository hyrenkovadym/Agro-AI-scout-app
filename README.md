# Agro AI Scout

**AI-powered mobile scouting app for plant condition analysis and agronomy recommendations.**

Agro AI Scout is a React Native (Expo) mobile app with an Express backend that helps farmers and agronomy teams quickly analyze plant photos, identify possible issues, and receive practical next-step suggestions.

## Problem This App Solves

Field teams often need a fast first look at potential plant stress or disease before a specialist visit. Agro AI Scout provides:

- a quick mobile workflow to capture a photo;
- AI-assisted preliminary analysis;
- structured recommendations and follow-up checks;
- searchable plant/disease catalog context;
- user profile, session, and analysis history.

## Target Users

- Farmers and growers
- Agronomy consultants
- Field scouts / crop monitoring teams
- Greenhouse operators

## Main Features

- Authentication (`register`, `login`, `logout`)
- User profile update (`name`, `email`, `language`, password change)
- Plant and disease catalog browsing/search
- Camera-based plant photo capture in the mobile app
- AI-powered image analysis via OpenAI API
- Context-aware re-analysis (additional notes from user)
- Saved analysis history (`/analyses`)
- Local JSON storage for demo/local development

## Tech Stack

### Mobile
- React Native
- Expo
- TypeScript
- Expo Image Picker

### Backend
- Node.js (ES modules)
- Express
- CORS
- dotenv

### AI
- OpenAI API via official `openai` Node SDK

### Storage
- Local JSON file: `backend/data/db.json`

## Architecture Overview

```text
Mobile App (Expo / React Native)
  -> Express REST API (Node.js backend)
     -> AI Service (OpenAI Responses API)
     -> Local JSON Storage (backend/data/db.json)
```

## Frontend Overview

- Main app entry: `App.tsx`
- Uses Expo camera flow to capture image and send Base64 payload to backend
- Stores session token in-memory during app runtime
- Integrates with backend endpoints for auth/profile/clients/analyses/analyze-plant
- Shows latest analysis and saved history in UI
- Includes catalog and season-based plant issue browsing

## Backend Overview

- Entry: `backend/server.js`
- App factory: `backend/src/app.js`
- Modular services:
  - `src/config.js`
  - `src/services/auth.service.js`
  - `src/services/storage.service.js`
  - `src/services/ai.service.js`
  - `src/utils/validation.js`
- Keeps endpoint compatibility while improving structure and testability

## AI Analysis Workflow

1. User captures a plant photo in mobile app.
2. Mobile sends `imageBase64`, `imageMimeType`, `clientId`, language, and optional context.
3. Backend validates:
   - auth/session;
   - required fields;
   - image format (`jpeg/png/webp`);
   - max payload size (`MAX_IMAGE_BYTES`).
4. Backend builds a structured prompt and calls OpenAI.
5. Backend normalizes AI JSON output to a consistent diagnosis schema.
6. Analysis is saved in local JSON and returned to mobile client.

Important: AI output is a **preliminary recommendation**, not a guaranteed diagnosis.

## Authentication Flow

1. `POST /auth/register` or `POST /auth/login`
2. Backend returns `{ token, user }`
3. Mobile sends `Authorization: Bearer <token>` for protected routes
4. `POST /auth/logout` invalidates active session token
5. Session lifetime is configured by `SESSION_TTL_HOURS`

## Data Storage

Current storage mode is JSON-file based for local/demo usage:

- file: `backend/data/db.json`
- entities: `users`, `clients`, `analyses`
- safe write queue prevents concurrent write corruption in common local scenarios

Production roadmap includes PostgreSQL/Prisma migration (see `docs/ROADMAP.md`).

## Project Structure

```text
.
├─ App.tsx
├─ src/
│  ├─ components/
│  ├─ constants/
│  ├─ styles/
│  ├─ types.ts
│  └─ utils/
├─ backend/
│  ├─ server.js
│  ├─ src/
│  │  ├─ app.js
│  │  ├─ config.js
│  │  ├─ services/
│  │  └─ utils/
│  ├─ tests/
│  ├─ data/db.json
│  └─ .env.example
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ API.md
│  ├─ AI_ANALYSIS.md
│  └─ ROADMAP.md
├─ SECURITY.md
├─ CHANGELOG.md
└─ .github/workflows/ci.yml
```

## Environment Variables

### Mobile (`.env`)

```env
EXPO_PUBLIC_AI_API_URL=http://localhost:8787
```

### Backend (`backend/.env`)

```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-5
OPENAI_BASE_URL=
PORT=8787
SESSION_TTL_HOURS=336
MAX_IMAGE_BYTES=7340032
```

## Local Setup

### 1) Install dependencies

```bash
npm install
npm --prefix backend install
```

### 2) Configure environment

```bash
copy .env.example .env
copy backend\\.env.example backend\\.env
```

### 3) Run backend

```bash
npm run api
```

### 4) Run mobile app

```bash
npm run start
```

## Use on a Real Phone (Local Network)

1. Make sure phone and computer are on the same Wi-Fi.
2. Find your computer LAN IP (example: `192.168.1.20`).
3. Set `.env`:

```env
EXPO_PUBLIC_AI_API_URL=http://192.168.1.20:8787
```

4. Restart Expo and backend.
5. Open app in Expo Go and test API connectivity.

## API Endpoints

See full docs in [docs/API.md](docs/API.md).

Core endpoints:

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

## Screenshots / Demo

Add screenshots or GIFs:

- `docs/media/login-screen.png`
- `docs/media/home-catalog.png`
- `docs/media/photo-analysis-result.png`
- `docs/media/history-screen.png`

Optional: add a short Loom/YouTube demo link.

## Testing

Backend tests (no real OpenAI calls):

```bash
npm run test:backend
```

Includes tests for:

- `/health` endpoint
- validation helpers
- auth/session helpers
- JSON storage helpers
- `/analyze-plant` with mocked AI client

## CI

GitHub Actions CI (`.github/workflows/ci.yml`) runs:

- dependency installation
- TypeScript type-check (frontend)
- backend tests

CI does not require real OpenAI keys and does not run device builds.

## Optional Docker (Backend)

```bash
docker compose up --build backend
```

This is optional and not required for local Expo development.

## Limitations and Safety Note

- AI analysis is preliminary and may be incorrect.
- Results should be verified by a qualified agronomist before critical treatment decisions.
- JSON storage is for local/demo use, not production-scale reliability.
- Sessions are in-memory (reset on server restart).
- No production-grade file/object storage yet for images.

## Future Improvements

See [docs/ROADMAP.md](docs/ROADMAP.md) for planned improvements:

- PostgreSQL + Prisma migration
- stronger auth/session handling
- secure image storage
- confidence scoring improvements
- broader test coverage
- deployment and monitoring pipeline

## What This Project Demonstrates to Employers

Agro AI Scout demonstrates practical full-stack delivery for an AI product:

- React Native + Expo mobile development
- TypeScript frontend structure
- Express REST API architecture
- AI image-analysis workflow integration (OpenAI API)
- authentication and profile management
- analysis history and catalog search features
- environment-based configuration
- mobile/backend integration on local network
- testable backend modules + CI basics
- clear technical documentation and realistic roadmap

---

**Portfolio message:**  
“I built an AI-powered mobile scouting app using React Native, Expo, TypeScript, Express, and OpenAI API. The project demonstrates mobile/backend integration, AI image analysis workflow, authentication, analysis history, catalog/search features, environment configuration, documentation, and testing basics.”
