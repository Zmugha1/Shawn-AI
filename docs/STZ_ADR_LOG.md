
ADR-001
Date: May 13 2026
Decision: Brief generation moved to browser direct Anthropic call
Layer: Tech
Context: Netlify Functions have 26 second timeout. Anthropic call
  takes 15 to 20 seconds. Timeout kills the function every time.
Consequence: VITE_ANTHROPIC_API_KEY must be set in Netlify with
  VITE_ prefix. anthropic-dangerous-direct-browser-access header
  required. Scraping functions stay server-side to protect SerpAPI key.
Never do: Never move brief generation back to a Netlify Function
  without upgrading to a dedicated server with longer timeout.

ADR-002
Date: May 13 2026
Decision: Absolute URLs required for Netlify function calls
Layer: Tech
Context: Relative URLs like /.netlify/functions/scrape-ccap fail
  silently from browser on Netlify production. No CORS error shown.
  Functions simply never get called.
Consequence: All fetch calls to Netlify Functions must use full URL
  https://shawnintel.netlify.app/.netlify/functions/function-name
Never do: Never use relative paths for Netlify Function calls
  from the React frontend.

ADR-003
Date: May 13 2026
Decision: CommonJS exports required for Netlify Functions
Layer: Tech
Context: ES module syntax export const handler fails on Netlify.
  Functions deploy but return HTML error page instead of JSON.
Consequence: All Netlify Functions must use exports.handler syntax.
Never do: Never use export const handler in Netlify Functions.
  Always use exports.handler.

ADR-004
Date: May 13 2026
Decision: Firecrawl for CCAP and company website scraping
Layer: Tech
Context: Plain fetch and basic scraping blocked by CCAP and DFI
  bot detection. Firecrawl handles JavaScript rendering and
  bot detection automatically.
Consequence: FIRECRAWL_API_KEY required in Netlify environment.
  DFI wdfi.org still blocks Firecrawl -- accept for testing phase.
  Full CCAP and DFI automation deferred to Tauri desktop Phase 2.
Never do: Never use plain fetch to scrape JavaScript-rendered
  government sites. Use Firecrawl or headless browser.

ADR-005
Date: May 13 2026
Decision: SerpAPI for all Google-based intelligence
Layer: Tech
Context: Direct Google scraping violates ToS and gets blocked.
  SerpAPI provides reliable structured JSON from Google Search
  News Maps Events Facebook and YouTube.
Consequence: SERPAPI_KEY required in Netlify environment.
  Free tier gives 250 searches per month -- sufficient for pilot.
Never do: Never scrape Google directly. Always use SerpAPI.
