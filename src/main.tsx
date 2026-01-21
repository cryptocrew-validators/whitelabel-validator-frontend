import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import '@interchain-ui/react/styles'
import App from './App.tsx'
import './index.css'

// Make Buffer available globally
;(window as any).Buffer = Buffer

console.log('main.tsx: Starting app initialization')

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found!')
  document.body.innerHTML = '<div style="padding: 2rem; color: red;">ERROR: Root element not found!</div>'
  throw new Error('Root element not found')
}

console.log('main.tsx: Root element found, rendering app')

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('main.tsx: App rendered successfully')
} catch (error) {
  console.error('main.tsx: Error rendering app:', error)
  rootElement.innerHTML = `
    <div style="padding: 2rem; color: #ff6b6b; background: #242424; min-height: 100vh;">
      <h1>Failed to render app</h1>
      <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
      <pre style="background: #1a1a1a; padding: 1rem; border-radius: 4px; overflow: auto; color: white;">${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `
}
