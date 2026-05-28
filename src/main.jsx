import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/pages/home.css'
import './styles/pages/quiz.css'
import './styles/pages/errors.css'
import './styles/pages/stats.css'
import './styles/pages/blocks.css'
import './styles/pages/vocab-dictionary.css'
import './styles/pages/accessibility.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
