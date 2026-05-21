# Architecture

## High-Level Architecture

```text
Mobile App (Expo React Native)
  -> Express API (Node.js backend)
     -> AI Analysis Service
        -> OpenAI Responses API
     -> JSON Storage Service (backend/data/db.json)
```

Secondary flow:

```text
Mobile App
  -> Auth endpoints (register/login/logout)
  -> Profile endpoints (me/update/password)
  -> Clients endpoints
  -> Analyses endpoints (history)
```

## Mobile App Responsibilities

- Capture plant photos using Expo Image Picker (camera flow).
- Collect optional user context (suspected plant, additional notes).
- Call backend API using token-based auth.
- Render analysis output, recommendations, and safety notes.
- Show analysis history and catalog browse/search UI.

## Backend API Responsibilities

- Validate input payloads and auth token.
- Manage sessions (in-memory token store with TTL).
- Persist users/clients/analyses in local JSON database.
- Build AI prompts and call OpenAI model.
- Normalize model output into stable diagnosis schema.
- Return clear JSON responses and error messages.

## AI Analysis Flow

1. Mobile captures image and sends Base64 + metadata to `POST /analyze-plant`.
2. Backend validates:
   - session token
   - required fields
   - MIME type (`jpeg/png/webp`)
   - max size (`MAX_IMAGE_BYTES`)
3. Backend builds prompt with:
   - client profile crop/location
   - user expected plant hint
   - extra context notes
4. OpenAI returns structured output.
5. Backend normalizes result and saves to `analyses`.
6. Mobile displays result and supports re-analysis with added context.

## Auth / Session Flow

- Registration and login issue bearer token.
- Token stored in memory map on backend with expiry.
- Protected endpoints require `Authorization: Bearer <token>`.
- Logout removes token from session map.
- Session lifetime controlled by `SESSION_TTL_HOURS`.

## Analysis History Flow

- Every successful `/analyze-plant` request persists a new analysis record.
- `GET /analyses` returns user-scoped history, newest first.
- Mobile renders latest analysis + history preview list.

## Catalog / Search Flow

- Plant and disease catalog is currently frontend-managed static data (`src/constants/plants.ts`).
- Mobile supports search by plant name, subtitle, season, and disease labels.
- Catalog is used as context support and quick navigation, not as authoritative diagnosis.

## Environment Configuration

### Mobile
- `EXPO_PUBLIC_AI_API_URL`: backend base URL

### Backend
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL` (optional)
- `PORT`
- `SESSION_TTL_HOURS`
- `MAX_IMAGE_BYTES`

## Local JSON Storage

- File path: `backend/data/db.json`
- Collections:
  - `users`
  - `clients`
  - `analyses`
- Storage service includes cache + queued writes for safer local file updates.

## Current Limitations

- Session storage is in-memory (lost on server restart).
- JSON file storage is not production-grade for concurrency/scalability.
- Image payloads are Base64 in request body (no object storage pipeline yet).
- AI outputs are preliminary recommendations and may be wrong.

