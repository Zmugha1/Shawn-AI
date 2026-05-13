import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { STZ_SYSTEM_PROMPT } from '../data/criteria.js'

export default function BriefPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [prospect, setProspect] = useState(null)
  const [brief, setBrief] = useState(null)
  const [openCriteria, setOpenCriteria] = useState(new Set([0, 1, 2]))
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [pmLanded, setPmLanded] = useState('')
  const [pmSurprised, setPmSurprised] = useState('')
  const [pmNext, setPmNext] = useState('')
  const [pmSaved, setPmSaved] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    const prospects = JSON.parse(localStorage.getItem('prospects') || '[]')
    const p = prospects.find(x => x.id === id)
    if (!p) { navigate('/'); return }
    setProspect(p)
    setBrief(p.brief || null)

    // Seed chat with opening message
    setChatMessages([{
      role: 'assistant',
      text: `Brief loaded for ${p.fullName}. I have their full intelligence profile -- CCAP, DFI records, Google, News, Maps, Facebook, and RSS feeds -- all filtered through your 10 criteria. What do you want to think through before this meeting?`
    }])
  }, [id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const toggleCriterion = (i) => {
    setOpenCriteria(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userText = chatInput.trim()
    setChatInput('')
    setChatLoading(true)

    const newMessages = [...chatMessages, { role: 'user', text: userText }]
    setChatMessages(newMessages)

    const prospectContext = prospect ? `Name: ${prospect.fullName}\nCity: ${prospect.city}\nReferral: ${prospect.referral || 'Unknown'}\nWhy coming: ${prospect.whyComing || 'Unknown'}\nShawn's notes: ${prospect.shawnNotes || 'None'}` : ''
    const briefContext = brief ? `Archetype: ${brief.archetype}\nHidden pain: ${brief.hiddenPain}\nOpening question: ${brief.openingQuestion}` : ''

    try {
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
          prospectContext,
          briefContext
        })
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.text }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Connection error. Please try again.' }])
    }
    setChatLoading(false)
  }

  const savePostMeeting = () => {
    if (!pmLanded && !pmSurprised && !pmNext) return
    const prospects = JSON.parse(localStorage.getItem('prospects') || '[]')
    const idx = prospects.findIndex(p => p.id === id)
    if (idx >= 0) {
      prospects[idx].postMeeting = { landed: pmLanded, surprised: pmSurprised, nextMove: pmNext, savedAt: new Date().toISOString() }
      localStorage.setItem('prospects', JSON.stringify(prospects))
    }
    setPmSaved(true)
  }

  if (!prospect) return <div style={{ padding: 32 }}>Loading...</div>

  const ccap = prospect.scrapedData?.ccap
  const dfi = prospect.scrapedData?.dfi
  const rss = prospect.scrapedData?.rss

  return (
    <div>
      <div className="page-header dark">
        <div>
          <h2 style={{ color: '#fff' }}>{prospect.fullName}</h2>
          <div className="page-sub light">{prospect.city} -- {brief?.archetype || 'Processing'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-back" onClick={() => navigate('/')}>Back</button>
          <button className="btn btn-primary" onClick={() => window.print()}>Print Brief</button>
        </div>
      </div>

      <div className="page-content">

        {/* SOURCE BAR */}
        <div className="source-bar fade-in">
          <span style={{ color: 'var(--teal)' }}>v</span>
          <span>Intelligence from:</span>
          {ccap && <span style={{ fontFamily: 'Courier New', fontSize: 10, color: 'var(--teal)' }}>CCAP ({ccap.status})</span>}
          {dfi && <span style={{ fontFamily: 'Courier New', fontSize: 10, color: 'var(--teal)' }}>DFI ({dfi.status})</span>}
          <span style={{ fontFamily: 'Courier New', fontSize: 10, color: 'var(--teal)' }}>Google + News + Maps</span>
          {rss?.totalMentions > 0 && <span style={{ fontFamily: 'Courier New', fontSize: 10, color: 'var(--teal)' }}>RSS ({rss.totalMentions} mentions)</span>}
          <span style={{ fontFamily: 'Courier New', fontSize: 10, color: 'var(--teal)' }}>STZ Layer</span>
        </div>

        {!brief ? (
          <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
            Brief not yet generated. Go back and run the intelligence pipeline.
          </div>
        ) : (
          <div className="two-col fade-in">

            {/* LEFT: CRITERIA */}
            <div>
              <div className="sec-heading">Intelligence Brief -- All 10 Criteria</div>

              {(brief.criteria || []).map((c, i) => (
                <div key={i} className="crit-section">
                  <div className="crit-hdr" onClick={() => toggleCriterion(i)}>
                    <span className="crit-num">{c.n}</span>
                    <span className="crit-name">{c.label}</span>
                    <span className={`cflag ${c.flag}`}>{c.flagText}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>
                      {openCriteria.has(i) ? '▼' : '▶'}
                    </span>
                  </div>
                  {openCriteria.has(i) && (
                    <div className={`crit-body ${c.flag}`}>
                      {c.body}
                      {c.source && (
                        <div className="crit-source">Source: {c.source}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Opening Question */}
              {brief.openingQuestion && (
                <div style={{ background: 'var(--navy)', borderRadius: 8, padding: 16, marginTop: 12, color: '#fff' }}>
                  <div style={{ fontFamily: 'Courier New', fontSize: 9, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Best Opening Question</div>
                  <div style={{ fontSize: 14, fontStyle: 'italic', lineHeight: 1.6 }}>"{brief.openingQuestion}"</div>
                </div>
              )}

              {/* Data Gaps */}
              {brief.dataGaps?.length > 0 && (
                <div style={{ background: '#FFFBEC', border: '1px solid var(--gold)', borderRadius: 8, padding: 16, marginTop: 12 }}>
                  <div style={{ fontFamily: 'Courier New', fontSize: 9, color: '#9B7A00', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Verify in First 15 Minutes</div>
                  {brief.dataGaps.map((gap, i) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--navy)', padding: '4px 0', borderBottom: i < brief.dataGaps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      -- {gap}
                    </div>
                  ))}
                </div>
              )}

              {/* Post-Meeting Capture */}
              <div style={{ marginTop: 20 }}>
                <div className="sec-heading">Post-Meeting Capture</div>
                <div className="pm-panel">
                  <h3>How did it go?</h3>
                  <div className="pm-sub">Two or three sentences. The system does the rest.</div>
                  <div className="form-field">
                    <label>What landed</label>
                    <textarea value={pmLanded} onChange={e => setPmLanded(e.target.value)} placeholder="What resonated, what connected..." />
                  </div>
                  <div className="form-field">
                    <label>What surprised you</label>
                    <textarea value={pmSurprised} onChange={e => setPmSurprised(e.target.value)} placeholder="What you did not expect..." />
                  </div>
                  <div className="form-field">
                    <label>Next move</label>
                    <textarea value={pmNext} onChange={e => setPmNext(e.target.value)} placeholder="What you committed to, when you follow up..." />
                  </div>
                  <button className="btn btn-primary" onClick={savePostMeeting} disabled={pmSaved}>
                    {pmSaved ? 'Saved' : 'Save Capture'}
                  </button>
                  {pmSaved && (
                    <div className="pm-insight" style={{ marginTop: 12 }}>
                      <div className="pm-insight-label">Saved</div>
                      Post-meeting capture saved. Lead with the same analogy in meeting two before introducing any new concepts.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: GRADER, ANALOGY, CHAT */}
            <div>
              <div className="sec-heading">Sniff Test Grader</div>
              <div className="grader-panel">
                {(brief.grader || []).map((g, i) => (
                  <div key={i} className="gitem">
                    <div className="glabel">
                      <span>{g.label}</span>
                      <span className={`gbadge ${g.color}`}>{g.badge}</span>
                    </div>
                    <div className="gbar">
                      <div className={`gfill ${g.color}`} style={{ width: `${g.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="sec-heading">Analogy Coach</div>
              {brief.analogy && (
                <div className="analogy-box">
                  <div className="abox-title">Your Recommendation</div>
                  <div className="arec">
                    <div className="arec-label">Lead with this</div>
                    <div className="arec-name">{brief.analogy.rec}</div>
                    <div className="arec-why">{brief.analogy.recWhy}</div>
                  </div>
                  <div className="aback">
                    <div className="aback-label">Backup</div>
                    <div className="aback-name">{brief.analogy.back}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{brief.analogy.backWhy}</div>
                  </div>
                  <div className="aavoid">
                    <div className="aavoid-label">Avoid</div>
                    <div className="aavoid-text">{brief.analogy.avoid} -- {brief.analogy.avoidWhy}</div>
                  </div>
                </div>
              )}

              <div className="sec-heading">Ask Shawn Intel</div>
              <div className="chat-panel">
                <div className="chat-hdr">
                  <h3>Shawn Intel</h3>
                  <span className="ctx-pill">Loaded: {prospect.fullName.split(' ')[0]}</span>
                </div>
                <div className="chat-msgs">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`cmsg ${m.role === 'assistant' ? 'ai' : 'user'}`}>
                      <div className="mlabel">{m.role === 'assistant' ? 'Shawn Intel' : 'Shawn'}</div>
                      {m.text.split('Does this match how you would handle it, or should I adjust?').map((part, j, arr) => (
                        <span key={j}>
                          {part}
                          {j < arr.length - 1 && <div className="approval">Does this match how you would handle it, or should I adjust?</div>}
                        </span>
                      ))}
                    </div>
                  ))}
                  {chatLoading && <div className="cthink">Shawn Intel is thinking...</div>}
                  <div ref={chatEndRef} />
                </div>
                <div className="chat-input-row">
                  <input
                    className="cinput"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Ask about this prospect..."
                  />
                  <button className="csend" onClick={sendChat} disabled={chatLoading}>Send</button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
