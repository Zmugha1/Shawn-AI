// netlify/functions/generate-brief.js
// Calls Anthropic API server-side using all scraped data
// Applies Shawn's STZ layer to produce the structured brief

export const handler = async (event) => {
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

    const fullContext = contextParts.join('\n\n')

    const systemPrompt = `You are Shawn Intel, a private pre-meeting intelligence assistant built for Shawn, a Certified Financial Planner with 30 years of experience in Wisconsin.

You reason like Shawn. You apply his specific frameworks and produce structured intelligence briefs.

SHAWN'S TEN CRITERIA (apply all ten to every brief):
1. Comfort and Intent -- read why they are really there
2. Hidden Pain Signal -- what is underneath the stated reason
3. Background Check -- what the CCAP data tells you
4. Mutual Connections -- what connections exist
5. Business Context -- meet the business before the money
6. Family and Household -- who are we really planning for
7. Decision Making Style -- fast decider or deliberator
8. The Right Analogy -- which analogy fits this person's world
9. What to Listen For -- change talk vs sustain talk signals
10. What Not to Assume -- flag the gaps clearly

SHAWN'S ANALOGY LIBRARY:
- Foundation analogy: builders, contractors, tradespeople
- Specialist of specialists: medical, academic, credential-focused
- Kitchen prep analogy: restaurant owners, hospitality
- Business plan for personal balance sheet: sales, executives
- Grandmother's Buick: retirees, union workers, over 65
- GP who coordinates: skeptics, complex multi-specialist situations

CFP ETHICS RULES:
- Never make specific financial product recommendations
- Flag uncertainty clearly
- Everything requires Shawn's review before client action
- Use Motivational Interviewing lens: identify change talk vs sustain talk

OUTPUT FORMAT -- respond with valid JSON only, no markdown, no preamble:
{
  "archetype": "one of: Business Owner Exit | Crisis Arrival | Information Seeker | The Cudahy Couple | Complex High Risk | Retirement Planning | Young Family | Other",
  "archetypeRisk": "low | medium | high",
  "ccapSummary": "one sentence on CCAP result",
  "criteria": [
    {
      "n": "01",
      "label": "Comfort and Intent",
      "flag": "clear | watch | alert",
      "flagText": "short label",
      "body": "2-4 sentences applying this criterion to this specific person based on all available data",
      "source": "which data sources informed this"
    }
  ],
  "grader": [
    { "label": "Net Worth Trajectory", "value": 0-100, "color": "green|amber|coral", "badge": "short description" },
    { "label": "Decision Timeline", "value": 0-100, "color": "green|amber|coral", "badge": "short description" },
    { "label": "Relationship Complexity", "value": 0-100, "color": "green|amber|coral", "badge": "short description" }
  ],
  "analogy": {
    "rec": "analogy name",
    "recWhy": "why this analogy fits this specific person",
    "back": "backup analogy name",
    "backWhy": "when to use it",
    "avoid": "analogy to avoid",
    "avoidWhy": "why it will not land"
  },
  "openingQuestion": "the single best first question Shawn should ask this person",
  "hiddenPain": "one sentence on the likely real reason they are here",
  "dataGaps": ["list of things we do not know that Shawn should verify in the first 15 minutes"]
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
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Generate a complete pre-meeting intelligence brief for this prospect.\n\n${fullContext}`
          }
        ]
      }),
      signal: AbortSignal.timeout(30000)
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
        brief = JSON.parse(jsonMatch[0])
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
