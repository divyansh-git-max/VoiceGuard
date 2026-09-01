import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, LogOut } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--color-line)',
      background: 'rgba(3, 7, 18, 0.8)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      width: '100%'
    }}>
      <div style={{
        maxWidth: '1160px',
        margin: '0 auto',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Logo & Name matching design system */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            background: 'rgba(59, 130, 246, 0.1)',
            boxShadow: 'var(--shadow-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} color="#60a5fa" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span className="gradient-text-hero" style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                letterSpacing: '-0.025em'
              }}>
                VoiceGuard
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              AI-powered voice security and impersonation detection
            </div>
          </div>
        </Link>

        {/* Status Indicator & User controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.8rem',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            color: 'var(--color-text)'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
            }} />
            <span>Detection active</span>
          </div>

          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              paddingLeft: '0.6rem',
              borderLeft: '1px solid var(--color-line)'
            }}>
              <span style={{
                fontSize: '0.8rem',
                color: 'var(--color-muted)',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user.name || user.email || 'User'}
              </span>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Log out"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '0.35rem 0.7rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  }}
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
