import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, visible }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
    } else {
      const t = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!show && !visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 150, left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : 10}px)`,
      background: 'rgba(30,30,46,0.96)',
      color: 'var(--text)', padding: '10px 22px',
      borderRadius: 12, fontSize: 13, fontWeight: 500,
      zIndex: 9999, whiteSpace: 'nowrap',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      opacity: visible ? 1 : 0,
      pointerEvents: 'none',
      transition: 'all 0.3s cubic-bezier(0.22, 0.68, 0.32, 1)',
    }}>
      {message}
    </div>
  );
};
