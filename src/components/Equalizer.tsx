import React from 'react';

interface EqualizerProps {
  data: number[];
  isPlaying: boolean;
  bars?: number;
  maxH?: number;
  minH?: number;
  className?: string;
  color?: string;
  animated?: boolean;
}

export const Equalizer: React.FC<EqualizerProps> = ({
  data, isPlaying, bars = 5, maxH = 28, minH = 3,
  className = '', color = 'var(--accent)', animated = true,
}) => {
  const cssAnimClasses = ['eq-bar-1', 'eq-bar-2', 'eq-bar-3', 'eq-bar-4'];

  return (
    <div
      className={`flex items-end gap-[2px] ${className}`}
      style={{ height: maxH + 'px' }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const val = data[Math.floor(i * data.length / bars)] ?? 0;
        const h = isPlaying ? Math.max(minH, val * maxH) : minH;
        const useCssAnim = animated && isPlaying && data.every(v => v === 0);

        return (
          <div
            key={i}
            className={useCssAnim ? cssAnimClasses[i % 4] : ''}
            style={{
              width: 3,
              height: h,
              borderRadius: 2,
              background: color,
              transition: useCssAnim ? undefined : 'height 0.08s ease',
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
};
