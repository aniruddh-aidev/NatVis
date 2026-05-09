import { useState } from 'react';
import useStore from '../../store';

export default function FloatingButton() {
  const openIdentify = useStore(s => s.openIdentify);
  const openChat = useStore(s => s.openChat);
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      right: 28,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 12,
    }}>
      {/* Expanded sub-buttons */}
      {expanded && (
        <>
          <button
            onClick={() => { openChat(null); setExpanded(false); }}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(14, 26, 14, 0.92)',
              border: '1px solid rgba(134, 193, 100, 0.3)',
              color: '#86c164',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(16px)',
              transition: 'all 0.2s',
              animation: 'fadeIn 0.2s ease',
            }}
            title="General Chat"
          >
            💬
          </button>
        </>
      )}

      {/* Main identify button */}
      <button
        onClick={() => {
          if (expanded) {
            openIdentify();
            setExpanded(false);
          } else {
            setExpanded(!expanded);
          }
        }}
        onContextMenu={(e) => { e.preventDefault(); setExpanded(!expanded); }}
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4a7c35, #2d5a20)',
          border: '2px solid rgba(134, 193, 100, 0.4)',
          color: '#e8f0e0',
          fontSize: 26,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(74, 124, 53, 0.4), 0 0 0 0 rgba(134, 193, 100, 0.2)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: expanded ? 'rotate(45deg)' : 'none',
        }}
        title="Identify Species"
      >
        {expanded ? '✕' : '🔍'}
      </button>

      {/* Label */}
      {!expanded && (
        <div style={{
          position: 'absolute',
          bottom: 68,
          right: 0,
          background: 'rgba(14, 26, 14, 0.9)',
          border: '1px solid rgba(134, 193, 100, 0.2)',
          borderRadius: 8,
          padding: '5px 12px',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(12px)',
          pointerEvents: 'none',
          animation: 'fadeIn 0.3s ease',
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#86c164',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            Identify
          </span>
        </div>
      )}
    </div>
  );
}
