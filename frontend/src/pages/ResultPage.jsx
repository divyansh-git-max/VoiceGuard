import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Code2, 
  Check, 
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Sparkles
} from 'lucide-react';
import RiskGauge from '../components/RiskGauge';
import DspFlags from '../components/DspFlags';
import AudioPlayer from '../components/AudioPlayer';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const stateData = location.state || {};
  const result = stateData.result || {
    chunk_id: 'vg-eval-demo-sample',
    model1_output: { authenticity_score: 0.892 },
    dsp_output: {
      pitch_variance: 'high',
      spectral_anomaly: 'high',
      phase_irregularity: 'medium',
      timing_pattern: 'medium'
    },
    context: {
      transaction_type: 'wire_transfer',
      caller_id_match: false
    },
    llm_judge_output: {
      final_risk_score: 88,
      risk_level: 'high',
      explanation: 'High risk detected: wav2vec2 model indicates 89.2% spoof likelihood. Severe acoustic anomalies detected in F0 pitch stability and high-frequency spectral roll-off consistent with neural vocoder synthesis.'
    }
  };

  const audioUrl = stateData.audioUrl;
  const fileName = stateData.fileName || 'Audio_Evidence.wav';

  const riskScore = result.llm_judge_output?.final_risk_score ?? 0;
  const riskLevel = (result.llm_judge_output?.risk_level || 'low').toLowerCase();
  const spoofProbability = (result.model1_output?.authenticity_score ?? 0) * 100;
  const explanation = result.llm_judge_output?.explanation || 'No forensic explanation returned.';
  const context = result.context || {};

  const getVerdictTheme = () => {
    switch (riskLevel) {
      case 'high':
        return {
          title: 'Synthetic voice clone detected',
          tagClass: 'risk-tag-high',
          borderColor: 'var(--risk-high-border)',
          accentColor: 'var(--risk-high)',
          icon: <ShieldAlert size={28} color="var(--risk-high)" />,
          action: 'Halt transaction and escalate to security operations',
          subtext: 'High confidence indicator of synthetic speech generation or real-time voice conversion.'
        };
      case 'medium':
        return {
          title: 'Suspicious acoustic pattern detected',
          tagClass: 'risk-tag-medium',
          borderColor: 'var(--risk-medium-border)',
          accentColor: 'var(--risk-medium)',
          icon: <AlertTriangle size={28} color="var(--risk-medium)" />,
          action: 'Trigger secondary biometric or multi-factor verification',
          subtext: 'Acoustic feature anomalies detected. Secondary verification required prior to transaction approval.'
        };
      default:
        return {
          title: 'Natural human voice verified',
          tagClass: 'risk-tag-low',
          borderColor: 'var(--risk-low-border)',
          accentColor: 'var(--risk-low)',
          icon: <ShieldCheck size={28} color="var(--risk-low)" />,
          action: 'Sample verified for regular transaction workflow',
          subtext: 'Acoustic characteristics conform to standard human biological speech patterns.'
        };
    }
  };

  const verdict = getVerdictTheme();

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `VoiceGuard_Forensic_${result.chunk_id || 'report'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-vg-secondary"
        >
          <ArrowLeft size={16} /> Analyze another sample
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-vg-secondary"
            onClick={() => setShowJson(!showJson)}
          >
            <Code2 size={16} color="#60a5fa" /> {showJson ? 'Hide schema contract' : 'View schema contract'}
          </button>

          <button
            type="button"
            className="btn-vg-primary"
            onClick={handleDownloadReport}
          >
            <Download size={16} /> Export forensic report
          </button>
        </div>
      </div>

      {/* JSON Schema Viewer Drawer */}
      {showJson && (
        <div className="vg-card" style={{ padding: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-strong)' }}>
              shared/schema.json contract payload
            </span>
            <button
              type="button"
              className="btn-vg-secondary"
              onClick={handleCopyJson}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              {copied ? 'Copied to clipboard' : 'Copy payload'}
            </button>
          </div>
          <pre style={{
            background: 'rgba(2, 6, 23, 0.85)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            overflowX: 'auto',
            fontSize: '0.85rem',
            color: '#60a5fa',
            lineHeight: 1.5,
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Primary Verdict Hero Banner */}
      <div
        className="vg-card"
        style={{
          border: `1px solid ${verdict.borderColor}`,
          padding: '2rem 2.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(2, 6, 23, 0.6)',
              border: `1px solid ${verdict.borderColor}`,
              boxShadow: 'var(--shadow-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {verdict.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                Evidence record: {result.chunk_id || 'N/A'}
              </div>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-text-strong)', letterSpacing: '-0.02em', marginTop: '2px' }}>
                {verdict.title}
              </h2>
            </div>
          </div>

          <div className={`risk-tag ${verdict.tagClass}`} style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}>
            Evaluation: {riskLevel} risk
          </div>
        </div>

        <p style={{ fontSize: '0.95rem', color: 'var(--color-muted)', maxWidth: '800px', lineHeight: 1.55 }}>
          {verdict.subtext}
        </p>

        {/* Action Directive */}
        <div style={{
          marginTop: '0.25rem',
          padding: '1rem 1.25rem',
          background: 'rgba(2, 6, 23, 0.65)',
          borderRadius: 'var(--radius-md)',
          borderLeft: `4px solid ${verdict.accentColor}`,
          borderTop: '1px solid rgba(59, 130, 246, 0.15)',
          borderRight: '1px solid rgba(59, 130, 246, 0.15)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block', fontWeight: 500 }}>
              Recommended disposition
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-strong)' }}>
              {verdict.action}
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 500 }}>
            Multi-channel verification
          </span>
        </div>
      </div>

      {/* Audio Sample Player */}
      {audioUrl && (
        <AudioPlayer audioUrl={audioUrl} fileName={fileName} />
      )}

      {/* Analytics Matrix: Gauge & Model 1 (Left), LLM Judge Verdict (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem'
      }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Risk Gauge Card */}
          <div className="vg-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-strong)' }}>
                Composite risk score
              </span>
              <span className="risk-tag risk-tag-blue" style={{ fontSize: '0.7rem' }}>0 to 100 scale</span>
            </div>
            <RiskGauge score={riskScore} riskLevel={riskLevel} />
          </div>

          {/* Model 1: wav2vec2 Classifier Card */}
          <div className="vg-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-strong)' }}>
                  Model 1: wav2vec2 neural classifier
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  Acoustic transformer embeddings (ASVspoof 2019 LA)
                </div>
              </div>
              <span style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: spoofProbability > 60 ? 'var(--risk-high)' : spoofProbability > 30 ? 'var(--risk-medium)' : 'var(--risk-low)'
              }}>
                {spoofProbability.toFixed(1)}%
              </span>
            </div>

            {/* Metric progress bar */}
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${spoofProbability}%`,
                background: spoofProbability > 60 ? 'linear-gradient(to right, #f59e0b, #ef4444)' : 'linear-gradient(to right, #10b981, #3b82f6)',
                borderRadius: '4px',
                transition: 'width 0.8s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              <span>0% (Natural human)</span>
              <span>Decision threshold: 50%</span>
              <span>100% (Synthetic)</span>
            </div>
          </div>
        </div>

        {/* Right Column: LLM Threat Judge Verdict */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="vg-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={20} color="#a855f7" />
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--color-text-strong)' }}>
                  Forensic judge threat analysis
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  Synthesized evaluation combining acoustic scores, DSP feature flags, and metadata
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(2, 6, 23, 0.65)',
              border: '1px solid var(--color-line-purple)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              color: '#e2e8f0',
              fontSize: '0.925rem',
              lineHeight: 1.6
            }}>
              {explanation}
            </div>

            {/* Context Telemetry */}
            <div style={{ borderTop: '1px solid rgba(59, 130, 246, 0.15)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                Context telemetry
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ background: 'rgba(2, 6, 23, 0.65)', border: '1px solid var(--color-line-purple)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Transaction category</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-strong)', textTransform: 'capitalize', marginTop: '2px' }}>
                    {(context.transaction_type || 'N/A').replace('_', ' ')}
                  </div>
                </div>

                <div style={{ background: 'rgba(2, 6, 23, 0.65)', border: '1px solid var(--color-line-purple)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Caller ID record</div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: context.caller_id_match ? 'var(--risk-low)' : 'var(--risk-high)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginTop: '2px'
                  }}>
                    {context.caller_id_match ? <Check size={15} /> : <X size={15} />}
                    {context.caller_id_match ? 'Verified match' : 'Caller ID mismatch'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* DSP Acoustic Flag Matrix */}
      <div className="vg-card" style={{ padding: '1.75rem' }}>
        <DspFlags dspOutput={result.dsp_output} />
      </div>

    </div>
  );
}
