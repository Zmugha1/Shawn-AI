import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

export default function Layout({ children }) {
  const navigate = useNavigate()

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-line">Pre-Meeting Intelligence</div>
          <h1>Shawn Intel</h1>
          <div className="sidebar-tagline">Know before you walk in.</div>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>

          <NavLink
            to="/"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            &#9632; My Prospects
          </NavLink>

          <div
            className="nav-item"
            onClick={() => navigate('/new')}
            style={{ cursor: 'pointer' }}
          >
            &#43; New Prospect
          </div>

          <NavLink
            to="/criteria"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            &#9670; Criteria Library
          </NavLink>

          <NavLink
            to="/status"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            &#9675; System Status
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <p><span className="sdot"></span>Shawn Intel v1.0</p>
          <p>Testing mode -- online</p>
          <p style={{ marginTop: 6, color: 'rgba(255,255,255,0.15)' }}>
            Dr. Data Decision Intelligence LLC
          </p>
        </div>
      </div>

      <div className="main">
        {children}
      </div>
    </div>
  )
}
