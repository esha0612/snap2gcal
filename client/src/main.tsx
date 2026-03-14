import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './app/App'
import { SignInPage } from './app/pages/sign-in'
import { ProtectedRoute } from './app/components/protected-route'
import './styles/index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
  },
  { path: '/signin', element: <SignInPage /> },
])

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId="819478237464-d6v51818ev54jm1flti9idoai2u8gr8o.apps.googleusercontent.com">
        <RouterProvider router={router} />
      </GoogleOAuthProvider>
    </React.StrictMode>
  )
}