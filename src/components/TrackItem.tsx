import React from 'react';
import type { Track } from '../types';
import { TrackCover } from './TrackCover';
import { Equalizer } from './Equalizer';

interface TrackItemProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isFav: boolean;
  isPlaying: boolean;
  eqData: number[];
  onPlay: () => void;
  onFav: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24"
    style={{ fill: filled ? 'var(--accent)' : 'none', stroke: filled ? 'var(--accent)' : 'var(--text3)', strokeWidth: 2, transition: 'all 0.25s' }}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

export const TrackItem: React.FC<TrackItemProps> = ({
  track, index, isCurrent, isFav, isPlaying, eqData, onPlay, onFav, style,
}) => {
  return (
    <div
      className="animate-fade-in-up active-scale"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 8px', borderRadius: 14, cursor: 'pointer',
        background: isCurrent ? 'rgba(224,64,251,0.07)' : 'transparent',
        transition: 'background 0.2s, transform 0.15s',
        animationDelay: Math.min(index * 0.035, 0.5) + 's',
        ...style,
      }}
      onClick={onPlay}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <TrackCover src={track.img} size={52} borderRadius={12} />
        {isCurrent && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Equalizer data={eqData} isPlaying={isPlaying} bars={4} maxH={20} minH={3}
              color="white" animated />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          color: isCurrent ? 'var(--accent)' : 'var(--text)',
          transition: 'color 0.2s',
        }}>
          {track.name}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--text2)', marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {track.artist}
        </div>
      </div>
      <button
        className="active-scale-sm"
        onClick={onFav}
        style={{
          width: 36, height: 36, border: 'none', background: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'transform 0.15s',
        }}
      >
        <HeartIcon filled={isFav} />
      </button>
    </div>
  );
};
