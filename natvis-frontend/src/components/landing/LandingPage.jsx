import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Terrain from './Terrain';
import GrassField from './GrassField';
import Plants from './Plants';
import SkyDome from './SkyDome';
import CameraRig from './CameraRig';
import Particles from './Particles';

function SceneLoader() {
  return (
    <mesh position={[0, 2, 0]}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial color="#86c164" wireframe />
    </mesh>
  );
}

export default function LandingPage() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
    }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 60, near: 0.1, far: 500, position: [0, 5, 22] }}
        gl={{
          antialias: true,
          toneMapping: 2, // ACESFilmic
          toneMappingExposure: 1.0,
        }}
        style={{ background: '#060e06' }}
      >
        <Suspense fallback={<SceneLoader />}>
          {/* Lighting */}
          <ambientLight intensity={0.35} color="#8ab87a" />
          <directionalLight
            position={[30, 30, 20]}
            intensity={1.2}
            color="#ffe8c0"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
          />
          <directionalLight
            position={[-20, 10, -10]}
            intensity={0.3}
            color="#6a9aff"
          />

          {/* Scene */}
          <fog attach="fog" args={['#060e06', 30, 100]} />
          <SkyDome />
          <Terrain />
          <GrassField />
          <Plants />
          <Particles />
          <CameraRig />
        </Suspense>
      </Canvas>

      {/* Scroll indicator overlay */}
      <div style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        animation: 'floatUp 2s ease-in-out infinite',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(134, 193, 100, 0.5)',
          fontWeight: 600,
        }}>
          Scroll to explore
        </span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(134,193,100,0.4)" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </div>
  );
}
