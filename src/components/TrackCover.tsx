import React, { useState } from 'react';

interface TrackCoverProps {
  src?: string;
  alt?: string;
  size?: number | string;
  borderRadius?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const MusicIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ fill: 'var(--text3)' }}>
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
);

export const TrackCover: React.FC<TrackCoverProps> = ({
  src, alt = '', size = 48, borderRadius = 10, className = '', style = {},
}) => {
  const [failed, setFailed] = useState(false);
  const sz = typeof size === 'number' ? size + 'px' : size;
  const br = typeof borderRadius === 'number' ? borderRadius + 'px' : borderRadius;
  const iconSize = typeof size === 'number' ? Math.round(size * 0.42) : 20;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
      style={{
        width: sz, height: sz, borderRadius: br,
        background: 'var(--card2)', ...style,
      }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <MusicIcon size={iconSize} />
      )}
    </div>
  );
};
