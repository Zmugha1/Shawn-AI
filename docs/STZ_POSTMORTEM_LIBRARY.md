
INC-001
Date: May 13 2026
What broke: Netlify Functions returning HTML instead of JSON
Root cause: ES module syntax export const handler not supported
  by Netlify Functions runtime without additional configuration
Fix applied: Changed all functions to exports.handler CommonJS syntax
Prevention rule: Always use exports.handler in Netlify Functions
Commit: 2b641ba

INC-002
Date: May 13 2026
What broke: Brief generation timing out at 26 seconds every time
Root cause: Netlify Pro plan has 26 second function timeout.
  Anthropic API call takes 15 to 25 seconds for full brief.
  Cannot be solved by reducing tokens -- Anthropic just needs time.
Fix applied: Moved brief generation to browser direct API call.
  VITE_ANTHROPIC_API_KEY with dangerous-direct-browser-access header.
Prevention rule: Never put long-running AI API calls in Netlify Functions.
  Move to browser or use dedicated server with configurable timeout.
Commit: 2a266a9

INC-003
Date: May 13 2026
What broke: Scraping functions called but zero data returned
Root cause: Relative URLs /.netlify/functions/ fail silently
  from browser in Netlify production. No error shown. Functions
  simply never invoked.
Fix applied: Changed all fetch calls to absolute URLs using
  https://shawnintel.netlify.app/.netlify/functions/
Prevention rule: Always use absolute URLs for Netlify Function
  calls from React frontend.
Commit: 200931b

INC-004
Date: May 13 2026
What broke: DFI search sending company website URL as business name
Root cause: businessName field receiving companyUrl value when
  user enters company website. No validation on field type.
Fix applied: Added cleanBusinessName check that strips any value
  starting with http before sending to DFI search.
Prevention rule: Always validate and sanitize field values before
  passing to external APIs. URL fields and name fields are different.
Commit: b744210
