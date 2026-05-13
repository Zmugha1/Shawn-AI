// netlify/functions/scrape-ccap.js
// Scrapes Wisconsin Circuit Court Access (CCAP) -- public record, no key needed
// wcca.wicourts.gov

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { firstName, lastName } = JSON.parse(event.body || '{}')

    if (!firstName || !lastName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'firstName and lastName required' })
      }
    }

    // CCAP public search URL
    const searchUrl = `https://wcca.wicourts.gov/jsonRegs/searchResults;jsessionid=?search=true&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&countyNo=&caseNo=&filingDate=&filingDateRange=&closedIndicator=&status=&caseType=&classification=`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://wcca.wicourts.gov/'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      // Fallback: try the HTML search endpoint
      const htmlUrl = `https://wcca.wicourts.gov/caseSearch.do?search=true&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          source: 'CCAP Wisconsin',
          status: 'manual_check_required',
          searchUrl: htmlUrl,
          message: `Manual CCAP check recommended for ${firstName} ${lastName}`,
          cases: [],
          note: 'Direct API unavailable -- use search URL for manual verification'
        })
      }
    }

    const data = await response.json()
    const cases = data.cases || data.results || []

    const processed = cases.slice(0, 10).map(c => ({
      caseNumber: c.caseNo || c.caseNumber || 'Unknown',
      caseType: c.caseType || 'Unknown',
      fileDate: c.filingDate || c.fileDate || 'Unknown',
      status: c.status || 'Unknown',
      county: c.countyName || c.county || 'Unknown',
      caption: c.caption || `${lastName}, ${firstName}`
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        source: 'CCAP Wisconsin',
        status: cases.length === 0 ? 'clean' : 'records_found',
        totalCases: cases.length,
        cases: processed,
        searchUrl: `https://wcca.wicourts.gov/caseSearch.do?search=true&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`,
        confidence: 'high',
        note: 'Wisconsin Circuit Court public records'
      })
    }

  } catch (err) {
    // Return a usable result even on error -- never block the brief
    const { firstName = '', lastName = '' } = JSON.parse(event.body || '{}')
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        source: 'CCAP Wisconsin',
        status: 'check_manually',
        cases: [],
        searchUrl: `https://wcca.wicourts.gov/caseSearch.do?search=true&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`,
        confidence: 'low',
        error: err.message,
        note: 'Automated check failed -- manual verification recommended'
      })
    }
  }
}
