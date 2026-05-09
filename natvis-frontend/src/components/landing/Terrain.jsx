import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

// Generate height at a given (x, z)
export function getTerrainHeight(x, z) {
  const scale1 = 0.035, scale2 = 0.07, scale3 = 0.018;
  let h = 0;
  h += noise2D(x * scale1, z * scale1) * 4.0;
  h += noise2D(x * scale2 + 100, z * scale2 + 100) * 2.0;
  h += noise2D(x * scale3 + 200, z * scale3 + 200) * 7;
  return h * 0.55;
}

export default function Terrain() {
  const meshRef = useRef();

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(200, 200, 300, 300);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, getTerrainHeight(x, y));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorLow: { value: new THREE.Color('#2a7a18') },
        uColorMid: { value: new THREE.Color('#3da524') },
        uColorHigh: { value: new THREE.Color('#5cc835') },
        uColorPeak: { value: new THREE.Color('#7de050') },
        uFogColor: { value: new THREE.Color('#c8e8f0') },
        uFogNear: { value: 50.0 },
        uFogFar: { value: 110.0 },
      },
      vertexShader: `
        varying float vHeight;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          vHeight = position.z;
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorLow;
        uniform vec3 uColorMid;
        uniform vec3 uColorHigh;
        uniform vec3 uColorPeak;
        uniform vec3 uFogColor;
        uniform float uFogNear;
        uniform float uFogFar;
        varying float vHeight;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        
        // Simple hash for variation
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        void main() {
          float h = clamp((vHeight + 5.0) / 12.0, 0.0, 1.0);
          
          // Multi-stop gradient for rich green variation
          vec3 baseColor = mix(uColorLow, uColorMid, smoothstep(0.0, 0.35, h));
          baseColor = mix(baseColor, uColorHigh, smoothstep(0.35, 0.65, h));
          baseColor = mix(baseColor, uColorPeak, smoothstep(0.65, 1.0, h));
          
          // Micro variation for grass-like texture
          float variation = hash(vUv * 500.0) * 0.08;
          baseColor = mix(baseColor, baseColor * 1.15, variation);
          
          // Warm directional sun light
          vec3 lightDir = normalize(vec3(0.4, 1.0, 0.3));
          float diff = max(dot(vNormal, lightDir), 0.0) * 0.55 + 0.45;
          
          // Subtle rim/fresnel for depth
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
          rim = pow(rim, 3.0) * 0.15;
          
          vec3 color = baseColor * diff + rim * vec3(0.4, 0.7, 0.3);
          
          // Atmospheric fog (light blue-white)
          float dist = length(vWorldPos - cameraPosition);
          float fogFactor = smoothstep(uFogNear, uFogFar, dist);
          color = mix(color, uFogColor, fogFactor);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame(({ clock }) => {
    if (material.uniforms) {
      material.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2, 0]}
      receiveShadow
    />
  );
}
