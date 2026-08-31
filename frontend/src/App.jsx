import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';

export default function App() {
  const [latestAnalysis, setLatestAnalysis] = useState(null);

  const handleAnalyzeComplete = (data) => {
    setLatestAnalysis(data);
  };

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-background)' }}>
        <Navbar />
        
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage onAnalyzeComplete={handleAnalyzeComplete} />} />
            <Route path="/result" element={<ResultPage />} />
          </Routes>
        </main>

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
    </BrowserRouter>
  );
}
import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import HomePage from "./pages/HomePage";

function App() {
  const [currentPage, setCurrentPage] = useState("login");

  const handleLogin = (userData) => {
    console.log("Login successful:", userData);
    setCurrentPage("home");
  };

  const handleSignup = (userData) => {
    console.log("Signup successful:", userData);
    setCurrentPage("login");
  };

    // Logout function -------------------------
  const handleLogout = () => {
    console.log("User logged out");
    setCurrentPage("login");
  };

  return (
    <>
      {currentPage === "login" && (
        <LoginPage
          onLogin={handleLogin}
          onGoToSignup={() => setCurrentPage("signup")}
        />
      )}

      {currentPage === "signup" && (
        <SignupPage
          onSignup={handleSignup}
          onGoToLogin={() => setCurrentPage("login")}
        />
      )}

      {currentPage === "home" && <HomePage onLogout={handleLogout} />}
    </>
  );
}

export default App;
