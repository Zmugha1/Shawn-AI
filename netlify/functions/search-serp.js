// netlify/functions/search-serp.js
// SerpAPI multi-engine search
// Handles: Google Search, Google News, Google Maps, Maps Reviews, Facebook Profile

export const handler = async (event) => {
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

    // 3. Google Maps -- business owners
    if (businessName || archetype?.includes('Business') || archetype?.includes('Restaurant')) {
      const mapQuery = businessName || `${fullName} ${location}`
      searches.push(
        serpFetch({
          engine: 'google_maps',
          q: mapQuery,
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
              hours: p.hours
            })),
            confidence: 'high'
          }
        }).catch(() => { results.maps = { source: 'Google Maps', error: true } })
      )

      // 4. Yelp -- restaurant owners specifically
      if (archetype?.includes('Restaurant')) {
        const yelpQuery = businessName || fullName
        searches.push(
          serpFetch({
            engine: 'yelp',
            find_desc: yelpQuery,
            find_loc: location
          }).then(data => {
            results.yelp = {
              source: 'Yelp',
              results: (data?.organic_results || []).slice(0, 3).map(r => ({
                name: r.title,
                rating: r.rating,
                reviews: r.reviews,
                snippet: r.snippet,
                categories: r.categories
              })),
              confidence: 'medium'
            }
          }).catch(() => { results.yelp = { source: 'Yelp', error: true } })
        )
      }
    }

    // 5. Facebook Profile -- if URL provided or search by name
    if (facebookUrl) {
      searches.push(
        serpFetch({
          engine: 'facebook_profile',
          profile_url: facebookUrl
        }).then(data => {
          results.facebook = {
            source: 'Facebook Profile',
            profile: {
              name: data?.name,
              about: data?.about,
              work: data?.work,
              education: data?.education,
              location: data?.location
            },
            confidence: 'medium'
          }
        }).catch(() => { results.facebook = { source: 'Facebook', error: true } })
      )
    } else {
      // Search Facebook by name
      searches.push(
        serpFetch({
          engine: 'google',
          q: `site:facebook.com "${fullName}" ${location}`,
          num: 3
        }).then(data => {
          results.facebook = {
            source: 'Facebook (search)',
            results: (data?.organic_results || []).slice(0, 2).map(r => ({
              title: r.title,
              snippet: r.snippet,
              link: r.link
            })),
            confidence: 'low',
            note: 'Provide Facebook URL for deeper profile access'
          }
        }).catch(() => { results.facebook = { source: 'Facebook', error: true } })
      )
    }

    // 6. Google Events -- community involvement
    searches.push(
      serpFetch({
        engine: 'google_events',
        q: `${fullName} ${location} event`,
        hl: 'en'
      }).then(data => {
        results.events = {
          source: 'Google Events',
          events: (data?.events_results || []).slice(0, 3).map(e => ({
            title: e.title,
            date: e.date?.when,
            address: e.address,
            description: e.description?.substring(0, 200)
          })),
          confidence: 'medium'
        }
      }).catch(() => { results.events = { source: 'Google Events', events: [] } })
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
