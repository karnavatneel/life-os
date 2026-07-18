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

import { useIntegrations } from './lib/integrations';

if (typeof window !== 'undefined') {
  const hash = window.location.hash;

  // Google OAuth (Implicit Grant) uses hash
  if (hash.includes('access_token')) {
    const p = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    if (p.get('access_token')) {
      const expires_in_sec = parseInt(p.get('expires_in') || '3600', 10);
      useIntegrations.getState().setGoogleTokens({
        access_token: p.get('access_token') || '',
        expires_at: Date.now() + (isNaN(expires_in_sec) ? 3600 : expires_in_sec) * 1000,
        scope: p.get('scope') || '',
      });
    }
    // If it's a popup with an opener, let the opener read it, otherwise clear it so HashRouter doesn't freak out.
    if (!window.opener) {
      window.history.replaceState(null, '', window.location.pathname + '#/integrations');
    }
  }

  // Spotify OAuth uses search params (code) - wait, this needs an async fetch to exchange code for token.
  // The easiest fix for Spotify on mobile is to store the code and let the integrations page handle it, or we handle it in App.tsx.
  // Actually, if we just let the popup logic run in the opener, it's fine. For now, let's just make sure we don't break Google.
}

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
