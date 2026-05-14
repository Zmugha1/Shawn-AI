// netlify/functions/enrich-person.js
// People Data Labs -- 100 free lookups per month
// One API call returns work history, education,
// social profiles, and more from 1.5B profile database
// Sign up at peopledatalabs.com for free API key
// Add PDL_API_KEY to Netlify environment variables

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const PDL_KEY = process.env.PDL_API_KEY

  try {
    const { firstName, lastName, city } = JSON.parse(event.body || '{}')

    if (!firstName || !lastName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'firstName and lastName required' })
      }
    }

    const results = {}

    // ─────────────────────────────────────────────
    // People Data Labs -- person enrichment
    // Returns work history, education, social profiles
    // ─────────────────────────────────────────────
    if (PDL_KEY) {
      try {
        const params = new URLSearchParams({
          'name': `${firstName} ${lastName}`,
          'location': city ? `${city}, Wisconsin` : 'Wisconsin',
          'pretty': 'true'
        })

        const res = await fetch(
          `https://api.peopledatalabs.com/v5/person/enrich?${params}`,
          {
            headers: {
              'X-Api-Key': PDL_KEY,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
          }
        )

        if (res.ok) {
          const data = await res.json()
          if (data.status === 200 && data.data) {
            const p = data.data
            results.pdl = {
              source: 'People Data Labs',
              status: 'found',
              confidence: `${data.likelihood || 0}/10`,
              profile: {
                fullName: p.full_name,
                currentJobTitle: p.job_title,
                currentCompany: p.job_company_name,
                currentIndustry: p.industry,
                location: p.location_name,
                linkedinUrl: p.linkedin_url,
                twitterUrl: p.twitter_url,
                githubUrl: p.github_url,
                workHistory: (p.experience || []).slice(0, 6).map(e => ({
                  title: e.title?.name,
                  company: e.company?.name,
                  start: e.start_date,
                  end: e.end_date || 'Current',
                  summary: e.summary
                })),
                education: (p.education || []).slice(0, 4).map(e => ({
                  school: e.school?.name,
                  degree: e.degrees?.[0],
                  field: e.majors?.[0],
                  start: e.start_date,
                  end: e.end_date
                })),
                skills: (p.skills || []).slice(0, 10).map(s => s.name),
                interests: (p.interests || []).slice(0, 8).map(i => i.name),
                languages: p.languages || [],
                birthYear: p.birth_year
              }
            }
          } else {
            results.pdl = {
              source: 'People Data Labs',
              status: 'not_found',
              message: 'No profile found in PDL database'
            }
          }
        }
      } catch (e) {
        results.pdl = {
          source: 'People Data Labs',
          status: 'error',
          error: e.message
        }
      }
    } else {
      results.pdl = {
        source: 'People Data Labs',
        status: 'no_key',
        message: 'Add PDL_API_KEY to Netlify environment variables. Free tier: 100 lookups per month at peopledatalabs.com'
      }
    }

    // ─────────────────────────────────────────────
    // FINRA BrokerCheck -- undocumented public API
    // No key required
    // Returns securities licenses and employment
    // ─────────────────────────────────────────────
    try {
      const finraRes = await fetch(
        `https://api.brokercheck.finra.org/search/individual?query=${encodeURIComponent(firstName + ' ' + lastName)}&hl=true&includePrevious=true&wt=json`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000)
        }
      )
      if (finraRes.ok) {
        const finraData = await finraRes.json()
        const hits = finraData?.hits?.hits || []
        if (hits.length > 0) {
          results.finra = {
            source: 'FINRA BrokerCheck',
            status: 'registered',
            profiles: hits.slice(0, 2).map(h => {
              const s = h._source || {}
              return {
                name: `${s.ind_firstname} ${s.ind_lastname}`,
                currentEmployer: s.ind_employments?.[0]?.bc_emp_name,
                hasDisclosures: s.ind_disc_fl === 'Y',
                licenses: (s.ind_exams || []).slice(0, 5).map(e => e.exam_name),
                registeredStates: s.ind_ia_state_reg || []
              }
            }),
            wowFactor: 'HIGH -- securities license or disciplinary history'
          }
        } else {
          results.finra = {
            source: 'FINRA BrokerCheck',
            status: 'not_registered',
            message: 'Not a registered securities professional'
          }
        }
      }
    } catch (e) {
      results.finra = {
        source: 'FINRA BrokerCheck',
        status: 'error',
        error: e.message
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        results,
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
