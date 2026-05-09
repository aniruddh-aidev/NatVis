import LandingPage from './components/landing/LandingPage';
import FloatingButton from './components/ui/FloatingButton';
import IdentifyModal from './components/identify/IdentifyModal';
import SpeciesModal from './components/species/SpeciesModal';
import ChatDrawer from './components/chat/ChatDrawer';
import useStore from './store';

// Logo overlay on the 3D scene
function Logo() {
  const scrollProgress = useStore(s => s.scrollProgress);
  const opacity = Math.max(0, 1 - scrollProgress * 3);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      pointerEvents: 'none',
      padding: '40px 24px',
      textAlign: 'center',
      opacity,
      transition: 'opacity 0.1s',
    }}>
      <div style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          fontSize: 48,
          filter: 'drop-shadow(0 2px 12px rgba(134, 193, 100, 0.3))',
        }}>🌿</div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(36px, 8vw, 56px)',
          fontWeight: 700,
          color: '#e8f0e0',
          margin: 0,
          lineHeight: 1.1,
          textShadow: '0 2px 30px rgba(134, 193, 100, 0.25), 0 0 60px rgba(6, 14, 6, 0.8)',
          letterSpacing: '-0.02em',
        }}>
          NatVis
        </h1>
        <p style={{
          fontSize: 'clamp(13px, 3vw, 16px)',
          color: 'rgba(134, 193, 100, 0.7)',
          margin: 0,
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textShadow: '0 1px 10px rgba(6, 14, 6, 0.9)',
        }}>
          Nature Vision
        </p>
        <p style={{
          fontSize: 'clamp(12px, 2.5vw, 14px)',
          color: 'rgba(168, 184, 160, 0.6)',
          margin: '6px 0 0',
          maxWidth: 340,
          lineHeight: 1.5,
          textShadow: '0 1px 8px rgba(6, 14, 6, 0.9)',
        }}>
          Identify flora, fauna & fungi — explore the living world
        </p>
      </div>
    </div>
  );
}

// Ambient info bar at the top
function TopBar() {
  const openIdentify = useStore(s => s.openIdentify);
  const scrollProgress = useStore(s => s.scrollProgress);
  const opacity = Math.min(1, scrollProgress * 4);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      background: `rgba(6, 14, 6, ${0.85 * opacity})`,
      backdropFilter: opacity > 0.1 ? 'blur(16px)' : 'none',
      borderBottom: `1px solid rgba(134, 193, 100, ${0.1 * opacity})`,
      opacity,
      pointerEvents: opacity > 0.3 ? 'auto' : 'none',
      transition: 'opacity 0.15s',
    }}>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 20,
        fontWeight: 700,
        color: '#e8f0e0',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>🌿</span> NatVis
      </div>
      <button
        onClick={openIdentify}
        style={{
          padding: '7px 16px',
          borderRadius: 10,
          background: 'rgba(74, 124, 53, 0.3)',
          border: '1px solid rgba(134, 193, 100, 0.3)',
          color: '#86c164',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.04em',
        }}
      >
        🔍 Identify
      </button>
    </div>
  );
}

export default function App() {
  return (
    <>
      {/* 3D Scene (background) */}
      <LandingPage />

      {/* HTML Overlays */}
      <Logo />
      <TopBar />
      <FloatingButton />

      {/* Modal overlays */}
      <IdentifyModal />
      <SpeciesModal />
      <ChatDrawer />
    </>
  );
}
