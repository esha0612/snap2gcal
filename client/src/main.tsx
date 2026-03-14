import React from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './app/App'
import './styles/index.css'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId="819478237464-d6v51818ev54jm1flti9idoai2u8gr8o.apps.googleusercontent.com">
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  )
}