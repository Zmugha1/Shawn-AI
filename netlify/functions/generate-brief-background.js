// netlify/functions/generate-brief.js
// Calls Anthropic API server-side using all scraped data
// Applies Shawn's STZ layer to produce the structured brief

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

  if (!ANTHROPIC_KEY || ANTHROPIC_KEY === 'your_anthropic_key_here') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: 'ANTHROPIC_API_KEY not configured',
        note: 'Add ANTHROPIC_API_KEY to Netlify environment variables'
      })
    }
  }

  try {
    const {
      prospect,
      scrapedData
    } = JSON.parse(event.body || '{}')

    if (!prospect?.fullName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'prospect.fullName required' })
      }
    }

    // Build context string from all scraped sources
    const contextParts = []

    contextParts.push(`PROSPECT INPUT:
Name: ${prospect.fullName}
City: ${prospect.city || 'Wisconsin'}
Referral: ${prospect.referral || 'Not provided'}
Why coming in: ${prospect.whyComing || 'Not provided'}
What Shawn already knows: ${prospect.shawnNotes || 'Not provided'}
Business name: ${prospect.businessName || 'Not provided'}
LinkedIn: ${prospect.linkedinUrl || 'Not provided'}`)

    if (scrapedData?.ccap) {
      const ccap = scrapedData.ccap
      contextParts.push(`CCAP WISCONSIN (court records):
Status: ${ccap.status}
Total cases: ${ccap.totalCases || 0}
${ccap.cases?.length > 0 ? 'Cases found:\n' + ccap.cases.map(c => `  - ${c.caseType} (${c.fileDate}) -- ${c.status} -- ${c.county} County`).join('\n') : 'No court records found'}
Source: ${ccap.searchUrl}`)
    }

    if (scrapedData?.dfi) {
      const dfi = scrapedData.dfi
      contextParts.push(`WISCONSIN DFI BUSINESS RECORDS:
Status: ${dfi.status}
${dfi.entities?.length > 0 ? 'Entities found:\n' + dfi.entities.map(e => `  - ${e.entityName} (${e.entityType}) -- ${e.status}`).join('\n') : 'No business entities found'}`)
    }

    if (scrapedData?.serp?.results) {
      const serp = scrapedData.serp.results

      if (serp.google?.organicResults?.length > 0) {
        contextParts.push(`GOOGLE SEARCH RESULTS:
${serp.google.organicResults.slice(0, 4).map(r => `  - ${r.title}: ${r.snippet}`).join('\n')}`)
      }

      if (serp.news?.articles?.length > 0) {
        contextParts.push(`RECENT NEWS MENTIONS:
${serp.news.articles.slice(0, 3).map(a => `  - ${a.source} (${a.date}): ${a.title}`).join('\n')}`)
      }

      if (serp.maps?.businesses?.length > 0) {
        contextParts.push(`GOOGLE MAPS BUSINESS DATA:
${serp.maps.businesses.map(b => `  - ${b.title}: ${b.rating || 'No rating'} stars (${b.reviews || 0} reviews) -- ${b.address || ''}`).join('\n')}`)
      }

      if (serp.yelp?.results?.length > 0) {
        contextParts.push(`YELP DATA:
${serp.yelp.results.map(r => `  - ${r.name}: ${r.rating || 'No rating'} stars (${r.reviews || 0} reviews)`).join('\n')}`)
      }

      if (serp.facebook?.profile || serp.facebook?.results?.length > 0) {
        const fb = serp.facebook
        if (fb.profile?.name) {
          contextParts.push(`FACEBOOK PROFILE:
Name: ${fb.profile.name}
About: ${fb.profile.about || 'Not available'}
Work: ${fb.profile.work || 'Not available'}`)
        } else if (fb.results?.length > 0) {
          contextParts.push(`FACEBOOK (public search):
${fb.results.map(r => `  - ${r.title}: ${r.snippet}`).join('\n')}`)
        }
      }
    }

    if (scrapedData?.rss?.mentions?.length > 0) {
      contextParts.push(`RSS NEWS MENTIONS:
${scrapedData.rss.mentions.map(m =>
  m.matches.map(a => `  - ${m.feedName}: ${a.title} (${a.pubDate})`).join('\n')
).join('\n')}`)
    }

    // Firecrawl deep scrape results
    if (scrapedData?.firecrawl) {
      const fc = scrapedData.firecrawl

      if (fc.ccap?.data && fc.ccap.data !== 'No records found') {
        contextParts.push(`CCAP COURT RECORDS (Firecrawl verified):
${typeof fc.ccap.data === 'string' ? fc.ccap.data : JSON.stringify(fc.ccap.data)}
Confidence: ${fc.ccap.confidence}`)
      } else if (fc.ccap?.status === 'scraped') {
        contextParts.push(`CCAP COURT RECORDS: No court records found for this person. Verified clean.`)
      }

      if (fc.dfi?.data && fc.dfi.data !== 'No entities found') {
        contextParts.push(`WISCONSIN DFI BUSINESS RECORDS (Firecrawl verified):
${typeof fc.dfi.data === 'string' ? fc.dfi.data : JSON.stringify(fc.dfi.data)}`)
      }

      if (fc.linkedin?.data) {
        contextParts.push(`LINKEDIN PROFILE (full):
${typeof fc.linkedin.data === 'string' ? fc.linkedin.data.substring(0, 800) : JSON.stringify(fc.linkedin.data).substring(0, 800)}`)
      }

      if (fc.company?.data) {
        contextParts.push(`COMPANY WEBSITE (full content):
${typeof fc.company.data === 'string' ? fc.company.data.substring(0, 800) : JSON.stringify(fc.company.data).substring(0, 800)}`)
      }

      if (fc.webSearch?.results?.length > 0) {
        contextParts.push(`FIRECRAWL WEB SEARCH:
${fc.webSearch.results.slice(0, 3).map(r => `  - ${r.title}: ${r.description || r.content || ''}`).join('\n')}`)
      }
    }

    const fullContext = contextParts.join('\n\n')

    const systemPrompt = `You are Shawn Intel, pre-meeting intelligence for Shawn, a CFP with 30 years experience in Wisconsin.

Apply Shawn's 10 criteria to every brief. Be concise -- 2 sentences max per criterion.

CRITERIA: 1.Comfort/Intent 2.Hidden Pain 3.Background/CCAP 4.Mutual Connections 5.Business Context 6.Family/Household 7.Decision Style 8.Right Analogy 9.What to Listen For 10.What Not to Assume

ANALOGIES: Foundation(builders) | Specialist of Specialists(medical/academic) | Kitchen Prep(restaurants) | Business Plan(sales/exec) | Grandmother's Buick(retirees 65+) | GP Coordinates(skeptics)

CFP ETHICS: No product recommendations. Flag uncertainty. Shawn reviews everything.
MI LENS: Note change talk vs sustain talk signals.

OUTPUT: Valid JSON only. No markdown. No preamble.
{
  "archetype": "Business Owner Exit|Crisis Arrival|Information Seeker|The Cudahy Couple|Complex High Risk|Retirement Planning|Young Family|Other",
  "archetypeRisk": "low|medium|high",
  "ccapSummary": "one sentence",
  "criteria": [
    {"n":"01","label":"Comfort and Intent","flag":"clear|watch|alert","flagText":"short label","body":"2 sentences max","source":"data source"}
  ],
  "grader": [
    {"label":"Net Worth Trajectory","value":0-100,"color":"green|amber|coral","badge":"short"},
    {"label":"Decision Timeline","value":0-100,"color":"green|amber|coral","badge":"short"},
    {"label":"Relationship Complexity","value":0-100,"color":"green|amber|coral","badge":"short"}
  ],
  "analogy": {"rec":"name","recWhy":"one sentence","back":"name","backWhy":"when","avoid":"name","avoidWhy":"why"},
  "openingQuestion": "one question",
  "hiddenPain": "one sentence",
  "dataGaps": ["gap1","gap2","gap3"]
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Generate a complete pre-meeting intelligence brief for this prospect.\n\n${fullContext}`
          }
        ]
      }),
      signal: AbortSignal.timeout(20000)
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || '{}'

    // Parse JSON from response
    let brief
    try {
      brief = JSON.parse(rawText)
    } catch {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          brief = JSON.parse(jsonMatch[0])
        } catch {
          // JSON is malformed -- clean it and try again
          const cleaned = jsonMatch[0]
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/[\x00-\x1F\x7F]/g, ' ')
          brief = JSON.parse(cleaned)
        }
      } else {
        throw new Error('Could not parse brief JSON from Anthropic response')
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        brief,
        generatedAt: new Date().toISOString(),
        sourcesUsed: Object.keys(scrapedData || {}).filter(k => scrapedData[k])
      })
    }

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        error: err.message
      })
    }
  }
}
