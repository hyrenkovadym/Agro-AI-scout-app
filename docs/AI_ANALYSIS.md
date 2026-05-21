# AI Plant Analysis Workflow

## Overview

Agro AI Scout uses a mobile-to-backend AI workflow:

1. Capture image on mobile.
2. Send image + context to backend.
3. Backend validates input and calls OpenAI.
4. Backend normalizes output into stable diagnosis JSON.
5. Analysis is returned and saved to history.

## Mobile Image Input

- Mobile app uses `expo-image-picker` camera flow.
- User captures plant photo directly in app.
- App keeps:
  - `uri` (preview)
  - `base64` (payload for backend)
  - `mimeType`
- App can re-run analysis with additional text context.

## Request Payload to Backend

Endpoint: `POST /analyze-plant`

Main fields:

- `clientId`
- `imageBase64`
- `imageMimeType`
- `expectedPlant` (optional hint)
- `language`
- `context` (optional additional notes)

## Backend Validation

Before AI call, backend validates:

- valid authenticated session token
- required fields (`clientId`, `imageBase64`)
- image Base64 format sanity check
- image MIME type (`image/jpeg`, `image/jpg`, `image/png`, `image/webp`)
- max image size via `MAX_IMAGE_BYTES`
- client ownership (user can analyze only own client records)

If validation fails, backend returns structured JSON error.

## OpenAI Call

Backend builds a structured prompt with:

- target output language
- plant hints from user and client profile
- user symptom description/context
- instruction to return JSON only
- safe, practical recommendation style
- caveat that diagnosis must remain preliminary

The backend calls OpenAI Responses API using configured model:

- `OPENAI_MODEL` (default `gpt-5`)
- `OPENAI_API_KEY`
- optional `OPENAI_BASE_URL`

## Context-Aware Re-analysis

App supports repeated analysis by adding extra details (for example watering changes, weather, fertilizer use).  
These details are appended to the backend prompt so the next result can:

- confirm previous hypothesis;
- adjust likely causes;
- suggest additional checks.

## Result Normalization and Persistence

Raw model output is parsed and normalized into a consistent diagnosis schema (problem, category, probability, causes, actions, notes, etc.).

Then backend:

1. creates an `analysis` record with timestamps and client metadata;
2. stores it in local JSON DB (`backend/data/db.json`);
3. returns it to the mobile app;
4. exposes history through `GET /analyses`.

## Safety Note

AI output in this project is intentionally positioned as a **preliminary recommendation**, not a certified agronomist diagnosis.

- Do not treat it as guaranteed accuracy.
- Validate critical decisions with qualified specialists.
- Use additional photos and field context to improve result quality.

