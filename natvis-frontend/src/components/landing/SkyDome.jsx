import { Sky as DreiSky } from '@react-three/drei';

export default function SkyDome() {
  return (
    <DreiSky
      distance={450000}
      sunPosition={[50, 40, 30]}
      inclination={0.6}
      azimuth={0.25}
      turbidity={1.5}
      rayleigh={0.8}
      mieCoefficient={0.003}
      mieDirectionalG={0.7}
    />
  );
}
