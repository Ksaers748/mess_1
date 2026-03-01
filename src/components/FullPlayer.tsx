import React, { useRef, useCallback, useState } from 'react';
import type { Track, RepeatMode } from '../types';
import { TrackCover } from './TrackCover';
import { Equalizer } from './Equalizer';
import { formatTime } from '../utils/search';

interface FullPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  progress: number;
  currentTime: number;
  duration: number;
  isFav: boolean;
  isDownloaded: boolean;
  eqData: number[];
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSeek: (pct: number) => void;
  onToggleFav: () => void;
  onDownload: () => void;
}

const ShuffleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: 'currentColor' }}>
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
  </svg>
);
const PrevIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" style={{ fill: 'currentColor' }}>
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
  </svg>
);
const NextIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" style={{ fill: 'currentColor' }}>
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
  </svg>
);
const RepeatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: 'currentColor' }}>
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
  </svg>
);
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24"
    style={{ fill: filled ? 'var(--accent)' : 'none', stroke: filled ? 'var(--accent)' : 'var(--text2)', strokeWidth: 2, transition: 'all 0.25s' }}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: 'currentColor' }}>
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: 'currentColor' }}>
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
  </svg>
);

export const FullPlayer: React.FC<FullPlayerProps> = ({
  track, isPlaying, isShuffle, repeatMode, progress, currentTime, duration,
  isFav, isDownloaded, eqData, onClose, onTogglePlay, onNext, onPrev,
  onToggleShuffle, onToggleRepeat, onSeek, onToggleFav, onDownload,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const isSwiping = useRef(false);

  const getSeekPct = useCallback((clientX: number) => {
    const bar = progressRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - swipeStartX.current);
    const dy = Math.abs(e.touches[0].clientY - swipeStartY.current);
    if (dx > dy && dx > 12) isSwiping.current = true;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    if (Math.abs(dx) > 80) dx < 0 ? onNext() : onPrev();
  };

  if (!track) return null;

  const PlayIcon = () => (
    <svg width="30" height="30" viewBox="0 0 24 24" style={{ fill: 'var(--bg)' }}>
      {isPlaying
        ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        : <path d="M8 5v14l11-7z"/>}
    </svg>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        overflowY: 'auto',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient glow background */}
      {track.img && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden',
          opacity: 0.12, filter: 'blur(60px)',
          background: 'radial-gradient(circle at 50% 30%, var(--accent), transparent 70%)',
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%' }}>
        {/* Handle bar */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '14px 0 20px', cursor: 'pointer' }} onClick={onClose}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: 'var(--text3)' }} />
        </div>

        {/* Cover art */}
        <div style={{
          width: 'min(78vw, 320px)', height: 'min(78vw, 320px)',
          position: 'relative', marginBottom: 32,
          filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.6))',
        }}>
          <TrackCover
            src={track.img}
            size="100%"
            borderRadius={22}
            style={{
              boxShadow: track.img
                ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
                : undefined,
            }}
          />
          {isPlaying && (
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'flex-end', gap: 4, height: 44,
              background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '8px 14px',
              backdropFilter: 'blur(8px)',
            }}>
              <Equalizer
                data={eqData}
                isPlaying={isPlaying}
                bars={10}
                maxH={28}
                minH={4}
                color="white"
                animated
              />
            </div>
          )}
        </div>

        {/* Track info + heart */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <div style={{
              fontSize: 22, fontWeight: 800, letterSpacing: -0.5,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              color: 'var(--text)',
            }}>
              {track.name}
            </div>
            <div style={{ fontSize: 15, color: 'var(--text2)', marginTop: 5,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {track.artist}
            </div>
          </div>
          <button
            className="active-scale-sm"
            onClick={onToggleFav}
            style={{
              width: 44, height: 44, border: 'none', background: 'rgba(255,255,255,0.05)',
              borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.12s, background 0.2s',
            }}
          >
            <HeartIcon filled={isFav} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ width: '100%', marginBottom: 24 }}>
          <div
            ref={progressRef}
            style={{
              width: '100%', height: isDragging ? 6 : 4,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 3, cursor: 'pointer', position: 'relative',
              transition: 'height 0.15s',
            }}
            onClick={(e) => onSeek(getSeekPct(e.clientX))}
            onTouchStart={(e) => { setIsDragging(true); e.stopPropagation(); }}
            onTouchMove={(e) => { e.stopPropagation(); onSeek(getSeekPct(e.touches[0].clientX)); }}
            onTouchEnd={() => setIsDragging(false)}
          >
            <div
              className={isDragging ? 'progress-thumb' : ''}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                borderRadius: 3, width: progress + '%',
                position: 'relative',
                transition: isDragging ? 'none' : 'width 0.1s linear',
                boxShadow: '0 0 8px rgba(224,64,251,0.5)',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, width: '100%', marginBottom: 36 }}>
          <button
            className="active-scale-sm"
            onClick={onToggleShuffle}
            style={{
              width: 42, height: 42, border: 'none', background: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isShuffle ? 'var(--accent)' : 'var(--text2)',
              transition: 'color 0.2s, transform 0.12s',
              position: 'relative',
            }}
          >
            <ShuffleIcon />
            {isShuffle && (
              <div style={{
                position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)',
              }} />
            )}
          </button>

          <button
            className="active-scale-sm"
            onClick={onPrev}
            style={{
              width: 52, height: 52, border: 'none', background: 'rgba(255,255,255,0.05)',
              borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', transition: 'transform 0.12s, background 0.2s',
            }}
          >
            <PrevIcon />
          </button>

          <button
            className="active-scale"
            onClick={onTogglePlay}
            style={{
              width: 68, height: 68, borderRadius: '50%', border: 'none',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 28px rgba(224,64,251,0.45)',
              transition: 'transform 0.12s, box-shadow 0.2s',
            }}
          >
            <PlayIcon />
          </button>

          <button
            className="active-scale-sm"
            onClick={onNext}
            style={{
              width: 52, height: 52, border: 'none', background: 'rgba(255,255,255,0.05)',
              borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', transition: 'transform 0.12s, background 0.2s',
            }}
          >
            <NextIcon />
          </button>

          <button
            className="active-scale-sm"
            onClick={onToggleRepeat}
            style={{
              width: 42, height: 42, border: 'none', background: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: repeatMode > 0 ? 'var(--accent)' : 'var(--text2)',
              transition: 'color 0.2s, transform 0.12s',
              position: 'relative',
            }}
          >
            <RepeatIcon />
            {repeatMode === 2 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                fontSize: 9, fontWeight: 800, color: 'var(--accent)',
                lineHeight: 1,
              }}>1</span>
            )}
            {repeatMode > 0 && (
              <div style={{
                position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)',
              }} />
            )}
          </button>
        </div>

        {/* Download btn */}
        <button
          className="active-scale"
          onClick={onDownload}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 28px',
            border: isDownloaded ? '1px solid var(--green)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 50, background: 'none', cursor: 'pointer',
            color: isDownloaded ? 'var(--green)' : 'var(--text2)',
            fontSize: 13, fontWeight: 600,
            transition: 'all 0.25s, transform 0.12s',
            marginBottom: 40,
          }}
        >
          {isDownloaded ? <CheckIcon /> : <DownloadIcon />}
          {isDownloaded ? 'Скачано' : 'Скачать трек'}
        </button>
      </div>
    </div>
  );
};
