import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  { label: 'Checking Wisconsin court records', src: 'CCAP', key: 'ccap' },
  { label: 'Searching business registrations', src: 'Wisconsin DFI', key: 'dfi' },
  { label: 'Scanning Google presence', src: 'SerpAPI -- Google', key: 'google' },
  { label: 'Checking recent news', src: 'SerpAPI -- News', key: 'news' },
  { label: 'Finding LinkedIn profile', src: 'SerpAPI -- LinkedIn', key: 'linkedin' },
  { label: 'Searching business reviews', src: 'SerpAPI -- Maps + Reviews', key: 'maps' },
  { label: 'Scanning Facebook presence', src: 'SerpAPI -- Facebook', key: 'facebook' },
  { label: 'Checking YouTube presence', src: 'SerpAPI -- YouTube', key: 'youtube' },
  { label: 'Scanning community events', src: 'SerpAPI -- Events', key: 'events' },
  { label: 'Reading Wisconsin RSS feeds', src: 'RSS -- Free', key: 'rss' },
  { label: 'Applying your 10 criteria', src: 'STZ Layer', key: 'stz' },
  { label: 'Generating your brief', src: 'Anthropic API', key: 'brief' }
]

export default function BuildPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStates, setStepStates] = useState(Array(STEPS.length).fill('pending'))
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const prospect = JSON.parse(sessionStorage.getItem('currentProspect') || 'null')
    if (!prospect) { navigate('/new'); return }

    const timer = setInterval(() => setElapsed(e => e + 0.1), 100)
    runPipeline(prospect, timer)

    return () => clearInterval(timer)
  }, [])

  const setStep = (index, state) => {
    setStepStates(prev => {
      const next = [...prev]
      next[index] = state
      return next
    })
    setCurrentStep(index)
  }

  const runPipeline = async (prospect, timer) => {
    const scrapedData = {}
    const nameParts = prospect.fullName.trim().split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || nameParts[0]

    // Step 0: CCAP
    setStep(0, 'active')
    try {
      const res = await fetch('https://shawnintel.netlify.app/.netlify/functions/scrape-ccap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName })
      })
      scrapedData.ccap = await res.json()
      setStep(0, 'done')
    } catch { setStep(0, 'error'); scrapedData.ccap = null }

    // Step 1: DFI
    setStep(1, 'active')
    try {
      const res = await fetch('https://shawnintel.netlify.app/.netlify/functions/scrape-dfi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: prospect.businessName, personName: prospect.fullName })
      })
      scrapedData.dfi = await res.json()
      setStep(1, 'done')
    } catch { setStep(1, 'error'); scrapedData.dfi = null }

    // Steps 2-8: SerpAPI (parallel)
    setStep(2, 'active')
    setStep(3, 'active')
    setStep(4, 'active')
    setStep(5, 'active')
    setStep(6, 'active')
    setStep(7, 'active')
    setStep(8, 'active')
    try {
      const res = await fetch('https://shawnintel.netlify.app/.netlify/functions/search-serp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: prospect.fullName,
          city: prospect.city,
          businessName: prospect.businessName,
          archetype: prospect.archetype,
          linkedinUrl: prospect.linkedinUrl,
          facebookUrl: prospect.facebookUrl
        })
      })
      scrapedData.serp = await res.json()
      setStep(2, 'done')
      setStep(3, 'done')
      setStep(4, 'done')
      setStep(5, 'done')
      setStep(6, 'done')
      setStep(7, 'done')
      setStep(8, 'done')
    } catch {
      setStep(2, 'error')
      setStep(3, 'error')
      setStep(4, 'error')
      setStep(5, 'error')
      setStep(6, 'error')
      setStep(7, 'error')
      setStep(8, 'error')
      scrapedData.serp = null
    }

    // Step 9: RSS
    setStep(9, 'active')
    try {
      const res = await fetch('https://shawnintel.netlify.app/.netlify/functions/scrape-rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: prospect.fullName,
          businessName: prospect.businessName,
          archetype: prospect.archetype
        })
      })
      scrapedData.rss = await res.json()
      setStep(9, 'done')
    } catch { setStep(9, 'error'); scrapedData.rss = null }

    // Step 10: STZ layer applied (local, instant)
    setStep(10, 'active')
    await new Promise(r => setTimeout(r, 600))
    setStep(10, 'done')

    // Step 11: Generate brief -- called directly from browser, no timeout limit
    setStep(11, 'active')
    try {
      const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

      if (!ANTHROPIC_KEY) {
        throw new Error('VITE_ANTHROPIC_API_KEY not configured in Netlify environment variables')
      }

      const nameParts2 = prospect.fullName.trim().split(' ')
      const contextParts = []

      contextParts.push(`PROSPECT: ${prospect.fullName}, ${prospect.city || 'Wisconsin'}
Referral: ${prospect.referral || 'Not provided'}
Why coming: ${prospect.whyComing || 'Not provided'}
Shawn knows: ${prospect.shawnNotes || 'Not provided'}
Business: ${prospect.businessName || 'Not provided'}`)

      if (scrapedData?.ccap) {
        contextParts.push(`CCAP: ${scrapedData.ccap.status}. Cases: ${scrapedData.ccap.totalCases || 0}. ${scrapedData.ccap.cases?.slice(0,2).map(c => c.caseType + ' ' + c.fileDate + ' ' + c.status).join(', ') || 'None'}`)
      }

      if (scrapedData?.serp?.results?.google?.organicResults?.length > 0) {
        contextParts.push(`GOOGLE: ${scrapedData.serp.results.google.organicResults.slice(0,3).map(r => r.title + ': ' + r.snippet).join(' | ')}`)
      }

      if (scrapedData?.serp?.results?.news?.articles?.length > 0) {
        contextParts.push(`NEWS: ${scrapedData.serp.results.news.articles.slice(0,2).map(a => a.title).join(' | ')}`)
      }

      if (scrapedData?.serp?.results?.maps?.businesses?.length > 0) {
        contextParts.push(`MAPS: ${scrapedData.serp.results.maps.businesses.slice(0,2).map(b => b.title + ' ' + (b.rating || '') + ' stars').join(' | ')}`)
      }

      if (scrapedData?.rss?.mentions?.length > 0) {
        contextParts.push(`RSS: ${scrapedData.rss.mentions.slice(0,2).map(m => m.feedName + ': ' + m.matches[0]?.title).join(' | ')}`)
      }

      const systemPrompt = `You are Shawn Intel, pre-meeting intelligence for Shawn, a CFP with 30 years experience in Wisconsin. Apply his 10 criteria. Be concise -- 2 sentences max per criterion.

CRITERIA: 1.Comfort/Intent 2.Hidden Pain 3.Background/CCAP 4.Mutual Connections 5.Business Context 6.Family/Household 7.Decision Style 8.Right Analogy 9.What to Listen For 10.What Not to Assume

ANALOGIES: Foundation(builders) | Specialist of Specialists(medical) | Kitchen Prep(restaurants) | Business Plan(sales/exec) | Grandmother's Buick(retirees 65+) | GP Coordinates(skeptics)

CFP ETHICS: No product recommendations. Flag uncertainty. Shawn reviews everything.

OUTPUT: Valid JSON only. No markdown. No extra text before or after.
{"archetype":"Business Owner Exit|Crisis Arrival|Information Seeker|The Cudahy Couple|Complex High Risk|Retirement Planning|Young Family|Other","archetypeRisk":"low|medium|high","ccapSummary":"one sentence","criteria":[{"n":"01","label":"Comfort and Intent","flag":"clear|watch|alert","flagText":"label","body":"2 sentences","source":"source"}],"grader":[{"label":"Net Worth Trajectory","value":50,"color":"green|amber|coral","badge":"short"},{"label":"Decision Timeline","value":50,"color":"green|amber|coral","badge":"short"},{"label":"Relationship Complexity","value":50,"color":"green|amber|coral","badge":"short"}],"analogy":{"rec":"name","recWhy":"one sentence","back":"name","backWhy":"when","avoid":"name","avoidWhy":"why"},"openingQuestion":"one question","hiddenPain":"one sentence","dataGaps":["gap1","gap2","gap3"]}`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: contextParts.join('\n\n') }]
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Anthropic error ${response.status}: ${errText}`)
      }

      const data = await response.json()
      const rawText = data.content?.[0]?.text || '{}'

      let brief
      try {
        brief = JSON.parse(rawText)
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/)
        if (match) brief = JSON.parse(match[0])
        else throw new Error('Could not parse brief from response')
      }

      const savedProspects = JSON.parse(localStorage.getItem('prospects') || '[]')
      const idx = savedProspects.findIndex(p => p.id === prospect.id)
      if (idx >= 0) {
        savedProspects[idx] = { ...savedProspects[idx], scrapedData, brief, briefGeneratedAt: new Date().toISOString() }
      }
      localStorage.setItem('prospects', JSON.stringify(savedProspects))

      clearInterval(timer)
      setStep(11, 'done')
      setTimeout(() => navigate(`/brief/${prospect.id}`), 600)

    } catch (err) {
      setStep(11, 'error')
      setError(err.message)
      clearInterval(timer)
    }
  }

  return (
    <div>
      <div className="page-header dark">
        <div>
          <h2 style={{ color: '#fff' }}>Building Intelligence Brief</h2>
          <div className="page-sub light">Scanning public sources and applying your criteria</div>
        </div>
      </div>

      <div className="page-content">
        <div className="build-box fade-in">
          <div className="build-title">Intelligence Pipeline Running</div>

          {STEPS.map((step, i) => (
            <div key={i} className={`bstep ${stepStates[i]}`}>
              <div className="bicon">
                {stepStates[i] === 'done' ? 'v' :
                 stepStates[i] === 'error' ? '!' :
                 i + 1}
              </div>
              <span>{step.label}</span>
              <span className="bsrc">{step.src}</span>
            </div>
          ))}

          <div className="btimer">{elapsed.toFixed(1)}s</div>
        </div>

        {error && (
          <div style={{ background: '#FDF0ED', border: '1px solid var(--coral)', borderRadius: 6, padding: '14px 16px', marginTop: 16 }}>
            <div style={{ fontFamily: 'Courier New', fontSize: 10, color: 'var(--coral)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Error</div>
            <div style={{ fontSize: 13, color: 'var(--navy)' }}>{error}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Check that your API keys are configured in Netlify environment variables.</div>
            <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => navigate('/new')}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  )
}
