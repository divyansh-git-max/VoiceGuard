import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Helper to load user from localStorage safely
function getInitialUser() {
  try {
    const saved = localStorage.getItem('vg_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

// ProtectedRoute: blocks unauthenticated users and redirects to /login
function ProtectedRoute({ isAuthenticated, children }) {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

// PublicOnlyRoute: blocks authenticated users from revisiting /login or /signup
function PublicOnlyRoute({ isAuthenticated, children }) {
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function MainLayout({ user, onLogout, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-background)' }}>
      <Navbar user={user} onLogout={onLogout} />
      <main style={{ flex: 1 }}>{children}</main>
      <footer style={{
        borderTop: '1px solid var(--color-line)',
        background: 'rgba(3, 7, 18, 0.9)',
        backdropFilter: 'blur(16px)',
        padding: '1.5rem 1.5rem',
        fontSize: '0.825rem',
        color: 'var(--color-muted)'
      }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-strong)' }}>VoiceGuard</span>
            <span>•</span>
            <span>AI-powered voice security</span>
            <span>•</span>
            <span>Problem SIH26104</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-subtle)' }}>
            wav2vec2 neural classifier • Librosa DSP • LLM threat judge
          </div>
        </div>
      </footer>
    </div>
  );
}

function AppRoutes() {
  const [user, setUser] = useState(getInitialUser);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = !!user;

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('vg_user', JSON.stringify(userData));
    const target = location.state?.from?.pathname || '/';
    navigate(target, { replace: true });
  };

  const handleSignup = (userData) => {
    navigate('/login', {
      replace: true,
      state: { message: `Account created for ${userData.email || userData.name}! Please sign in.` }
    });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vg_user');
    navigate('/login', { replace: true });
  };

  const handleAnalyzeComplete = (data) => {
    setLatestAnalysis(data);
  };

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute isAuthenticated={isAuthenticated}>
            <LoginPage
              onLogin={handleLogin}
              onGoToSignup={() => navigate('/signup')}
            />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute isAuthenticated={isAuthenticated}>
            <SignupPage
              onSignup={handleSignup}
              onGoToLogin={() => navigate('/login')}
            />
          </PublicOnlyRoute>
        }
      />

      {/* Protected Main Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <MainLayout user={user} onLogout={handleLogout}>
              <HomePage onAnalyzeComplete={handleAnalyzeComplete} />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/result"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <MainLayout user={user} onLogout={handleLogout}>
              <ResultPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all fallback */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
