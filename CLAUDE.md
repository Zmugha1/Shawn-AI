
## Rules added May 13 2026

Shawn-AI project rules:
- Brief generation lives in browser -- never move to Netlify Function
- All Netlify Function fetch calls use absolute URLs
- All Netlify Functions use exports.handler not export const handler
- VITE_ prefix required for any env var accessed in React components
- Firecrawl handles JavaScript-rendered sites -- never plain fetch
- SerpAPI handles all Google intelligence -- never scrape Google directly
- DFI wdfi.org blocks Firecrawl -- skip until Tauri Phase 2
- localStorage holds all prospect data for testing phase
- Clear All button available on prospects page for test resets
