import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function InputPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    city: '',
    referral: '',
    whyComing: '',
    shawnNotes: '',
    businessName: '',
    linkedinUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    companyUrl: '',
    otherUrl: ''
  })
  const [errors, setErrors] = useState({})

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const validate = () => {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    // Store prospect in sessionStorage and navigate to build page
    const prospect = {
      id: Date.now().toString(),
      ...form,
      createdAt: new Date().toISOString()
    }

    // Save to localStorage for prospects list
    const existing = JSON.parse(localStorage.getItem('prospects') || '[]')
    existing.unshift(prospect)
    localStorage.setItem('prospects', JSON.stringify(existing.slice(0, 50)))

    // Pass to build page via sessionStorage
    sessionStorage.setItem('currentProspect', JSON.stringify(prospect))

    navigate('/build')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>New Prospect</h2>
          <div className="page-sub">Five required fields -- everything else is optional but richer</div>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/')}>Cancel</button>
      </div>

      <div className="page-content">

        {/* REQUIRED */}
        <div className="form-section">
          <h3>Core Information</h3>
          <div className="form-section-sub">Required -- these five fields power the intelligence brief</div>

          <div className="two-col-form">
            <div className="form-field">
              <label>Full Name <span>*</span></label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => update('fullName', e.target.value)}
                placeholder="Guy Burnett"
              />
              {errors.fullName && <div className="field-hint" style={{ color: 'var(--coral)' }}>{errors.fullName}</div>}
            </div>
            <div className="form-field">
              <label>City, Wisconsin <span>*</span></label>
              <input
                type="text"
                value={form.city}
                onChange={e => update('city', e.target.value)}
                placeholder="Waukesha"
              />
              {errors.city && <div className="field-hint" style={{ color: 'var(--coral)' }}>{errors.city}</div>}
            </div>
          </div>

          <div className="form-field">
            <label>How They Found You or Were Referred</label>
            <input
              type="text"
              value={form.referral}
              onChange={e => update('referral', e.target.value)}
              placeholder="Referred by Tom Harwick -- existing client, 8 years"
            />
            <div className="field-hint">Who referred them and what they likely heard about you</div>
          </div>

          <div className="form-field">
            <label>Why They Are Coming In</label>
            <textarea
              value={form.whyComing}
              onChange={e => update('whyComing', e.target.value)}
              placeholder="Retirement planning -- husband turning 62, wants to understand options before selling the business"
            />
            <div className="field-hint">One or two sentences on the stated reason for the meeting</div>
          </div>

          <div className="form-field">
            <label>What You Already Know</label>
            <textarea
              value={form.shawnNotes}
              onChange={e => update('shawnNotes', e.target.value)}
              placeholder="Met at Brookfield Chamber last month. Runs a roofing company. Seemed cautious but interested."
            />
            <div className="field-hint">Anything from prior conversations, mutual connections, or your own read</div>
          </div>
        </div>

        {/* BUSINESS */}
        <div className="form-section">
          <h3>Business Context</h3>
          <div className="form-section-sub">Optional -- powers the DFI search and Google Maps lookup</div>

          <div className="form-field">
            <label>Business Name (if owner)</label>
            <input
              type="text"
              value={form.businessName}
              onChange={e => update('businessName', e.target.value)}
              placeholder="Steinbach Roofing LLC"
            />
            <div className="field-hint">Used to search Wisconsin DFI records and Google Maps reviews</div>
          </div>
        </div>

        {/* SOCIAL AND WEB */}
        <div className="form-section">
          <h3>Social Media and Web URLs</h3>
          <div className="form-section-sub">Optional -- paste any public URLs you have or can quickly find. Each one adds depth to the brief.</div>

          <div className="two-col-form">
            <div className="form-field">
              <label>LinkedIn URL</label>
              <input
                type="url"
                value={form.linkedinUrl}
                onChange={e => update('linkedinUrl', e.target.value)}
                placeholder="https://linkedin.com/in/guyburnett"
              />
            </div>
            <div className="form-field">
              <label>Facebook Profile URL</label>
              <input
                type="url"
                value={form.facebookUrl}
                onChange={e => update('facebookUrl', e.target.value)}
                placeholder="https://facebook.com/guyburnett"
              />
            </div>
          </div>

          <div className="two-col-form">
            <div className="form-field">
              <label>Company Website</label>
              <input
                type="url"
                value={form.companyUrl}
                onChange={e => update('companyUrl', e.target.value)}
                placeholder="https://steinbachroofing.com"
              />
            </div>
            <div className="form-field">
              <label>Instagram URL</label>
              <input
                type="url"
                value={form.instagramUrl}
                onChange={e => update('instagramUrl', e.target.value)}
                placeholder="https://instagram.com/guyburnett"
              />
            </div>
          </div>

          <div className="form-field">
            <label>Any Other Relevant URL</label>
            <input
              type="url"
              value={form.otherUrl}
              onChange={e => update('otherUrl', e.target.value)}
              placeholder="News article, podcast, community mention..."
            />
          </div>
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          style={{ fontSize: 15, padding: '14px' }}
        >
          Generate Intelligence Brief
        </button>

        <div style={{ textAlign: 'center', marginTop: 10, fontFamily: 'Courier New', fontSize: 10, color: 'var(--muted)' }}>
          Searches CCAP -- Wisconsin DFI -- Property Records -- Google -- News -- RSS -- Facebook
        </div>

      </div>
    </div>
  )
}
