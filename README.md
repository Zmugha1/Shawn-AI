# Shawn Intel -- Pre-Meeting Intelligence

Built by Dr. Data Decision Intelligence LLC for Shawn, CFP.

## What this does

Enter a prospect's name and five pieces of information. The system searches public sources simultaneously -- Wisconsin court records, business registrations, Google, news, maps, reviews, Facebook, and RSS feeds -- applies Shawn's 10 criteria, and generates a structured pre-meeting brief using his STZ voice layer.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Zmugha1/Shawn-AI.git
cd Shawn-AI
npm install
```

### 2. Add your API keys

Copy `.env.example` to `.env` and add your keys:

```
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here
SERPAPI_KEY=your_serpapi_key_here
```

Get keys from:
- Anthropic: https://console.anthropic.com/account/keys
- SerpAPI: https://serpapi.com/manage-api-key

### 3. Run locally

```bash
npm run dev
```

### 4. Deploy to Netlify

Push to GitHub. Connect repo in Netlify dashboard.

Add environment variables in Netlify:
- Site settings -- Environment variables
- Add `ANTHROPIC_API_KEY` (without VITE_ prefix -- server-side only)
- Add `SERPAPI_KEY`

## Intelligence sources

| Source | Type | Key needed |
|--------|------|-----------|
| CCAP Wisconsin | Auto scrape | No |
| Wisconsin DFI | Auto scrape | No |
| Wisconsin property records | Auto scrape | No |
| Google Search | SerpAPI | Yes |
| Google News | SerpAPI | Yes |
| Google Maps + Reviews | SerpAPI | Yes |
| Facebook Profile | SerpAPI | Yes |
| Yelp (restaurant owners) | SerpAPI | Yes |
| Wisconsin RSS feeds | Free fetch | No |
| LinkedIn | Manual URL paste | No |
| Company website | Manual URL paste | No |

## Stack

- React 18 + Vite 5
- React Router v6
- Netlify Functions (serverless)
- Anthropic API (claude-sonnet-4-20250514)
- SerpAPI
- No database -- localStorage for testing phase

## Phase 2

When Shawn approves the testing version, the production build installs on his laptop as a Tauri desktop app with full airgap, local SQLite, Ollama for offline AI, and HubSpot + Redtail CRM integrations.
