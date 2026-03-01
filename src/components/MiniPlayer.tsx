import React, { useRef, useCallback } from 'react';
import type { Track } from '../types';
import { TrackCover } from './TrackCover';
import { Equalizer } from './Equalizer';

interface MiniPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  progress: number;
  isFav: boolean;
  eqData: number[];
  onOpen: () => void;
  onTogglePlay: (e: React.MouseEvent) => void;
  onToggleFav: (e: React.MouseEvent) => void;
  onNext: () => void;
  onPrev: () => void;
}

const PlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: 'white' }}>
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: 'white' }}>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24"
    style={{ fill: filled ? 'var(--accent)' : 'none', stroke: filled ? 'var(--accent)' : 'var(--text3)', strokeWidth: 2 }}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  track, isPlaying, progress, isFav, eqData,
  onOpen, onTogglePlay, onToggleFav, onNext, onPrev,
}) => {
  const swipeStartX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    if (Math.abs(dx) > 70) {
      dx < 0 ? onNext() : onPrev();
    }
  }, [onNext, onPrev]);

  if (!track) return null;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={onOpen}
      style={{
        position: 'absolute', bottom: 68, left: 8, right: 8,
        borderRadius: 18, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        zIndex: 100, cursor: 'pointer', overflow: 'hidden',
        backdropFilter: 'blur(30px) saturate(200%)',
        WebkitBackdropFilter: 'blur(30px) saturate(200%)',
        background: 'rgba(18,18,30,0.9)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(224,64,251,0.08)',
        transition: 'box-shadow 0.3s',
      }}
    >
      {/* Cover */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <TrackCover src={track.img} size={44} borderRadius={10} />
        {isPlaying && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 10,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Equalizer data={eqData} isPlaying={isPlaying} bars={3} maxH={16} minH={2}
              color="white" animated />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          color: 'var(--text)',
        }}>
          {track.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.artist}
        </div>
      </div>

      {/* Controls */}
      <button
        className="active-scale-sm"
        onClick={onTogglePlay}
        style={{
          width: 38, height: 38, borderRadius: '50%',
          border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 4px 12px rgba(224,64,251,0.35)',
          transition: 'transform 0.12s',
        }}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        className="active-scale-sm"
        onClick={onToggleFav}
        style={{
          width: 32, height: 32, border: 'none', background: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'transform 0.15s',
        }}
      >
        <HeartIcon filled={isFav} />
      </button>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'rgba(255,255,255,0.06)',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
          width: progress + '%',
          transition: 'width 0.3s linear',
        }} />
      </div>
    </div>
  );
};
