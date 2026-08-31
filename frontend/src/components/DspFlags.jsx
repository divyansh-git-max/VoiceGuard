import React from 'react';

export default function DspFlags({ dspOutput = {} }) {
  const flags = [
    {
      key: 'pitch_variance',
      name: 'Pitch variance (F0)',
      channel: 'Ch 01',
      level: dspOutput?.pitch_variance || 'low',
      description: 'Measures natural vocal intonation stability. Synthetic voice models often exhibit robotic flatlining or unnatural pitch jitter.',
      lowMeaning: 'Normal biological pitch variance',
      mediumMeaning: 'Mild pitch quantization detected',
      highMeaning: 'Unnatural pitch flatline / synthetic jump'
    },
    {
      key: 'spectral_anomaly',
      name: 'Spectral energy distribution',
      channel: 'Ch 02',
      level: dspOutput?.spectral_anomaly || 'low',
      description: 'Examines high-frequency harmonic cutoffs, spectral centroid shifts, and vocoder artifacts across the 8kHz–16kHz frequency range.',
      lowMeaning: 'Standard acoustic spectrum',
      mediumMeaning: 'Irregular harmonic decay',
      highMeaning: 'Vocoder synthesis artifacts present'
    },
    {
      key: 'phase_irregularity',
      name: 'Phase coherence',
      channel: 'Ch 03',
      level: dspOutput?.phase_irregularity || 'low',
      description: 'Evaluates phase alignment across adjacent audio windows. Neural text-to-speech generators frequently produce phase incoherence.',
      lowMeaning: 'Coherent acoustic wavefront',
      mediumMeaning: 'Minor phase anomalies noted',
      highMeaning: 'Phase incoherence typical of TTS models'
    },
    {
      key: 'timing_pattern',
      name: 'Temporal and pause dynamics',
      channel: 'Ch 04',
      level: dspOutput?.timing_pattern || 'low',
      description: 'Analyzes pause cadence, phoneme duration transitions, and organic breathing patterns that distinguish human speech.',
      lowMeaning: 'Organic pause and breath timing',
      mediumMeaning: 'Unusual silence or transition pacing',
      highMeaning: 'Machine-quantized cadence'
    }
  ];

  const getLevelTag = (level) => {
    const norm = (level || 'low').toLowerCase();
    switch (norm) {
      case 'high':
        return <span className="risk-tag risk-tag-high">High anomaly</span>;
      case 'medium':
        return <span className="risk-tag risk-tag-medium">Suspicious</span>;
      default:
        return <span className="risk-tag risk-tag-low">Normal</span>;
    }
  };

  const getBorderColor = (level) => {
    const norm = (level || 'low').toLowerCase();
    if (norm === 'high') return 'var(--risk-high-border)';
    if (norm === 'medium') return 'var(--risk-medium-border)';
    return 'var(--color-line)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text-strong)' }}>
            Digital signal processing artifact matrix
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Four-channel acoustic feature extraction via Librosa & Silero-VAD
          </p>
        </div>
        <span className="risk-tag risk-tag-blue" style={{ fontSize: '0.75rem' }}>
          4 acoustic telemetry vectors
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem'
      }}>
        {flags.map((flag) => {
          const norm = (flag.level || 'low').toLowerCase();
          const detail = norm === 'high' ? flag.highMeaning : norm === 'medium' ? flag.mediumMeaning : flag.lowMeaning;

          return (
            <div
              key={flag.key}
              className="vg-card-purple"
              style={{
                border: `1px solid ${getBorderColor(flag.level)}`,
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.85rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>
                    {flag.channel}
                  </span>
                  {getLevelTag(flag.level)}
                </div>

                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: '0.4rem' }}>
                  {flag.name}
                </div>

                <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', lineHeight: 1.45 }}>
                  {flag.description}
                </p>
              </div>

              <div style={{
                paddingTop: '0.65rem',
                borderTop: '1px solid rgba(59, 130, 246, 0.15)',
                fontSize: '0.8rem',
                color: norm === 'high' ? 'var(--risk-high)' : norm === 'medium' ? 'var(--risk-medium)' : 'var(--risk-low)'
              }}>
                <span style={{ color: 'var(--color-subtle)' }}>Finding: </span>
                {detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// # DspFlags.jsx
// # TODO: Display DSP feature results as a card grid
// #       Props: dspOutput { pitch_variance, spectral_anomaly, phase_irregularity, timing_pattern }
// #       Each flag shown as a badge: low=green, medium=amber, high=red
