import React, { Component } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// Catch any React crash and show the error instead of blank screen
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '32px',
          fontFamily: 'sans-serif',
          background: '#121118',
          color: '#fff',
          minHeight: '100vh',
        }}>
          <h2 style={{ color: '#f87171' }}>⚠️ App failed to load</h2>
          <p style={{ color: '#9ca3af', marginBottom: '16px' }}>
            Please hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R on Mac)
          </p>
          <pre style={{
            background: '#1f1d2e',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '12px',
            overflowX: 'auto',
            color: '#fca5a5',
          }}>
            {this.state.error.message}
            {'\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Google now uses Authorization Code + PKCE (like Spotify already did), so
// the redirect carries `?code=&state=` in the query string, not `#access_token`
// in the hash. Both are read directly by the opener window's popup poller in
// connectGoogle() / connectSpotify() (see src/lib/integrations.ts), so this
// window just needs to render a lightweight placeholder — see isOauthPopup below.

const isOauthPopup = typeof window !== 'undefined' && 
  window.opener && 
  (window.location.hash.includes('access_token') || window.location.search.includes('code='));

if (isOauthPopup) {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#a1a1aa;background:#121118;font-size:14px;">Connecting service...</div>';
  }
} else {
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <App />
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
