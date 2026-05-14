
## Session May 13 2026

Commits this session:
  ff8c275 - init: Shawn Intel v1.0 scaffold
  2b641ba - fix: CommonJS exports on all Netlify Functions
  411aebf - fix: Haiku model and reduced timeout
  96f9bbd - fix: reduce max_tokens to 1500
  d59c32f - fix: robust JSON parsing
  8703892 - fix: increase max_tokens to 2500
  2661fa2 - fix: lean system prompt plus Sonnet model
  7737c24 - fix: background function attempt
  2a266a9 - fix: brief generation moved to browser
  200931b - fix: absolute URLs for Netlify function calls
  0a2999f - feat: LinkedIn Maps Reviews Facebook YouTube Events
  f75961d - feat: Firecrawl deep scraping
  b744210 - fix: Firecrawl results wired into brief context
  4539949 - fix: surface Firecrawl errors visibly
  f25924c - fix: Firecrawl results in browser-side context
  0444065 - fix: Firecrawl verified status in source bar
  1529767 - feat: clear all prospects button

ADRs added: 5
  Brief to browser, absolute URLs, CommonJS exports,
  Firecrawl for CCAP, SerpAPI for Google

Incidents resolved: 4
  CommonJS exports, timeout fix, absolute URLs, DFI businessName bug

Runbooks added: 2
  Deploy from scratch, add new SerpAPI engine

Site live: shawnintel.netlify.app
Last stable commit: 1529767

Next session should start with:
  Test Guy Burnett as first real Shawn prospect
  Fix CCAP data flowing into brief text -- Firecrawl verified
  in source bar but brief text still uses generic language
  Add Wisconsin property records scraper -- Waukesha County first

Blockers:
  DFI wdfi.org blocking Firecrawl -- Phase 2 desktop fix
  CCAP data in brief tex
