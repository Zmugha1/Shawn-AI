import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CRITERIA, ANALOGIES } from '../data/criteria.js'

// ── PROSPECTS PAGE ──────────────────────────────────────────────────────────
export function ProspectsPage() {
  const navigate = useNavigate()
  const [prospects, setProspects] = useState([])

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('prospects') || '[]')
    setProspects(stored)
  }, [])

  const initials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Prospects</h2>
          <div className="page-sub">{prospects.length} prospect{prospects.length !== 1 ? 's' : ''} -- click any card to view their brief</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/new')}>+ New Prospect</button>
      </div>

      <div className="page-content">
        {prospects.length === 0 ? (
          <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, padding: 48, textAlign: 'center' }}>
            <h3 style={{ color: 'var(--navy)', marginBottom: 8 }}>No prospects yet</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Add your first prospect to generate an intelligence brief.</p>
            <button className="btn btn-primary" onClick={() => navigate('/new')}>Add First Prospect</button>
          </div>
        ) : (
          <div className="prospect-grid">
            {prospects.map(p => {
              const ccapStatus = p.scrapedData?.ccap?.status
              const hasBrief = !!p.brief
              const isRisk = ccapStatus === 'records_found' || p.brief?.archetypeRisk === 'high'
              return (
                <div
                  key={p.id}
                  className={`pcard ${isRisk ? 'risk' : ''}`}
                  onClick={() => hasBrief ? navigate(`/brief/${p.id}`) : navigate('/new')}
                >
                  <div className="avatar">{initials(p.fullName)}</div>
                  <h3>{p.fullName}</h3>
                  <div className="pcity">{p.city}</div>
                  {p.brief?.archetype && (
                    <div className={`badge ${isRisk ? 'risk' : ''}`}>{p.brief.archetype}</div>
                  )}
                  <div className="pmeta">
                    {p.referral || 'No referral noted'}<br />
                    {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="ccap-row">
                    <div className={`cdot ${ccapStatus === 'clean' || ccapStatus === 'no_records' ? 'clean' : ccapStatus === 'records_found' ? 'flagged' : 'pending'}`} />
                    <span>CCAP: {ccapStatus === 'clean' || ccapStatus === 'no_records' ? 'Clean' : ccapStatus === 'records_found' ? 'Review' : 'Not checked'}</span>
                  </div>
                  <button className="btn btn-navy btn-full">
                    {hasBrief ? 'View Brief' : 'Generate Brief'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── CRITERIA PAGE ─────────────────────────────────────────────────────────────
export function CriteriaPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Criteria Library</h2>
          <div className="page-sub">Your 10 criteria and analogy library -- captured from your STZ interview</div>
        </div>
      </div>

      <div className="page-content">
        <div className="sec-heading">Your 10 Criteria -- In Your Words</div>

        {CRITERIA.map((c, i) => (
          <div key={i} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, padding: 18, marginBottom: 10 }}>
            <div style={{ fontFamily: 'Courier New', fontSize: 10, color: 'var(--teal)', marginBottom: 3 }}>Criterion {c.n}</div>
            <div style={{ fontSize: 15, color: 'var(--navy)', fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 13, color: '#3a4550', lineHeight: 1.7, marginBottom: 8 }}>{c.body}</div>
            <div style={{ fontFamily: 'Courier New', fontSize: 10, color: 'var(--muted)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>{c.src}</div>
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
        <div className="sec-heading">Your Analogy Library</div>

        {ANALOGIES.map((a, i) => (
          <div key={i} style={{ background: 'var(--navy)', borderRadius: 8, padding: 16, marginBottom: 10, color: '#fff' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal)', marginBottom: 5 }}>{a.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 6 }}>{a.text}</div>
            <div style={{ fontFamily: 'Courier New', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{a.tag}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── STATUS PAGE ───────────────────────────────────────────────────────────────
export function StatusPage() {
  const sources = [
    { src: 'CCAP Wisconsin Circuit Court', type: 'Auto -- public record scrape', status: 'active', note: 'Legal public database' },
    { src: 'Wisconsin DFI Business Records', type: 'Auto -- public record scrape', status: 'active', note: 'Business registrations' },
    { src: 'Wisconsin County Assessor', type: 'Auto -- property records', status: 'active', note: 'Waukesha and Milwaukee counties' },
    { src: 'Google Search', type: 'Auto -- SerpAPI', status: 'active', note: 'General public presence' },
    { src: 'Google News', type: 'Auto -- SerpAPI', status: 'active', note: 'Recent mentions last 30 days' },
    { src: 'Google Maps + Reviews', type: 'Auto -- SerpAPI', status: 'active', note: 'Business owners only' },
    { src: 'Facebook Profile', type: 'Auto -- SerpAPI', status: 'active', note: 'Public profiles only' },
    { src: 'Google Events', type: 'Auto -- SerpAPI', status: 'active', note: 'Community involvement' },
    { src: 'Yelp Reviews', type: 'Auto -- SerpAPI', status: 'active', note: 'Restaurant owners only' },
    { src: 'Wisconsin RSS Feeds', type: 'Auto -- free, no key', status: 'active', note: 'BizTimes, Journal Sentinel, WisBusiness' },
    { src: 'LinkedIn Profile', type: 'Manual -- URL paste', status: 'manual', note: '30 seconds to add' },
    { src: 'Company Website', type: 'Manual -- URL paste', status: 'manual', note: 'Optional but adds depth' },
    { src: 'STZ Criteria Layer', type: 'Auto -- always applied', status: 'active', note: "Shawn's 10 criteria encoded" },
    { src: 'Anthropic AI', type: 'Auto -- brief generation', status: 'active', note: 'claude-sonnet-4-20250514' }
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>System Status</h2>
          <div className="page-sub">Intelligence sources and configuration</div>
        </div>
      </div>

      <div className="page-content">
        <div className="sec-heading">Intelligence Sources</div>
        <div className="status-card">
          {sources.map((s, i) => (
            <div key={i} className="srow">
              <div>
                <div>{s.src}</div>
                <div className="stype">{s.type}</div>
              </div>
              <div className="sind">
                <div className={s.status === 'manual' ? 'sdota' : 'sdotg'} />
                <span>{s.status === 'manual' ? 'Manual input' : 'Active'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="sec-heading" style={{ marginTop: 20 }}>Configuration</div>
        <div className="status-card">
          <div className="srow">
            <div><div>Mode</div><div className="stype">Online testing version</div></div>
            <div style={{ fontFamily: 'Courier New', fontSize: 11, color: 'var(--teal)' }}>Testing</div>
          </div>
          <div className="srow">
            <div><div>ANTHROPIC_API_KEY</div><div className="stype">Add to Netlify environment variables</div></div>
            <div style={{ fontFamily: 'Courier New', fontSize: 11, color: 'var(--muted)' }}>Required</div>
          </div>
          <div className="srow">
            <div><div>SERPAPI_KEY</div><div className="stype">Add to Netlify environment variables</div></div>
            <div style={{ fontFamily: 'Courier New', fontSize: 11, color: 'var(--muted)' }}>Required</div>
          </div>
          <div className="srow">
            <div><div>Production version</div><div className="stype">Installs on your laptop -- Phase 2</div></div>
            <div style={{ fontFamily: 'Courier New', fontSize: 11, color: 'var(--muted)' }}>Planned</div>
          </div>
        </div>

        <div style={{ background: '#EAF7F7', border: '1px solid var(--teal-light)', borderRadius: 8, padding: 16, marginTop: 16 }}>
          <div style={{ fontFamily: 'Courier New', fontSize: 10, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>How to add your API keys</div>
          <div style={{ fontSize: 13, color: 'var(--navy)', lineHeight: 1.8 }}>
            1. Go to your Netlify dashboard<br />
            2. Select this site -- Site settings -- Environment variables<br />
            3. Add ANTHROPIC_API_KEY and SERPAPI_KEY<br />
            4. Redeploy the site<br />
            5. Keys stay server-side -- never exposed in browser
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProspectsPage
