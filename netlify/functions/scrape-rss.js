// netlify/functions/scrape-rss.js
// Scrapes Wisconsin RSS feeds -- free, no keys needed
// Scans for prospect name mentions across Wisconsin business news

const RSS_FEEDS = {
  business: [
    { name: 'BizTimes Milwaukee', url: 'https://biztimes.com/feed/' },
    { name: 'Milwaukee Business Journal', url: 'https://www.bizjournals.com/milwaukee/rss/news.rss' },
    { name: 'WisBusiness', url: 'https://wisbusiness.com/feed/' },
    { name: 'Wisconsin State Journal Business', url: 'https://madison.com/business/feed/' }
  ],
  general: [
    { name: 'Milwaukee Journal Sentinel', url: 'https://www.jsonline.com/arcio/rss/' },
    { name: 'AP Wisconsin', url: 'https://apnews.com/hub/wisconsin.rss' }
  ],
  legal: [
    { name: 'Wisconsin Law Journal', url: 'https://wislawjournal.com/feed/' }
  ],
  restaurant: [
    { name: 'OnMilwaukee Food', url: 'https://onmilwaukee.com/dining/rss/' },
    { name: 'Milwaukee Record Food', url: 'https://milwaukeerecord.com/food-drink/feed/' }
  ],
  financial: [
    { name: 'CFP Board News', url: 'https://www.cfp.net/rss' },
    { name: 'FINRA Investor News', url: 'https://www.finra.org/rss/investor-news' },
    { name: 'IRS News Releases', url: 'https://www.irs.gov/newsroom/news-releases-for-current-month.rss' }
  ]
}

const parseRSS = (xml) => {
  const items = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const item = match[1]
    const title = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || ''
    const description = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description[^>]*>([\s\S]*?)<\/description>/)?.[1] || ''
    const link = item.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] || ''
    const pubDate = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1] || ''

    if (title) {
      items.push({
        title: title.replace(/<[^>]+>/g, '').trim(),
        description: description.replace(/<[^>]+>/g, '').trim().substring(0, 300),
        link: link.trim(),
        pubDate: pubDate.trim()
      })
    }
  }
  return items
}

const searchFeed = async (feed, searchTerms) => {
  try {
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      signal: AbortSignal.timeout(6000)
    })

    if (!response.ok) return null

    const xml = await response.text()
    const items = parseRSS(xml)

    const matches = items.filter(item => {
      const content = `${item.title} ${item.description}`.toLowerCase()
      return searchTerms.some(term => content.includes(term.toLowerCase()))
    })

    return matches.length > 0 ? {
      feedName: feed.name,
      feedUrl: feed.url,
      matches: matches.slice(0, 3)
    } : null

  } catch {
    return null
  }
}

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
    const { fullName, businessName, archetype } = JSON.parse(event.body || '{}')

    if (!fullName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'fullName required' }) }
    }

    // Build search terms from available data
    const searchTerms = [fullName]
    if (businessName) searchTerms.push(businessName)

    // Add first and last name separately for broader matching
    const nameParts = fullName.split(' ')
    if (nameParts.length >= 2) {
      searchTerms.push(nameParts[0]) // First name only -- less precise but catches more
    }

    // Determine which feeds to scan based on archetype
    const feedsToScan = [
      ...RSS_FEEDS.general,
      ...RSS_FEEDS.business
    ]

    if (archetype?.toLowerCase().includes('restaurant')) {
      feedsToScan.push(...RSS_FEEDS.restaurant)
    }
    if (archetype?.toLowerCase().includes('legal') || archetype?.toLowerCase().includes('complex')) {
      feedsToScan.push(...RSS_FEEDS.legal)
    }

    // Scan all selected feeds in parallel
    const scanResults = await Promise.allSettled(
      feedsToScan.map(feed => searchFeed(feed, [fullName, ...(businessName ? [businessName] : [])]))
    )

    const mentions = scanResults
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        source: 'RSS Feeds -- Wisconsin Business News',
        status: mentions.length === 0 ? 'no_mentions_found' : 'mentions_found',
        totalMentions: mentions.length,
        feedsScanned: feedsToScan.length,
        mentions,
        confidence: 'medium',
        note: 'Free RSS scan -- Wisconsin business and general news'
      })
    }

  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        source: 'RSS Feeds',
        status: 'error',
        mentions: [],
        error: err.message,
        confidence: 'low'
      })
    }
  }
}
