import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import App from './App.jsx'
import LoginPage from './views/LoginPage.jsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <AuthLoading>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: '#F8FAFC',
          color: '#0F172A',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid #E2E8F0',
            borderTopColor: '#1E40AF',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '16px'
          }}></div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#64748B' }}>Loading MEPac Admin...</div>
        </div>
      </AuthLoading>
      <Authenticated>
        <App />
      </Authenticated>
      <Unauthenticated>
        <LoginPage />
      </Unauthenticated>
    </ConvexAuthProvider>
  </React.StrictMode>,
)
