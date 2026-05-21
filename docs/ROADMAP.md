# Roadmap

## Data & Storage

- Migrate from local JSON storage to PostgreSQL + Prisma.
- Add optional migration scripts and seed data for local/dev environments.
- Add robust backup/recovery strategy for production data.

## AI & Analysis Quality

- Add confidence score explanation and calibration strategy.
- Improve prompt templates by crop type, growth stage, and symptom category.
- Add side-by-side comparison for first analysis vs re-analysis.
- Add stronger guardrails for uncertain or low-quality images.

## Security & Auth

- Replace in-memory session storage with persistent secure store (e.g., Redis).
- Add refresh-token flow and session revocation management.
- Add rate limiting and brute-force protections on auth endpoints.
- Add audit logging for key account actions.

## Image Handling

- Add secure image storage (S3-compatible or equivalent) with signed URLs.
- Add optional metadata extraction (capture time, EXIF sanitization).
- Add image lifecycle cleanup policy.

## Product Features

- Build admin panel for plant/disease catalog management.
- Add push notifications for follow-up checks and recommendations.
- Add offline mode with cached catalog/history sync.
- Add better multi-language UX for reports and recommendations.

## Testing & Quality

- Expand backend integration tests for all endpoints and edge cases.
- Add frontend unit tests for critical UI and utility logic.
- Add contract tests for API response schema stability.
- Add performance tests for image payload handling.

## DevOps & Deployment

- Add deployment pipeline for backend environments (staging/prod).
- Add environment-specific config validation in CI/CD.
- Add automated release/version tagging flow.

## Monitoring & Operations

- Add centralized structured logging.
- Add health dashboards and alerting.
- Add error tracking integration for mobile + backend.
- Add usage analytics for analysis quality and feature adoption.

