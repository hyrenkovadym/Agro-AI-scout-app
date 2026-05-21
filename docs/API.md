# API Documentation

## Base URL

Local default:

```text
http://localhost:8787
```

## Authentication & Session Behavior

- Auth uses bearer token in `Authorization` header:
  - `Authorization: Bearer <token>`
- Token is issued by:
  - `POST /auth/register`
  - `POST /auth/login`
- Token is invalidated by:
  - `POST /auth/logout`
- Session tokens are stored in-memory and expire by `SESSION_TTL_HOURS`.

## Error Format

Most errors follow:

```json
{
  "error": "Error message"
}
```

Typical statuses:

- `400` validation error
- `401` unauthorized
- `404` not found
- `409` conflict
- `413` payload too large
- `500` internal error
- `503` missing AI key

## Endpoints

## `GET /health`

Health and runtime info.

### Response `200`

```json
{
  "ok": true,
  "model": "gpt-5",
  "hasApiKey": true,
  "users": 3,
  "clients": 5,
  "analyses": 12,
  "timestamp": "2026-05-21T11:22:33.000Z"
}
```

## `POST /auth/register`

Create account and return session token.

### Request

```json
{
  "name": "Alex Farmer",
  "email": "alex@example.com",
  "password": "password123"
}
```

### Response `201`

```json
{
  "token": "session_token",
  "user": {
    "id": "usr_...",
    "name": "Alex Farmer",
    "email": "alex@example.com",
    "language": "uk",
    "createdAt": "2026-05-21T11:22:33.000Z"
  }
}
```

## `POST /auth/login`

Login with email/password.

### Request

```json
{
  "email": "alex@example.com",
  "password": "password123"
}
```

### Response `200`

```json
{
  "token": "session_token",
  "user": {
    "id": "usr_...",
    "name": "Alex Farmer",
    "email": "alex@example.com",
    "language": "uk",
    "createdAt": "2026-05-21T11:22:33.000Z"
  }
}
```

## `POST /auth/logout`

Invalidate current token.

### Headers

```text
Authorization: Bearer <token>
```

### Response `200`

```json
{
  "ok": true
}
```

## `GET /me`

Return authenticated user profile.

### Headers

```text
Authorization: Bearer <token>
```

### Response `200`

```json
{
  "user": {
    "id": "usr_...",
    "name": "Alex Farmer",
    "email": "alex@example.com",
    "language": "uk",
    "createdAt": "2026-05-21T11:22:33.000Z"
  }
}
```

## `PATCH /me`

Update user profile fields.

### Headers

```text
Authorization: Bearer <token>
```

### Request

```json
{
  "name": "Alex F.",
  "email": "alex@example.com",
  "language": "en"
}
```

### Response `200`

```json
{
  "user": {
    "id": "usr_...",
    "name": "Alex F.",
    "email": "alex@example.com",
    "language": "en",
    "createdAt": "2026-05-21T11:22:33.000Z"
  }
}
```

## `POST /me/password`

Change password.

### Headers

```text
Authorization: Bearer <token>
```

### Request

```json
{
  "currentPassword": "password123",
  "newPassword": "newpass123"
}
```

### Response `200`

```json
{
  "ok": true
}
```

## `GET /clients`

List clients for current user.

### Headers

```text
Authorization: Bearer <token>
```

### Response `200`

```json
{
  "clients": [
    {
      "id": "cln_...",
      "ownerUserId": "usr_...",
      "name": "Demo Farm",
      "company": null,
      "crop": "Corn",
      "location": null,
      "notes": "Local scouting client",
      "createdAt": "2026-05-21T11:24:00.000Z",
      "updatedAt": "2026-05-21T11:24:00.000Z"
    }
  ]
}
```

## `POST /clients`

Create a client record.

### Headers

```text
Authorization: Bearer <token>
```

### Request

```json
{
  "name": "Demo Farm",
  "company": "Agro Team",
  "crop": "Corn",
  "location": "Kyiv region",
  "notes": "Priority field"
}
```

### Response `201`

```json
{
  "client": {
    "id": "cln_...",
    "ownerUserId": "usr_...",
    "name": "Demo Farm",
    "company": "Agro Team",
    "crop": "Corn",
    "location": "Kyiv region",
    "notes": "Priority field",
    "createdAt": "2026-05-21T11:24:00.000Z",
    "updatedAt": "2026-05-21T11:24:00.000Z"
  }
}
```

## `GET /analyses`

List analyses for current user (latest first, up to 80).

### Headers

```text
Authorization: Bearer <token>
```

### Query (optional)

- `clientId=<id>`

### Response `200`

```json
{
  "analyses": [
    {
      "id": "anl_...",
      "ownerUserId": "usr_...",
      "clientId": "cln_...",
      "clientName": "Demo Farm",
      "crop": "Corn",
      "createdAt": "2026-05-21T11:30:00.000Z",
      "diagnosis": {
        "problemName": "Likely nitrogen deficiency",
        "probability": "medium",
        "category": "nutrient deficiency",
        "recommendedActions": ["Apply balanced fertilizer"]
      },
      "context": "Leaves yellowing in lower canopy"
    }
  ]
}
```

## `POST /analyze-plant`

Run AI analysis and persist result.

### Headers

```text
Authorization: Bearer <token>
```

### Request

```json
{
  "clientId": "cln_...",
  "imageBase64": "<base64_without_data_url_prefix>",
  "imageMimeType": "image/jpeg",
  "expectedPlant": "Corn",
  "language": "en",
  "context": "Leaves started yellowing this week."
}
```

### Response `201`

```json
{
  "analysis": {
    "id": "anl_...",
    "ownerUserId": "usr_...",
    "clientId": "cln_...",
    "clientName": "Demo Farm",
    "crop": "Corn",
    "createdAt": "2026-05-21T11:30:00.000Z",
    "diagnosis": {
      "problemName": "Likely nitrogen deficiency",
      "probability": "medium",
      "category": "nutrient deficiency",
      "probablePlant": "Corn",
      "recommendedActions": ["Apply balanced fertilizer"],
      "notes": "Preliminary recommendation only."
    },
    "context": "Leaves started yellowing this week."
  }
}
```

### Common error examples

```json
{ "error": "OPENAI_API_KEY is missing in backend/.env" }
```

```json
{ "error": "imageBase64 is required." }
```

```json
{ "error": "Unsupported image type. Use JPEG, PNG, or WEBP." }
```

