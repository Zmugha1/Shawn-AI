// netlify/functions/scrape-wisconsin.js
// Wisconsin-specific public intelligence sources
// Priority 1: Unclaimed Property -- Wisconsin State Treasurer
// Priority 2: AssessorData.org -- Property records Waukesha County
// Priority 3: FINRA BrokerCheck -- Employment and disclosure history
// Priority 4: Wisconsin DPCP -- Professional license lookup
// Priority 5: UCC Filings -- Business leverage signals
// All sources are free and public. No key required.

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

  try {
    const { firstName, lastName, fullName, city, businessName } = JSON.parse(event.body || '{}')

    if (!firstName || !lastName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'firstName and lastName required' })
      }
    }

    const results = {}

    // Helper: Firecrawl scrape with extract prompt
    const firecrawlScrape = async (url, prompt) => {
      if (!FIRECRAWL_KEY) return null
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
            extract: { prompt }
          }),
          signal: AbortSignal.timeout(12000)
        })
        if (!res.ok) return null
        const data = await res.json()
        return data?.data?.extract || data?.data?.markdown || null
      } catch { return null }
    }

    // Helper: plain fetch for JSON APIs
    const apiFetch = async (url) => {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(8000)
        })
        if (!res.ok) return null
        return await res.json()
      } catch { return null }
    }

    const tasks = []

    // ─────────────────────────────────────────────
    // PRIORITY 1 -- Wisconsin Unclaimed Property
    // Wisconsin State Treasurer public search
    // The WOW moment -- hand them money they forgot
    // ─────────────────────────────────────────────
    tasks.push(
      firecrawlScrape(
        `https://www.statetreasury.wisconsin.gov/Pages/UnclaimedProperty/Home.aspx`,
        `Search for unclaimed property belonging to "${firstName} ${lastName}" in Wisconsin. 
        Extract: any property found with owner name, property type, amount if shown, 
        holder name, and claim instructions. If nothing found say "No unclaimed property found".`
      ).then(async data => {
        // Also try the direct search URL
        const searchData = await firecrawlScrape(
          `https://apps2.revenue.wi.gov/UCPSearch/app/home`,
          `Find any unclaimed property for the name "${firstName} ${lastName}". 
          Extract property type, reported amount, holder company name. 
          If none found say "No unclaimed property found".`
        )

        results.unclaimedProperty = {
          source: 'Wisconsin Unclaimed Property',
          sourceUrl: 'https://www.statetreasury.wisconsin.gov/Pages/UnclaimedProperty/Home.aspx',
          status: (data || searchData) ? 'checked' : 'unavailable',
          data: searchData || data || 'No unclaimed property found',
          wowFactor: 'HIGH -- hand them money they forgot about',
          confidence: 'medium'
        }
      })
    )

    // ─────────────────────────────────────────────
    // PRIORITY 2 -- Property Records
    // AssessorData.org aggregates Wisconsin county data
    // The Pewaukee pattern detector
    // ─────────────────────────────────────────────
    tasks.push(
      firecrawlScrape(
        `https://assessordata.org/search/?state=wi&county=waukesha&q=${encodeURIComponent(lastName)}`,
        `Find property records owned by "${firstName} ${lastName}" in Wisconsin.
        Extract for each property: owner name, property address, assessed value, 
        purchase price if available, year purchased, property type, lot size, 
        number of mortgages on file. If none found say "No property records found".`
      ).then(async data => {
        // Also try Milwaukee County for broader coverage
        const milwaukeeData = !data ? await firecrawlScrape(
          `https://assessordata.org/search/?state=wi&county=milwaukee&q=${encodeURIComponent(lastName)}`,
          `Find property records owned by "${firstName} ${lastName}" in Wisconsin.
          Extract: property address, assessed value, purchase price, year purchased.`
        ) : null

        results.propertyRecords = {
          source: 'Wisconsin Property Records (AssessorData)',
          sourceUrl: `https://assessordata.org/search/?state=wi&county=waukesha&q=${encodeURIComponent(lastName)}`,
          status: (data || milwaukeeData) ? 'scraped' : 'unavailable',
          data: data || milwaukeeData || 'No property records found',
          wowFactor: 'HIGH -- reveals house poor pattern or real wealth before they say a word',
          confidence: data ? 'high' : 'medium'
        }
      })
    )

    // ─────────────────────────────────────────────
    // PRIORITY 3 -- FINRA BrokerCheck
    // Undocumented public API -- no key required
    // Reveals securities licenses, employment history,
    // and any disciplinary disclosures
    // ─────────────────────────────────────────────
    tasks.push(
      apiFetch(
        `https://api.brokercheck.finra.org/search/individual?query=${encodeURIComponent(firstName + ' ' + lastName)}&hl=true&includePrevious=true&wt=json`
      ).then(async data => {
        let brokerData = null

        if (data?.hits?.hits?.length > 0) {
          const hits = data.hits.hits.slice(0, 3)
          brokerData = hits.map(h => {
            const s = h._source || {}
            return {
              name: s.ind_firstname + ' ' + s.ind_lastname,
              status: s.ind_bc_scope || 'Unknown',
              currentEmployer: s.ind_employments?.[0]?.bc_emp_name || 'Not listed',
              employmentHistory: (s.ind_employments || []).slice(0, 4).map(e => ({
                firm: e.bc_emp_name,
                startDate: e.bc_emp_reg_begin_dt,
                endDate: e.bc_emp_reg_end_dt || 'Current'
              })),
              hasDisclosures: s.ind_disc_fl === 'Y',
              disclosureCount: s.ind_disc_count || 0,
              licenses: (s.ind_exams || []).slice(0, 5).map(e => e.exam_name),
              registeredStates: s.ind_ia_state_reg || []
            }
          })
        }

        results.finraBrokerCheck = {
          source: 'FINRA BrokerCheck',
          sourceUrl: `https://brokercheck.finra.org/individual/summary/${firstName}-${lastName}`,
          status: brokerData ? 'found' : 'not_registered',
          data: brokerData || 'Not registered with FINRA -- not a licensed securities professional',
          wowFactor: 'MEDIUM -- reveals if prospect held financial licenses or had disciplinary history',
          confidence: 'high'
        }
      })
    )

    // ─────────────────────────────────────────────
    // PRIORITY 4 -- Wisconsin DPCP License Lookup
    // Covers 200+ professions: contractors, real estate,
    // medical, legal, accounting, insurance, engineering
    // ─────────────────────────────────────────────
    tasks.push(
      firecrawlScrape(
        `https://licensesearch.wi.gov/`,
        `Search for professional licenses held by "${firstName} ${lastName}" in Wisconsin.
        Extract: license type, license number, issue date, expiration date, 
        status (active/expired/revoked), any disciplinary actions noted.
        If no licenses found say "No professional licenses found".`
      ).then(async data => {
        // Try direct search URL with name parameter
        const searchData = !data ? await firecrawlScrape(
          `https://licensesearch.wi.gov/Default.aspx?SearchType=IndividualSearch&LastName=${encodeURIComponent(lastName)}&FirstName=${encodeURIComponent(firstName)}`,
          `Extract all professional licenses for "${firstName} ${lastName}". 
          For each license: type, number, status, issue date, expiration.`
        ) : null

        results.professionalLicense = {
          source: 'Wisconsin DPCP License Lookup',
          sourceUrl: 'https://licensesearch.wi.gov/',
          status: (data || searchData) ? 'scraped' : 'unavailable',
          data: data || searchData || 'No professional licenses found',
          wowFactor: 'HIGH for contractors and professionals -- confirms credentials and catches disciplinary history',
          confidence: 'medium'
        }
      })
    )

    // ─────────────────────────────────────────────
    // PRIORITY 5 -- UCC Filings via Wisconsin DFI
    // Reveals business loans and asset pledges
    // Shows how leveraged a business actually is
    // ─────────────────────────────────────────────
    tasks.push(
      firecrawlScrape(
        `https://apps.dfi.wi.gov/apps/uccsearch/Details.aspx?nm=${encodeURIComponent(lastName + ', ' + firstName)}&tp=D`,
        `Find all UCC (Uniform Commercial Code) filings for "${firstName} ${lastName}" 
        or their businesses in Wisconsin.
        Extract: secured party name (the lender), debtor name, filing date, 
        collateral description, status (active/lapsed/terminated).
        If none found say "No UCC filings found".`
      ).then(async data => {
        // Also search by business name if provided
        const businessData = businessName ? await firecrawlScrape(
          `https://apps.dfi.wi.gov/apps/uccsearch/Details.aspx?nm=${encodeURIComponent(businessName)}&tp=D`,
          `Find UCC filings for business "${businessName}". 
          Extract: lender name, filing date, collateral, status.`
        ) : null

        results.uccFilings = {
          source: 'Wisconsin UCC Filings',
          sourceUrl: 'https://apps.dfi.wi.gov/apps/uccsearch/',
          status: (data || businessData) ? 'scraped' : 'unavailable',
          data: data || businessData || 'No UCC filings found',
          businessData: businessData || null,
          wowFactor: 'HIGH for business owners -- shows exactly how leveraged the business is',
          confidence: 'medium'
        }
      })
    )

    // ─────────────────────────────────────────────
    // BONUS -- OpenCorporates multi-state search
    // Catches holding companies and out-of-state entities
    // Free API, no key required
    // ─────────────────────────────────────────────
    tasks.push(
      apiFetch(
        `https://api.opencorporates.com/v0.4/officers/search?q=${encodeURIComponent(firstName + ' ' + lastName)}&jurisdiction_code=us_wi`
      ).then(async data => {
        const officers = data?.results?.officers || []

        // Also search by business name
        const bizData = businessName ? await apiFetch(
          `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(businessName)}&jurisdiction_code=us_wi`
        ) : null

        const companies = bizData?.results?.companies || []

        results.openCorporates = {
          source: 'OpenCorporates',
          status: (officers.length > 0 || companies.length > 0) ? 'found' : 'none_found',
          officerRoles: officers.slice(0, 4).map(o => ({
            name: o.officer?.name,
            role: o.officer?.position,
            company: o.officer?.company?.name,
            jurisdiction: o.officer?.company?.jurisdiction_code,
            status: o.officer?.company?.current_status
          })),
          businessEntities: companies.slice(0, 3).map(c => ({
            name: c.company?.name,
            jurisdiction: c.company?.jurisdiction_code,
            status: c.company?.current_status,
            incorporationDate: c.company?.incorporation_date
          })),
          wowFactor: 'MEDIUM -- catches multi-state business structures',
          confidence: 'high'
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
        sourcesChecked: Object.keys(results).length,
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
