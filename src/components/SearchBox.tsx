import React from 'react';

interface SearchBoxProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ value, onChange, placeholder = 'Поиск...' }) => (
  <div style={{ position: 'relative', marginBottom: 12 }}>
    <svg
      viewBox="0 0 24 24"
      style={{
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        width: 17, height: 17, fill: 'var(--text3)', pointerEvents: 'none',
      }}
    >
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '11px 16px 11px 42px',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12, background: 'var(--card)',
        color: 'var(--text)', fontSize: 14, outline: 'none',
        userSelect: 'text', WebkitUserSelect: 'text',
        transition: 'background 0.2s, border-color 0.2s',
      }}
      onFocus={e => {
        e.currentTarget.style.background = 'var(--card2)';
        e.currentTarget.style.borderColor = 'rgba(224,64,251,0.3)';
      }}
      onBlur={e => {
        e.currentTarget.style.background = 'var(--card)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
      }}
    />
    {value && (
      <button
        onClick={() => onChange('')}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          width: 22, height: 22, borderRadius: '50%',
          border: 'none', background: 'var(--text3)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" style={{ fill: 'var(--bg)' }}>
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    )}
  </div>
);
