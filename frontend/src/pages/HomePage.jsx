import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Mic,
  Square,
  FileAudio,
  AlertCircle,
  ChevronDown,
  Sliders,
  ShieldAlert,
  Sparkles,
  Activity,
  CheckCircle2
} from 'lucide-react';
import AudioPlayer from '../components/AudioPlayer';

export default function HomePage({ onAnalyzeComplete }) {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  // Context metadata according to schema.json
  const [transactionType, setTransactionType] = useState('wire_transfer');
  const [callerIdMatch, setCallerIdMatch] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Test bench samples
  const presets = [
    {
      id: 'scam_deepfake',
      exhibitNumber: 'Exhibit A',
      caseId: 'CASE-2026-081',
      title: 'High-risk synthetic voice clone',
      desc: 'Synthetic speech impersonating an account holder requesting an urgent international wire transfer.',
      type: 'wire_transfer',
      callerMatch: false,
      sampleName: 'urgent_wire_authorization_clone.wav',
      mockResult: {
        chunk_id: 'vg-chunk-synth-8891',
        model1_output: { authenticity_score: 0.942 },
        dsp_output: {
          pitch_variance: 'high',
          spectral_anomaly: 'high',
          phase_irregularity: 'high',
          timing_pattern: 'medium'
        },
        context: {
          transaction_type: 'wire_transfer',
          caller_id_match: false
        },
        llm_judge_output: {
          final_risk_score: 93,
          risk_level: 'high',
          explanation: 'Critical threat: Severe neural vocoder acoustic artifacts and unnatural F0 pitch flatlining detected. Model 1 spoof probability is 94.2%. Combined with caller ID mismatch on a high-value wire transfer, this sample exhibits definitive characteristics of neural voice cloning.'
        }
      }
    },
    {
      id: 'authentic_human',
      exhibitNumber: 'Exhibit B',
      caseId: 'CASE-2026-082',
      title: 'Authentic human voice recording',
      desc: 'Natural customer service interaction showing organic pitch variance, breath cadences, and harmonic decay.',
      type: 'account_recovery',
      callerMatch: true,
      sampleName: 'customer_verification_natural.wav',
      mockResult: {
        chunk_id: 'vg-chunk-auth-1042',
        model1_output: { authenticity_score: 0.045 },
        dsp_output: {
          pitch_variance: 'low',
          spectral_anomaly: 'low',
          phase_irregularity: 'low',
          timing_pattern: 'low'
        },
        context: {
          transaction_type: 'account_recovery',
          caller_id_match: true
        },
        llm_judge_output: {
          final_risk_score: 8,
          risk_level: 'low',
          explanation: 'Verified authentic: Audio displays healthy organic acoustic variance, standard harmonic envelope, and natural breath timing. Spoof probability is 4.5%.'
        }
      }
    },
    {
      id: 'suspicious_phase',
      exhibitNumber: 'Exhibit C',
      caseId: 'CASE-2026-083',
      title: 'Phase-manipulated speech sample',
      desc: 'Audio memo exhibiting vocoder phase incoherence and abnormal phoneme boundary transitions.',
      type: 'password_reset',
      callerMatch: true,
      sampleName: 'executive_memo_reconstructed.wav',
      mockResult: {
        chunk_id: 'vg-chunk-susp-5510',
        model1_output: { authenticity_score: 0.628 },
        dsp_output: {
          pitch_variance: 'medium',
          spectral_anomaly: 'medium',
          phase_irregularity: 'high',
          timing_pattern: 'medium'
        },
        context: {
          transaction_type: 'password_reset',
          caller_id_match: true
        },
        llm_judge_output: {
          final_risk_score: 64,
          risk_level: 'medium',
          explanation: 'Elevated suspicion: Notable phase incoherence detected alongside moderate acoustic anomalies. Model 1 classifier flags 62.8% probability of neural speech synthesis. Secondary verification advised.'
        }
      }
    }
  ];

  // Generate a valid 16-bit PCM WAV File for test exhibits so they can be previewed & processed by backend
  const createSynthesizedWav = (presetId, sampleName) => {
    const sampleRate = 16000;
    const duration = 3.0; // 3 seconds
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true);  // PCM format
    view.setUint16(22, 1, true);  // Mono channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true);  // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (presetId === 'scam_deepfake') {
        // Robotic synthetic voice with fixed pitch & unnatural vocoder harmonics
        sample = 0.35 * Math.sin(2 * Math.PI * 220 * t) +
          0.25 * Math.sin(2 * Math.PI * 440 * t) +
          0.18 * Math.sin(2 * Math.PI * 660 * t) +
          0.12 * Math.sin(2 * Math.PI * 880 * t);
      } else if (presetId === 'authentic_human') {
        // Natural human speech: dynamic pitch contour (130-180Hz) + natural cadence modulation
        const f0 = 155 + 28 * Math.sin(2 * Math.PI * 1.4 * t) + 12 * Math.cos(2 * Math.PI * 3.1 * t);
        const cadence = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.9 * t);
        sample = cadence * (
          0.4 * Math.sin(2 * Math.PI * f0 * t) +
          0.2 * Math.sin(2 * Math.PI * 2 * f0 * t) +
          0.1 * Math.sin(2 * Math.PI * 3 * f0 * t)
        );
      } else {
        // Phase-manipulated audio: phase jumps and high frequency buzz
        const phaseJitter = Math.sin(60 * t) > 0 ? 0.75 : -0.75;
        const f0 = 175 + 15 * Math.sin(2 * Math.PI * 0.6 * t);
        sample = 0.45 * Math.sin(2 * Math.PI * f0 * t + phaseJitter) +
          0.25 * Math.sin(2 * Math.PI * 2.5 * f0 * t);
      }

      const clamped = Math.max(-1, Math.min(1, sample));
      const pcm16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      view.setInt16(offset, pcm16, true);
      offset += 2;
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return new File([blob], sampleName, { type: 'audio/wav' });
  };

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const activePresetRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selectedFile) => {
    setErrorMessage(null);
    activePresetRef.current = null;
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setAudioUrl(url);
  };

  const selectPreset = (preset) => {
    setErrorMessage(null);
    activePresetRef.current = preset;
    setTransactionType(preset.type);
    setCallerIdMatch(preset.callerMatch);

    const generatedFile = createSynthesizedWav(preset.id, preset.sampleName);
    setFile(generatedFile);
    const url = URL.createObjectURL(generatedFile);
    setAudioUrl(url);
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      activePresetRef.current = null;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? { mimeType: 'audio/ogg' }
          : {};

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const extension = mimeType.includes('ogg') ? '.ogg' : mimeType.includes('wav') ? '.wav' : '.webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const recordedFile = new File([audioBlob], `mic_recording_${Date.now()}${extension}`, { type: mimeType });
        setFile(recordedFile);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMessage('Microphone access denied or unavailable in this environment.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setErrorMessage('Select an audio file or record speech before starting analysis.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(1);
    setErrorMessage(null);

    const stepInterval = setInterval(() => {
      setAnalysisStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 600);

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('transaction_type', transactionType);
      formData.append('caller_id_match', callerIdMatch);

      // Include auth token if available
      let token = null;
      try {
        const saved = localStorage.getItem('vg_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          token = parsed.token || parsed.access_token;
        }
      } catch (e) {
        // ignore JSON parse error
      }

      const headers = {
        'Accept': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('https://divyansh2025-voiceguard-api.hf.space/gradio_api/analyze', {
        headers,
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let errorDetail = `Server returned status ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.detail) {
            errorDetail = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errorDetail);
      }

      const resultData = await res.json();

      clearInterval(stepInterval);
      setAnalysisStep(4);

      setTimeout(() => {
        setIsAnalyzing(false);
        if (onAnalyzeComplete) {
          onAnalyzeComplete({
            result: resultData,
            audioUrl: audioUrl,
            fileName: file.name
          });
        }
        navigate('/result', { state: { result: resultData, audioUrl, fileName: file.name } });
      }, 400);

    } catch (err) {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setErrorMessage(err.message || 'Analysis could not be completed. Please ensure backend server is running.');
    }
  };

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

      {/* Hero Header matching VoiceGuard Style */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2rem',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-line)',
        paddingBottom: '2.5rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="risk-tag risk-tag-blue">
              <Sparkles size={14} /> Multi-Layer AI Voice Security
            </span>
          </div>

          <h1 className="gradient-text-hero" style={{
            fontSize: '2.75rem',
            lineHeight: 1.15,
            fontWeight: 800
          }}>
            Forensic voice-clone & impersonation detection
          </h1>

          <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--color-muted)' }}>
            Examine incoming voice streams for neural vocoder artifacts, F0 pitch flatlining, and synthetic phase incoherence across multiple acoustic verification channels.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.25rem' }}>
            <div style={{ height: '1px', width: '60px', background: 'linear-gradient(to right, #3b82f6, transparent)' }} />
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
              Detect. Verify. Protect.
            </span>
          </div>
        </div>

        {/* Live Audio Telemetry Spectrum Card */}
        <div className="vg-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa' }}>
              <Activity size={15} /> Acoustic Waveform Stream
            </span>
            <span>16.0 kHz PCM</span>
          </div>

          <svg width="100%" height="80" viewBox="0 0 400 80" fill="none" style={{ overflow: 'visible' }}>
            <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(59, 130, 246, 0.2)" strokeDasharray="3 3" strokeWidth="1" />
            <path
              d="M 0 40 Q 15 15, 25 40 T 45 40 T 65 12 T 85 68 T 105 25 T 125 52 T 145 40 T 165 8 T 185 72 T 205 20 T 225 60 T 245 40 T 265 30 T 285 50 T 305 18 T 325 64 T 345 35 T 365 45 T 385 40 L 400 40"
              stroke="#60a5fa"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
            <span>0.0s</span>
            <span>0.5s</span>
            <span>1.0s</span>
            <span>1.5s</span>
            <span>2.0s</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div style={{
          background: 'var(--risk-high-bg)',
          border: '1px solid var(--risk-high-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#fca5a5'
        }}>
          <AlertCircle size={18} color="var(--risk-high)" />
          <span style={{ fontSize: '0.875rem' }}>{errorMessage}</span>
        </div>
      )}

      {/* Main Ingestion & Capture Section */}
      <div className="vg-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sliders size={18} color="#60a5fa" />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-strong)' }}>
              Audio evidence intake console
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            Supported formats: WAV, MP3, FLAC, M4A, OGG
          </span>
        </div>

        {/* Side-by-Side Ingestion Instruments */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem'
        }}>

          {/* Ingestion Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="vg-card-purple"
            style={{
              padding: '2rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              boxShadow: 'var(--shadow-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UploadCloud size={22} color="#60a5fa" />
            </div>

            <div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-strong)' }}>
                Upload audio evidence file
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                Drag file here or click to browse filesystem (3s to 30s recommended)
              </div>
            </div>
          </div>

          {/* Microphone Capture Terminal */}
          <div
            className="vg-card-purple"
            style={{
              border: isRecording ? '1px solid var(--risk-high)' : '1px solid var(--color-line-purple)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: isRecording ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                border: isRecording ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)',
                boxShadow: 'var(--shadow-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Mic size={22} color={isRecording ? '#ef4444' : '#60a5fa'} />
              </div>

              {/* Tally Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: isRecording ? '#ef4444' : 'var(--color-muted)' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isRecording ? '#ef4444' : '#64748b',
                  boxShadow: isRecording ? '0 0 10px rgba(239, 68, 68, 0.8)' : 'none'
                }} />
                <span>{isRecording ? `Recording (${recordingDuration}s)` : 'Standby'}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-strong)' }}>
                Live microphone terminal
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                Capture speech sample directly through microphone input
              </div>
            </div>

            <div>
              {isRecording ? (
                <button
                  type="button"
                  className="btn-vg-primary"
                  onClick={stopRecording}
                  style={{ background: 'linear-gradient(to right, #dc2626, #ef4444)', border: '1px solid rgba(239, 68, 68, 0.4)', width: '100%' }}
                >
                  <Square size={16} /> Stop recording
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-vg-secondary"
                  onClick={startRecording}
                  style={{ width: '100%' }}
                >
                  <Mic size={16} /> Start live capture
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selected Audio Stage Banner */}
        {file && (
          <div style={{
            background: 'rgba(2, 6, 23, 0.6)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-strong)' }}>
                <FileAudio size={18} color="#60a5fa" />
                <span>Loaded sample: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setAudioUrl(null); activePresetRef.current = null; }}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Remove sample
              </button>
            </div>
            {audioUrl && <AudioPlayer audioUrl={audioUrl} fileName={file.name} />}
          </div>
        )}

        {/* Context Parameters Accordion */}
        <div style={{ borderTop: '1px solid rgba(59, 130, 246, 0.15)', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text)',
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <span>Case metadata & transaction context</span>
            <ChevronDown size={15} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }} />
          </button>

          {showAdvanced && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              marginTop: '1rem',
              padding: '1.25rem',
              background: 'rgba(2, 6, 23, 0.6)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-line-purple)'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Transaction category
                </label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="vg-input"
                >
                  <option value="wire_transfer">Wire transfer ($10k+)</option>
                  <option value="account_recovery">Account recovery</option>
                  <option value="password_reset">Password reset</option>
                  <option value="executive_authorization">Executive voice authorization</option>
                  <option value="general_inquiry">General customer inquiry</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Caller ID verification
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
                  <button
                    type="button"
                    onClick={() => setCallerIdMatch(true)}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: callerIdMatch ? '1px solid var(--risk-low)' : '1px solid var(--color-line-purple)',
                      background: callerIdMatch ? 'var(--risk-low-bg)' : 'rgba(2, 6, 23, 0.6)',
                      color: callerIdMatch ? 'var(--risk-low)' : 'var(--color-muted)',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Verified match
                  </button>
                  <button
                    type="button"
                    onClick={() => setCallerIdMatch(false)}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: !callerIdMatch ? '1px solid var(--risk-high)' : '1px solid var(--color-line-purple)',
                      background: !callerIdMatch ? 'var(--risk-high-bg)' : 'rgba(2, 6, 23, 0.6)',
                      color: !callerIdMatch ? 'var(--risk-high)' : 'var(--color-muted)',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Caller ID mismatch
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Trigger */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button
            type="button"
            className="btn-vg-primary"
            onClick={handleAnalyze}
            disabled={!file || isAnalyzing}
            style={{ minWidth: '240px', padding: '0.95rem 2rem', fontSize: '1rem' }}
          >
            Run forensic scan
          </button>
        </div>
      </div>

      {/* Forensic Exhibit Test Bench */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-text-strong)' }}>
            Reference exhibit test bench
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
            Calibrated test recordings for verification and benchmarking against known speech synthesis attacks
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.25rem'
        }}>
          {presets.map((preset) => {
            const isSelected = activePresetRef.current?.id === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => selectPreset(preset)}
                className="vg-card"
                style={{
                  border: isSelected ? '1px solid #60a5fa' : '1px solid var(--color-line)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-panel)',
                  padding: '1.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>
                      {preset.exhibitNumber}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {preset.caseId}
                    </span>
                  </div>

                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: '0.4rem' }}>
                    {preset.title}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
                    {preset.desc}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(59, 130, 246, 0.15)',
                  paddingTop: '0.85rem'
                }}>
                  <span style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
                    {preset.sampleName}
                  </span>
                  <span style={{ fontSize: '0.825rem', color: '#60a5fa', fontWeight: 600 }}>
                    {isSelected ? 'Selected' : 'Load sample'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analysis In-Progress Dialog */}
      {isAnalyzing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(3, 7, 18, 0.88)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div className="vg-card" style={{ maxWidth: '500px', width: '100%', padding: '2.25rem', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(59, 130, 246, 0.5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <div>
                <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>
                  Active Examination
                </span>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--color-text-strong)', marginTop: '0.25rem' }}>
                  Processing acoustic evidence
                </h3>
              </div>

              {/* Scanning Waveform Sweep */}
              <div style={{
                background: 'rgba(2, 6, 23, 0.7)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}>
                <svg width="100%" height="45" viewBox="0 0 300 45" fill="none">
                  <path
                    d="M 0 22 Q 10 5, 20 22 T 40 22 T 60 4 T 80 40 T 100 15 T 120 30 T 140 22 T 160 5 T 180 39 T 200 10 T 220 34 T 240 22 T 260 14 T 280 30 L 300 22"
                    stroke="#60a5fa"
                    strokeWidth="2"
                    className="animate-scan-sweep"
                  />
                </svg>
              </div>

              {/* Step verification pipeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {[
                  { step: 1, label: 'Acoustic normalization and VAD framing' },
                  { step: 2, label: 'wav2vec2 transformer embeddings inference' },
                  { step: 3, label: 'Digital signal processing heuristic extraction' },
                  { step: 4, label: 'Forensic threat judge evaluation' }
                ].map((s) => {
                  const isDone = analysisStep > s.step;
                  const isCurrent = analysisStep === s.step;
                  return (
                    <div
                      key={s.step}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.85rem',
                        color: isCurrent ? '#60a5fa' : isDone ? 'var(--color-text-strong)' : '#64748b'
                      }}
                    >
                      <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        background: isDone ? 'var(--risk-low)' : isCurrent ? '#3b82f6' : 'rgba(59, 130, 246, 0.15)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isDone ? '✓' : s.step}
                      </span>
                      <span>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
