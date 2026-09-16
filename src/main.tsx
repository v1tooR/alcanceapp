import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
// DM Sans variável com eixo óptico — a mesma fonte do site, empacotada no app.
import '@fontsource-variable/dm-sans/opsz.css'
import '@/styles/globals.css'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado.')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
