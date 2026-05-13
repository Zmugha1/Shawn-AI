// netlify/functions/scrape-dfi.js
// Scrapes Wisconsin DFI Corporate Records -- public, no key needed
// wdfi.org/apps/corpsearch

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { businessName, personName } = JSON.parse(event.body || '{}')
    const searchTerm = businessName || personName

    if (!searchTerm) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessName or personName required' })
      }
    }

    // DFI search endpoint
    const searchUrl = `https://wdfi.org/apps/corpsearch/search.aspx?q=${encodeURIComponent(searchTerm)}&type=Simple`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://wdfi.org/apps/corpsearch/'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          source: 'Wisconsin DFI',
          status: 'manual_check_required',
          entities: [],
          searchUrl: `https://wdfi.org/apps/corpsearch/search.aspx?q=${encodeURIComponent(searchTerm)}&type=Simple`,
          confidence: 'low',
          note: 'Manual check recommended'
        })
      }
    }

    const html = await response.text()

    // Extract business entities from DFI HTML response
    const entities = []
    const rowRegex = /<tr[^>]*class="[^"]*results[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
    let match

    while ((match = rowRegex.exec(html)) !== null && entities.length < 5) {
      const row = match[1]
      const nameMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/)
      const entityName = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown'

      const statusMatch = row.match(/Active|Dissolved|Inactive|Delinquent/i)
      const status = statusMatch ? statusMatch[0] : 'Unknown'

      const typeMatch = row.match(/Corporation|LLC|Partnership|LLP/i)
      const entityType = typeMatch ? typeMatch[0] : 'Unknown'

      if (entityName && entityName !== 'Unknown') {
        entities.push({ entityName, status, entityType })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        source: 'Wisconsin DFI',
        status: entities.length === 0 ? 'no_entities_found' : 'entities_found',
        totalFound: entities.length,
        entities,
        searchUrl: `https://wdfi.org/apps/corpsearch/search.aspx?q=${encodeURIComponent(searchTerm)}&type=Simple`,
        confidence: 'high',
        note: 'Wisconsin Department of Financial Institutions -- public business records'
      })
    }

  } catch (err) {
    const { businessName = '', personName = '' } = JSON.parse(event.body || '{}')
    const searchTerm = businessName || personName
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        source: 'Wisconsin DFI',
        status: 'check_manually',
        entities: [],
        searchUrl: `https://wdfi.org/apps/corpsearch/search.aspx?q=${encodeURIComponent(searchTerm)}&type=Simple`,
        confidence: 'low',
        error: err.message,
        note: 'Automated check failed -- manual check recommended'
      })
    }
  }
}
