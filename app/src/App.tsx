import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Auth from './pages/Auth'
import AppShell from './components/AppShell'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh bg-steel-950">
      <div className="text-nexus-400 font-mono text-sm animate-pulse">LOADING SYSTEMS...</div>
    </div>
  )
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh bg-steel-950">
      <div className="text-nexus-400 font-mono text-sm animate-pulse">INITIALISING...</div>
    </div>
  )

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/app/dashboard" replace /> : <Auth />}
      />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? '/app/dashboard' : '/auth'} replace />} />
      <Route path="*" element={<Navigate to={user ? '/app/dashboard' : '/auth'} replace />} />
    </Routes>
  )
}
