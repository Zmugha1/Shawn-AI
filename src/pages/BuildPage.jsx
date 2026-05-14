import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  { label: 'Checking Wisconsin court records', src: 'CCAP', key: 'ccap' },
  { label: 'Searching business registrations', src: 'Wisconsin DFI', key: 'dfi' },
  { label: 'Scanning Google presence', src: 'SerpAPI -- Google', key: 'google' },
  { label: 'Checking recent news', src: 'SerpAPI -- News', key: 'news' },
  { label: 'Searching business reviews', src: 'SerpAPI -- Maps + Yelp', key: 'maps' },
  { label: 'Scanning Facebook profile', src: 'SerpAPI -- Facebook', key: 'facebook' },
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
      const res = await fetch('/.netlify/functions/scrape-ccap', {
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
      const res = await fetch('/.netlify/functions/scrape-dfi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: prospect.businessName, personName: prospect.fullName })
      })
      scrapedData.dfi = await res.json()
      setStep(1, 'done')
    } catch { setStep(1, 'error'); scrapedData.dfi = null }

    // Steps 2-5: SerpAPI (parallel)
    setStep(2, 'active')
    setStep(3, 'active')
    setStep(4, 'active')
    setStep(5, 'active')
    try {
      const res = await fetch('/.netlify/functions/search-serp', {
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
    } catch {
      setStep(2, 'error')
      setStep(3, 'error')
      setStep(4, 'error')
      setStep(5, 'error')
      scrapedData.serp = null
    }

    // Step 6: RSS
    setStep(6, 'active')
    try {
      const res = await fetch('/.netlify/functions/scrape-rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: prospect.fullName,
          businessName: prospect.businessName,
          archetype: prospect.archetype
        })
      })
      scrapedData.rss = await res.json()
      setStep(6, 'done')
    } catch { setStep(6, 'error'); scrapedData.rss = null }

    // Step 7: STZ layer applied (local, instant)
    setStep(7, 'active')
    await new Promise(r => setTimeout(r, 600))
    setStep(7, 'done')

    // Step 8: Generate brief
    setStep(8, 'active')
    try {
      const res = await fetch('/.netlify/functions/generate-brief-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect, scrapedData })
      })
      const result = await res.json()

      if (result.error) throw new Error(result.error)

      // Save everything to localStorage
      const savedProspects = JSON.parse(localStorage.getItem('prospects') || '[]')
      const idx = savedProspects.findIndex(p => p.id === prospect.id)
      if (idx >= 0) {
        savedProspects[idx] = { ...savedProspects[idx], scrapedData, brief: result.brief, briefGeneratedAt: new Date().toISOString() }
      }
      localStorage.setItem('prospects', JSON.stringify(savedProspects))

      clearInterval(timer)
      setStep(8, 'done')

      // Navigate to brief
      setTimeout(() => navigate(`/brief/${prospect.id}`), 600)

    } catch (err) {
      setStep(8, 'error')
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
