# 3-Command Developer Setup Guide (`docs/SETUP.md`)

Get up and running in under 2 minutes:

```bash
# 1. Clone repository & install dependencies
git clone https://github.com/mbaqi1702/voice-agent.git && cd voice-agent
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY

# 3. Start full-stack development server
npm run dev
```

Visit `http://localhost:3000` in Google Chrome, Microsoft Edge, or Safari.

## Running Tests
```bash
# Type check and linting
npm run lint

# Compile production bundle
npm run build
```
