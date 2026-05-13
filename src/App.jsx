import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { ProspectsPage, CriteriaPage, StatusPage } from './pages/ProspectsPage.jsx'
import InputPage from './pages/InputPage.jsx'
import BuildPage from './pages/BuildPage.jsx'
import BriefPage from './pages/BriefPage.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ProspectsPage />} />
        <Route path="/new" element={<InputPage />} />
        <Route path="/build" element={<BuildPage />} />
        <Route path="/brief/:id" element={<BriefPage />} />
        <Route path="/criteria" element={<CriteriaPage />} />
        <Route path="/status" element={<StatusPage />} />
      </Routes>
    </Layout>
  )
}
