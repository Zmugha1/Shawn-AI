// netlify/functions/search-serp.js
// SerpAPI multi-engine search
// Handles: Google Search, Google News, Google Maps, Maps Reviews, Facebook Profile

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const SERPAPI_KEY = process.env.SERPAPI_KEY

  if (!SERPAPI_KEY || SERPAPI_KEY === 'your_serpapi_key_here') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: 'SERPAPI_KEY not configured',
        note: 'Add SERPAPI_KEY to Netlify environment variables',
        results: {}
      })
    }
  }

  try {
    const {
      fullName,
      city,
      businessName,
      archetype,
      linkedinUrl,
      facebookUrl
    } = JSON.parse(event.body || '{}')

    if (!fullName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'fullName required' })
      }
    }

    const location = city ? `${city}, Wisconsin` : 'Wisconsin'
    const results = {}

    // Helper to call SerpAPI
    const serpFetch = async (params) => {
      const url = new URL('https://serpapi.com/search')
      url.searchParams.set('api_key', SERPAPI_KEY)
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
      return res.ok ? res.json() : null
    }

    // Run searches in parallel to save time
    const searches = []

    // 1. Google General Search
    searches.push(
      serpFetch({
        engine: 'google',
        q: `"${fullName}" ${location}`,
        num: 8
      }).then(data => {
        results.google = {
          source: 'Google Search',
          organicResults: (data?.organic_results || []).slice(0, 6).map(r => ({
            title: r.title,
            snippet: r.snippet,
            link: r.link,
            date: r.date
          })),
          knowledgePanel: data?.knowledge_graph ? {
            title: data.knowledge_graph.title,
            description: data.knowledge_graph.description,
            type: data.knowledge_graph.type
          } : null,
          confidence: 'high'
        }
      }).catch(() => { results.google = { source: 'Google Search', error: true } })
    )

    // 2. Google News
    searches.push(
      serpFetch({
        engine: 'google',
        q: `"${fullName}" ${location}`,
        tbm: 'nws',
        num: 6
      }).then(data => {
        results.news = {
          source: 'Google News',
          articles: (data?.news_results || []).slice(0, 5).map(a => ({
            title: a.title,
            snippet: a.snippet,
            source: a.source,
            date: a.date,
            link: a.link
          })),
          confidence: 'high'
        }
      }).catch(() => { results.news = { source: 'Google News', error: true } })
    )

    // 3. LinkedIn via Google
    searches.push(
      serpFetch({
        engine: 'google',
        q: `site:linkedin.com/in "${fullName}" ${location}`,
        num: 3
      }).then(data => {
        results.linkedin = {
          source: 'LinkedIn (via Google)',
          results: (data?.organic_results || []).slice(0, 2).map(r => ({
            title: r.title,
            snippet: r.snippet,
            link: r.link
          })),
          confidence: 'medium',
          note: 'Public LinkedIn profile data via Google index'
        }
      }).catch(() => { results.linkedin = { source: 'LinkedIn', error: true } })
    )

    // 4. Google Maps for business owners
    if (businessName) {
      const mapQuery = businessName || fullName
      searches.push(
        serpFetch({
          engine: 'google_maps',
          q: `${mapQuery} ${location}`,
          type: 'search'
        }).then(data => {
          const places = data?.local_results || []
          results.maps = {
            source: 'Google Maps',
            businesses: places.slice(0, 3).map(p => ({
              title: p.title,
              rating: p.rating,
              reviews: p.reviews,
              address: p.address,
              phone: p.phone,
              type: p.type,
              hours: p.hours?.schedule
            })),
            confidence: 'high'
          }
        }).catch(() => { results.maps = { source: 'Google Maps', error: true } })
      )

      // 5. Google Maps Reviews
      searches.push(
        serpFetch({
          engine: 'google',
          q: `"${businessName || fullName}" reviews site:google.com OR site:yelp.com OR site:bbb.org`,
          num: 5
        }).then(data => {
          results.reviews = {
            source: 'Business Reviews',
            results: (data?.organic_results || []).slice(0, 4).map(r => ({
              title: r.title,
              snippet: r.snippet,
              source: r.displayed_link,
              rating: r.rich_snippet?.top?.detected_extensions?.rating
            })),
            confidence: 'medium'
          }
        }).catch(() => { results.reviews = { source: 'Reviews', error: true } })
      )
    }

    // 6. Google Events -- community involvement
    searches.push(
      serpFetch({
        engine: 'google_events',
        q: `${fullName} ${location}`,
        hl: 'en'
      }).then(data => {
        results.events = {
          source: 'Google Events',
          events: (data?.events_results || []).slice(0, 3).map(e => ({
            title: e.title,
            date: e.date?.when,
            address: e.address?.[0],
            description: e.description?.substring(0, 150)
          })),
          confidence: 'medium'
        }
      }).catch(() => { results.events = { source: 'Google Events', events: [] } })
    )

    // 7. Facebook Profile
    searches.push(
      serpFetch({
        engine: 'google',
        q: `site:facebook.com "${fullName}" ${location}`,
        num: 3
      }).then(data => {
        results.facebook = {
          source: 'Facebook (public)',
          results: (data?.organic_results || []).slice(0, 2).map(r => ({
            title: r.title,
            snippet: r.snippet,
            link: r.link
          })),
          confidence: 'low',
          note: 'Public Facebook presence only'
        }
      }).catch(() => { results.facebook = { source: 'Facebook', error: true } })
    )

    // 8. YouTube -- thought leadership
    searches.push(
      serpFetch({
        engine: 'youtube',
        search_query: `${fullName} ${location} interview OR talk OR presentation`
      }).then(data => {
        const videos = data?.video_results || []
        if (videos.length > 0) {
          results.youtube = {
            source: 'YouTube',
            videos: videos.slice(0, 2).map(v => ({
              title: v.title,
              channel: v.channel?.name,
              views: v.views,
              date: v.published_date,
              link: v.link
            })),
            confidence: 'high',
            note: 'Public video appearances'
          }
        }
      }).catch(() => {})
    )

    // Deep person research -- targeted site searches
    // Step 1: Find their faculty bio page
    searches.push(
      serpFetch({
        engine: 'google',
        q: `"${fullName}" faculty professor bio`,
        num: 5
      }).then(async data => {
        const eduResults = (data?.organic_results || [])
          .filter(r => r.link && (r.link.includes('.edu') || r.link.includes('faculty') || r.link.includes('professor')))
          .slice(0, 2)
        if (eduResults.length > 0) {
          results.facultyBio = {
            source: 'University Faculty Bio',
            results: eduResults.map(r => ({
              title: r.title,
              link: r.link,
              snippet: r.snippet
            })),
            confidence: 'high'
          }
        }
      }).catch(() => {})
    )

    // Step 2: Find Fine Art America profile
    searches.push(
      serpFetch({
        engine: 'google',
        q: `"${fullName}" site:fineartamerica.com`,
        num: 3
      }).then(data => {
        const faaResults = (data?.organic_results || []).slice(0, 2)
        if (faaResults.length > 0) {
          results.fineArt = {
            source: 'Fine Art America',
            results: faaResults.map(r => ({
              title: r.title,
              link: r.link,
              snippet: r.snippet
            })),
            confidence: 'high',
            wowFactor: 'Reveals personal creative passion'
          }
        }
      }).catch(() => {})
    )

    // Step 3: IMDB presence
    searches.push(
      serpFetch({
        engine: 'google',
        q: `"${fullName}" site:imdb.com`,
        num: 3
      }).then(data => {
        const imdbResults = (data?.organic_results || []).slice(0, 2)
        if (imdbResults.length > 0) {
          results.imdb = {
            source: 'IMDB',
            results: imdbResults.map(r => ({
              title: r.title,
              link: r.link,
              snippet: r.snippet
            })),
            confidence: 'high',
            wowFactor: 'Entertainment industry credits -- unexpected angle'
          }
        }
      }).catch(() => {})
    )

    // Step 4: Military and government service
    searches.push(
      serpFetch({
        engine: 'google',
        q: `"${fullName}" military navy army veteran defense government`,
        num: 5
      }).then(data => {
        const milResults = (data?.organic_results || []).slice(0, 3)
        if (milResults.length > 0) {
          results.military = {
            source: 'Military and Government Service',
            results: milResults.map(r => ({
              title: r.title,
              link: r.link,
              snippet: r.snippet
            })),
            confidence: 'medium',
            wowFactor: 'Military background creates instant respect and connection'
          }
        }
      }).catch(() => {})
    )

    // Step 5: International background
    searches.push(
      serpFetch({
        engine: 'google',
        q: `"${fullName}" international abroad overseas lived worked`,
        num: 5
      }).then(data => {
        const intlResults = (data?.organic_results || []).slice(0, 3)
        if (intlResults.length > 0) {
          results.international = {
            source: 'International Background',
            results: intlResults.map(r => ({
              title: r.title,
              link: r.link,
              snippet: r.snippet
            })),
            confidence: 'medium',
            wowFactor: 'International experience signals global perspective'
          }
        }
      }).catch(() => {})
    )

    // Step 6: Speaking and media appearances
    searches.push(
      serpFetch({
        engine: 'google',
        q: `"${fullName}" speaker conference interview podcast presentation`,
        num: 5
      }).then(data => {
        const speakResults = (data?.organic_results || []).slice(0, 3)
        if (speakResults.length > 0) {
          results.speaking = {
            source: 'Speaking and Media',
            results: speakResults.map(r => ({
              title: r.title,
              link: r.link,
              snippet: r.snippet
            })),
            confidence: 'medium',
            wowFactor: 'Thought leadership signals credibility and ambition'
          }
        }
      }).catch(() => {})
    )

    // Wait for all searches to complete
    await Promise.allSettled(searches)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        searchedFor: fullName,
        location,
        results,
        totalSources: Object.keys(results).length,
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
