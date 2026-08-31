import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

export default function AudioPlayer({ audioUrl, fileName, durationSeconds = 0 }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{
      background: 'rgba(2, 6, 23, 0.65)',
      border: '1px solid var(--color-line-purple)',
      borderRadius: 'var(--radius-md)',
      padding: '0.95rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      backdropFilter: 'blur(16px)'
    }}>
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Volume2 size={16} color="#60a5fa" />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-strong)' }}>
            {fileName || 'Recorded voice stream'}
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          {formatTime(currentTime)} / {formatTime(duration || 5)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(to right, #2563eb, #4f46e5)',
            border: '1px solid rgba(96, 165, 250, 0.3)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: 'var(--shadow-button)'
          }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '1px' }} />}
        </button>

        {/* Playback Track Slider */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          aria-label="Audio position"
          style={{
            flex: 1,
            accentColor: '#3b82f6',
            cursor: 'pointer',
            height: '5px',
            background: 'rgba(51, 65, 85, 0.6)',
            borderRadius: '3px'
          }}
        />

        <span style={{ fontSize: '0.75rem', color: isPlaying ? '#60a5fa' : 'var(--color-muted)' }}>
          {isPlaying ? 'Playing' : 'Ready'}
        </span>
      </div>
    </div>
  );
}
