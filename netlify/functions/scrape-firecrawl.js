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
    const { firstName, lastName, fullName, businessName, linkedinUrl, companyUrl, facebookUrl } = JSON.parse(event.body || '{}')
    // Clean businessName -- strip URLs if accidentally passed
    const cleanBusinessName = businessName && !businessName.startsWith('http') ? businessName : null

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
    if (cleanBusinessName || fullName) {
      const searchTerm = cleanBusinessName || fullName
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

    // Multi-platform deep search -- hunt for the real person
    tasks.push(
      Promise.allSettled([

        // Search 1 -- General identity and background
        firecrawlSearch(`"${fullName}" Wisconsin background career history`),

        // Search 2 -- Military and government service
        firecrawlSearch(`"${fullName}" military army navy veteran service`),

        // Search 3 -- Media appearances and press
        firecrawlSearch(`"${fullName}" interview podcast speaker conference`),

        // Search 4 -- Creative and personal interests
        firecrawlSearch(`"${fullName}" photography art music hobby passion`),

        // Search 5 -- Entertainment and public profiles
        firecrawlSearch(`"${fullName}" actor film IMDB performance`),

        // Search 6 -- International background
        firecrawlSearch(`"${fullName}" international abroad overseas travel lived`),

        // Search 7 -- Academic and research
        firecrawlSearch(`"${fullName}" research published professor university`),

        // Search 8 -- Community and civic
        firecrawlSearch(`"${fullName}" Wisconsin chamber community board nonprofit volunteer`)

      ]).then(searchResults => {
        const allResults = []
        searchResults.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value?.length > 0) {
            r.value.slice(0, 2).forEach(item => {
              allResults.push({
                searchCategory: ['General', 'Military', 'Media', 'Creative', 'Entertainment', 'International', 'Academic', 'Community'][i],
                title: item.title,
                url: item.url,
                description: item.description,
                content: item.markdown?.substring(0, 400)
              })
            })
          }
        })

        results.webSearch = {
          source: 'Firecrawl Deep Web Search',
          status: allResults.length > 0 ? 'results_found' : 'no_results',
          totalResults: allResults.length,
          results: allResults,
          confidence: 'medium'
        }
      })
    )

    // IMDB -- actor and public figure search
    tasks.push(
      firecrawlScrape(
        `https://www.imdb.com/find/?q=${encodeURIComponent(fullName)}&s=nm`,
        `Find any IMDB entries for "${fullName}". Extract: name, known for, profession, any notable credits or appearances. If none found say "Not found on IMDB".`
      ).then(data => {
        if (data && data !== 'Not found on IMDB') {
          results.imdb = {
            source: 'IMDB',
            status: 'found',
            data,
            confidence: 'high',
            wowFactor: 'HIGH -- unexpected creative side nobody else will know about'
          }
        }
      })
    )

    // Fine Art America -- artist and photographer search
    tasks.push(
      firecrawlScrape(
        `https://fineartamerica.com/profiles/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        `Find any art or photography work by "${fullName}". Extract: bio, artistic style, subjects photographed, number of works, any notable collections or sales. If not found say "Not found".`
      ).then(data => {
        if (data && data !== 'Not found') {
          results.fineArt = {
            source: 'Fine Art America',
            status: 'found',
            data,
            confidence: 'high',
            wowFactor: 'HIGH -- personal passion that creates instant connection'
          }
        }
      })
    )

    // Facebook deeper search via Firecrawl
    if (facebookUrl) {
      tasks.push(
        firecrawlScrape(
          facebookUrl,
          `Extract everything publicly visible on this Facebook profile for "${fullName}": current location, hometown, work history, education, family members mentioned, hobbies and interests, recent public posts, groups, life events. Be thorough -- extract every public detail.`
        ).then(data => {
          if (data) {
            results.facebookDeep = {
              source: 'Facebook Profile (deep)',
              status: 'scraped',
              data: typeof data === 'string' ? data.substring(0, 1000) : JSON.stringify(data).substring(0, 1000),
              confidence: 'high',
              wowFactor: 'HIGH -- family details, hobbies, life events nobody else researches'
            }
          }
        })
      )
    }

    // Geneva College / University faculty page search
    tasks.push(
      firecrawlScrape(
        `https://www.google.com/search?q="${encodeURIComponent(fullName)}" faculty professor bio site:edu`,
        `Find any university faculty bio for "${fullName}". Extract: full biography, academic background, research interests, publications, courses taught, professional history before academia.`
      ).then(data => {
        if (data) {
          results.facultyBio = {
            source: 'University Faculty Bio',
            status: 'scraped',
            data: typeof data === 'string' ? data.substring(0, 800) : JSON.stringify(data).substring(0, 800),
            confidence: 'medium'
          }
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
