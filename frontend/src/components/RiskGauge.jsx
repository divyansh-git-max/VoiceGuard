import React from 'react';

export default function RiskGauge({ score = 0, riskLevel = 'low' }) {
  const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 86;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const normalizedLevel = (riskLevel || (normalizedScore > 70 ? 'high' : normalizedScore > 35 ? 'medium' : 'low')).toLowerCase();

  const getTheme = () => {
    switch (normalizedLevel) {
      case 'high':
        return {
          color: 'var(--risk-high)',
          text: 'High risk / synthetic voice',
          tagClass: 'risk-tag-high',
          desc: 'Significant acoustic anomalies and neural vocoder artifacts detected.'
        };
      case 'medium':
        return {
          color: 'var(--risk-medium)',
          text: 'Elevated suspicion',
          tagClass: 'risk-tag-medium',
          desc: 'Acoustic anomalies detected. Secondary verification required.'
        };
      default:
        return {
          color: 'var(--risk-low)',
          text: 'Authentic / natural voice',
          tagClass: 'risk-tag-low',
          desc: 'Acoustic characteristics match natural biological vocal patterns.'
        };
    }
  };

  const theme = getTheme();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem 0.5rem',
      position: 'relative'
    }}>
      <div style={{ position: 'relative', width: '220px', height: '120px', display: 'flex', justifyContent: 'center' }}>
        <svg
          width="220"
          height="120"
          viewBox="0 0 220 120"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="vgMeterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="gaugeGlowBlue" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background meter track */}
          <path
            d="M 24 105 A 86 86 0 0 1 196 105"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Calibrated Ticks */}
          {[0, 20, 40, 60, 80, 100].map((val) => {
            const angle = Math.PI - (val / 100) * Math.PI;
            const innerR = 70;
            const outerR = 76;
            const x1 = 110 + innerR * Math.cos(angle);
            const y1 = 105 - innerR * Math.sin(angle);
            const x2 = 110 + outerR * Math.cos(angle);
            const y2 = 105 - outerR * Math.sin(angle);
            return (
              <line
                key={val}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Active measurement arc */}
          <path
            d="M 24 105 A 86 86 0 0 1 196 105"
            fill="none"
            stroke="url(#vgMeterGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter="url(#gaugeGlowBlue)"
            style={{
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        </svg>

        {/* Center Readout */}
        <div style={{
          position: 'absolute',
          bottom: '4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '2.75rem',
            fontWeight: 800,
            lineHeight: 1,
            color: 'var(--color-text-strong)'
          }}>
            {normalizedScore}
            <span style={{ fontSize: '1rem', color: 'var(--color-muted)', fontWeight: 400 }}> / 100</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '2px' }}>
            Risk score
          </span>
        </div>
      </div>

      {/* Evaluation Tag */}
      <div style={{ marginTop: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
        <div className={`risk-tag ${theme.tagClass}`}>
          <span>{theme.text}</span>
        </div>
        <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', maxWidth: '260px', margin: '0.2rem 0 0 0' }}>
          {theme.desc}
        </p>
      </div>
    </div>
  );
}
