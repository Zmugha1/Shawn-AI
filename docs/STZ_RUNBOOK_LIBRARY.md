
RUN-001
Task: Deploy Shawn-AI to Netlify from scratch
Trigger: New machine or new Netlify site needed
Steps:
  1. Clone repo: git clone github.com/Zmugha1/Shawn-AI
  2. npm install in project root
  3. npm run build -- confirm no errors
  4. Connect repo to Netlify -- build command npm run build
     publish dir dist -- functions dir netlify/functions
  5. Add environment variables in Netlify:
     ANTHROPIC_API_KEY -- from console.anthropic.com
     VITE_ANTHROPIC_API_KEY -- same value as above
     SERPAPI_KEY -- from serpapi.com/manage-api-key
     FIRECRAWL_API_KEY -- from firecrawl.dev/app/api-keys
  6. Trigger deploy -- wait for green
  7. Test with a real prospect name
Expected output: Full pipeline completes in under 30 seconds
Watch out for: VITE_ prefix required for browser-accessible keys.
  ANTHROPIC_API_KEY without VITE_ prefix is for server-side only.

RUN-002
Task: Add new SerpAPI engine to intelligence pipeline
Trigger: New data source identified for prospect research
Steps:
  1. Open netlify/functions/search-serp.js
  2. Add new serpFetch call inside the searches array
  3. Use the pattern: engine name, query params, result mapping
  4. Add try/catch -- never let one engine failure break others
  5. git add netlify/functions/search-serp.js
  6. git commit -m "feat: add [engine name] to SerpAPI pipeline"
  7. git push origin main
  8. Test and check serpapi.com/searches/reports for new calls
Expected output: New source appears in pipeline and brief
Watch out for: Each SerpAPI engine uses different result keys.
  Always check SerpAPI docs for correct result field names.
