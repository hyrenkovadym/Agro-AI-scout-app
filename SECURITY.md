# Security Policy

## Secrets Management

- Never commit real API keys, passwords, or `.env` files.
- Use `.env.example` templates and local environment variables only.
- If a key is exposed, rotate it immediately.

## Data Handling

- This project currently uses local JSON storage for demo/dev usage.
- Do not store sensitive production user data in `backend/data/db.json`.
- Treat analysis output as advisory, not medical/agronomic certification.

## API and Transport

- Use HTTPS in production deployments.
- Validate image payload type and size before AI processing.
- Add rate limiting and stronger auth/session persistence for production hardening.

## Reporting Security Issues

- Please report vulnerabilities privately to the maintainer first.
- Include:
  - affected area (mobile/backend/docs)
  - reproduction steps
  - impact assessment
  - suggested fix (if available)

