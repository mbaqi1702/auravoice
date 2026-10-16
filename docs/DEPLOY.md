# Deployment Guide: Free-Tier Infrastructure (`docs/DEPLOY.md`)

## 1. Supported Deployment Platforms
`AuraVoice` is engineered to run on free-tier hosts with minimal memory footprints:
- **Frontend & Full-Stack**: Vercel, Google Cloud Run, Render, Railway, Fly.io.

## 2. Ephemeral Storage Caveats & Mitigations (Defect D11)
Free tiers (Render, Fly, Railway) spin down or reset containers upon redeployment.
- **In-Memory & Volume Storage**: Session context and document caches reside in lightweight in-memory structures or mounted persistent volumes.
- **Cold Starts**: Render and free containers take ~25-45 seconds to spin up after idling. The application provides an automatic wake-up check (`GET /api/health`) and friendly connection banners.

## 3. Environment Variables
Create a `.env` file in the root directory:
```bash
# Required
GEMINI_API_KEY="your-gemini-api-key"

# Optional (Production Security)
PORT=3000
ALLOWED_ORIGINS="https://yourdomain.com,https://localhost:3000"
DEBUG=false
```

## 4. One-Command Docker Deployment
```bash
# Build production container
docker build -t voice-agent .

# Run with environment keys
docker run -p 3000:3000 -e GEMINI_API_KEY="your-key" voice-agent
```
