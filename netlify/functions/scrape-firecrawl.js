// netlify/functions/scrape-firecrawl.js
// Uses Firecrawl to scrape CCAP, DFI, LinkedIn, and company websites
// Replaces broken manual scrapers with AI-ready extraction

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY

  if (!FIRECRAWL_KEY) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' })
    }
  }

  try {
    const { firstName, lastName, fullName, businessName, linkedinUrl, companyUrl } = JSON.parse(event.body || '{}')

    const results = {}

    const firecrawlScrape = async (url, prompt) => {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FIRECRAWL_KEY}`
          },
          body: JSON.stringify({
            url,
            formats: ['extract'],
            extract: {
              prompt,
              schema: null
            }
          }),
          signal: AbortSignal.timeout(15000)
        })
        if (!res.ok) return null
        const data = await res.json()
        return data?.data?.extract || data?.data?.markdown || null
      } catch {
        return null
      }
    }

    const firecrawlSearch = async (query) => {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FIRECRAWL_KEY}`
          },
          body: JSON.stringify({
            query,
            limit: 5,
            scrapeOptions: { formats: ['markdown'] }
          }),
          signal: AbortSignal.timeout(15000)
        })
        if (!res.ok) return null
        const data = await res.json()
        return data?.data || []
      } catch {
        return null
      }
    }

    const tasks = []

    // CCAP Wisconsin -- court records
    if (firstName && lastName) {
      tasks.push(
        firecrawlScrape(
          `https://wcca.wicourts.gov/caseSearch.do?search=true&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`,
          `Extract all court cases for ${firstName} ${lastName}. For each case return: case number, case type, filing date, status, county. If no cases found say "No records found".`
        ).then(data => {
          results.ccap = {
            source: 'CCAP Wisconsin',
            status: data ? 'scraped' : 'unavailable',
            data: data || 'No records found',
            confidence: data ? 'high' : 'low'
          }
        })
      )
    }

    // Wisconsin DFI -- business records
    if (businessName || fullName) {
      const searchTerm = businessName || fullName
      tasks.push(
        firecrawlScrape(
          `https://wdfi.org/apps/corpsearch/search.aspx?q=${encodeURIComponent(searchTerm)}&type=Simple`,
          `Extract all business entities for "${searchTerm}". For each entity return: business name, entity type, status, registration date, registered agent. If none found say "No entities found".`
        ).then(data => {
          results.dfi = {
            source: 'Wisconsin DFI',
            status: data ? 'scraped' : 'unavailable',
            data: data || 'No entities found',
            confidence: data ? 'high' : 'low'
          }
        })
      )
    }

    // LinkedIn -- if URL provided
    if (linkedinUrl) {
      tasks.push(
        firecrawlScrape(
          linkedinUrl,
          'Extract: full name, current job title, current company, previous companies and roles, education, location, about section summary, skills. Return as structured text.'
        ).then(data => {
          results.linkedin = {
            source: 'LinkedIn Profile',
            status: data ? 'scraped' : 'unavailable',
            data: data || null,
            confidence: data ? 'high' : 'low'
          }
        })
      )
    }

    // Company website -- if URL provided
    if (companyUrl) {
      tasks.push(
        firecrawlScrape(
          companyUrl,
          'Extract: company name, what the company does, founding year, team size if mentioned, key services or products, location, any notable clients or case studies, leadership names.'
        ).then(data => {
          results.company = {
            source: 'Company Website',
            status: data ? 'scraped' : 'unavailable',
            data: data || null,
            confidence: data ? 'high' : 'low'
          }
        })
      )
    }

    // Firecrawl Search -- general web presence
    tasks.push(
      firecrawlSearch(`${fullName} Wisconsin financial planning professional background`)
        .then(data => {
          results.webSearch = {
            source: 'Firecrawl Web Search',
            status: data?.length > 0 ? 'results_found' : 'no_results',
            results: (data || []).slice(0, 4).map(r => ({
              title: r.title,
              url: r.url,
              description: r.description,
              content: r.markdown?.substring(0, 300)
            })),
            confidence: 'medium'
          }
        })
    )

    await Promise.allSettled(tasks)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        results,
        sourcesScraped: Object.keys(results).length,
        timestamp: new Date().toISOString()
      })
    }

  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'error',
        error: err.message,
        results: {}
      })
    }
  }
}
