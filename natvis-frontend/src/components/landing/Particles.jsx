import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 200;

export default function Particles() {
  const meshRef = useRef();

  const { positions, velocities, sizes } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = [];
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 15 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      
      velocities.push({
        x: (Math.random() - 0.5) * 0.01,
        y: 0.005 + Math.random() * 0.015,
        z: (Math.random() - 0.5) * 0.01,
      });

      sizes[i] = 0.03 + Math.random() * 0.06;
    }

    return { positions, velocities, sizes };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, sizes]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#c8e6a0') },
      },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        varying float vAlpha;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          // Twinkle
          vAlpha = 0.3 + 0.5 * sin(uTime * 2.0 + position.x * 10.0 + position.z * 7.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, d);
          gl_FragColor = vec4(uColor, glow * vAlpha * 0.6);
        }
      `,
    });
  }, []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime();

    const posArray = geometry.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      posArray[idx] += velocities[i].x;
      posArray[idx + 1] += velocities[i].y;
      posArray[idx + 2] += velocities[i].z;

      // Reset particle when too high
      if (posArray[idx + 1] > 18) {
        posArray[idx] = (Math.random() - 0.5) * 80;
        posArray[idx + 1] = 0.5;
        posArray[idx + 2] = (Math.random() - 0.5) * 80;
      }
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points geometry={geometry} material={material} />
  );
}
