import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight } from './Terrain';

const BLADE_COUNT = 18000;
const SPREAD = 90;

export default function GrassField() {
  const meshRef = useRef();

  const { geometry, material, instancedMesh } = useMemo(() => {
    // Grass blade shape — wider, more natural
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -0.045, 0, 0,
       0.045, 0, 0,
      -0.03, 0.35, 0,
       0.03, 0.35, 0,
      -0.015, 0.65, 0,
       0.015, 0.65, 0,
       0.0,  0.85, 0,
    ]);
    const indices = [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6];
    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWindStrength: { value: 0.25 },
        uFogColor: { value: new THREE.Color('#c8e8f0') },
        uFogNear: { value: 25.0 },
        uFogFar: { value: 75.0 },
      },
      vertexShader: `
        attribute float aScale;
        attribute float aRandom;
        attribute vec3 aColor;
        uniform float uTime;
        uniform float uWindStrength;
        varying float vHeight;
        varying vec3 vWorldPos;
        varying vec3 vColor;
        
        void main() {
          vec3 pos = position;
          float scale = aScale;
          
          // Scale blade
          pos.y *= scale;
          pos.x *= scale * 0.6;
          
          // Wind sway — stronger at top
          float heightRatio = position.y / 0.85;
          float windPhase = uTime * 1.8 + aRandom;
          float windAmount = heightRatio * heightRatio * uWindStrength;
          pos.x += sin(windPhase) * windAmount;
          pos.z += cos(windPhase * 0.6 + 1.0) * windAmount * 0.4;
          
          vHeight = heightRatio;
          vColor = aColor;
          vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uFogColor;
        uniform float uFogNear;
        uniform float uFogFar;
        varying float vHeight;
        varying vec3 vWorldPos;
        varying vec3 vColor;
        
        void main() {
          // Gradient from dark base to bright tips
          vec3 baseGreen = vColor * 0.6;
          vec3 tipGreen = vColor * 1.3;
          vec3 color = mix(baseGreen, tipGreen, smoothstep(0.0, 0.8, vHeight));
          
          // Slight yellow at very tip
          color = mix(color, vColor * vec3(1.2, 1.3, 0.8), smoothstep(0.7, 1.0, vHeight) * 0.3);
          
          // Distance fog
          float dist = length(vWorldPos - cameraPosition);
          float fogFactor = smoothstep(uFogNear, uFogFar, dist);
          color = mix(color, uFogColor, fogFactor);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });

    // Create instances
    const mesh = new THREE.InstancedMesh(geo, mat, BLADE_COUNT);
    const dummy = new THREE.Object3D();
    const scaleAttr = new Float32Array(BLADE_COUNT);
    const randomAttr = new Float32Array(BLADE_COUNT);
    const colorAttr = new Float32Array(BLADE_COUNT * 3);

    // Color palette — variety of rich greens
    const greens = [
      new THREE.Color('#2d8a1a'),
      new THREE.Color('#3ca525'),
      new THREE.Color('#4db830'),
      new THREE.Color('#35951e'),
      new THREE.Color('#48b028'),
      new THREE.Color('#55c032'),
      new THREE.Color('#2a7d16'),
      new THREE.Color('#60c840'),
    ];

    for (let i = 0; i < BLADE_COUNT; i++) {
      const x = (Math.random() - 0.5) * SPREAD;
      const z = (Math.random() - 0.5) * SPREAD;
      const y = getTerrainHeight(x, z) - 2;

      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      scaleAttr[i] = 0.5 + Math.random() * 0.9;
      randomAttr[i] = Math.random() * Math.PI * 2;

      const col = greens[Math.floor(Math.random() * greens.length)];
      colorAttr[i * 3] = col.r;
      colorAttr[i * 3 + 1] = col.g;
      colorAttr[i * 3 + 2] = col.b;
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.geometry.setAttribute('aScale', new THREE.InstancedBufferAttribute(scaleAttr, 1));
    mesh.geometry.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randomAttr, 1));
    mesh.geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colorAttr, 3));

    return { geometry: geo, material: mat, instancedMesh: mesh };
  }, []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime();
  });

  return <primitive ref={meshRef} object={instancedMesh} />;
}
