import { createRoot } from 'react-dom/client'
import { EvidencePage, LandingPage } from '../../../src/App'
import '../../../src/styles.css'

const path = window.location.pathname.replace(/\/+$/u, '') || '/'
createRoot(document.getElementById('root')!).render(path === '/evidence' ? <EvidencePage /> : <LandingPage />)
