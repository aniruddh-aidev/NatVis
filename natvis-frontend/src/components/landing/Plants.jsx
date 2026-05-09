import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getTerrainHeight } from './Terrain';
import { apiListSpecies } from '../../api';
import useStore from '../../store';

/* ── Dense wildflower field ─────────────────────────────────
   Two layers:
   1. WildflowerField — 400+ decorative flowers (no labels, pure density)
   2. SpeciesPlants   — ~25 interactive plants with species labels
*/

const FLOWER_COLORS = [
  '#e8425c', '#f04060', '#d43d5a', // reds
  '#a855f4', '#9333ea', '#7c3aed', // purples/violets
  '#f59e0b', '#f97316', '#eab308', // oranges/yellows
  '#ec4899', '#f472b6', '#db2777', // pinks
  '#3b82f6', '#60a5fa',            // blues
  '#ffffff', '#fde68a',            // white/cream
];

const WILDFLOWER_COUNT = 500;
const SPREAD = 85;

// ── Instanced wildflower field (decorative, no labels) ──────
function WildflowerField() {
  const meshRef = useRef();

  const instancedMesh = useMemo(() => {
    // Simple flower: small sphere + petals around it
    // We'll use a single merged geometry for performance
    const petalGeo = new THREE.CircleGeometry(0.08, 5);
    
    const mesh = new THREE.InstancedMesh(
      petalGeo,
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        roughness: 0.5,
      }),
      WILDFLOWER_COUNT
    );

    const dummy = new THREE.Object3D();
    const colors = new Float32Array(WILDFLOWER_COUNT * 3);

    for (let i = 0; i < WILDFLOWER_COUNT; i++) {
      const x = (Math.random() - 0.5) * SPREAD;
      const z = (Math.random() - 0.5) * SPREAD;
      const y = getTerrainHeight(x, z) - 2;
      const scale = 0.8 + Math.random() * 1.5;

      dummy.position.set(x, y + 0.35 * scale, z);
      dummy.rotation.set(
        Math.random() * 0.4 - 0.2,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const col = new THREE.Color(FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)]);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

    return mesh;
  }, []);

  useFrame(({ clock }) => {
    // Gentle swaying
    const t = clock.getElapsedTime();
    instancedMesh.rotation.x = Math.sin(t * 0.3) * 0.01;
  });

  return <primitive ref={meshRef} object={instancedMesh} />;
}

// Additional flower layer — taller stems with blooms
function TallFlowerField() {
  const COUNT = 300;
  const meshRef = useRef();

  const { stemMesh, bloomMesh } = useMemo(() => {
    // Stems
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.5, 4);
    const stemMat = new THREE.MeshStandardMaterial({ color: '#2d7a18', roughness: 0.8 });
    const stemInst = new THREE.InstancedMesh(stemGeo, stemMat, COUNT);

    // Blooms
    const bloomGeo = new THREE.SphereGeometry(0.06, 6, 5);
    const bloomMat = new THREE.MeshStandardMaterial({ roughness: 0.4 });
    const bloomInst = new THREE.InstancedMesh(bloomGeo, bloomMat, COUNT);

    const dummy = new THREE.Object3D();
    const bloomColors = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * SPREAD;
      const z = (Math.random() - 0.5) * SPREAD;
      const y = getTerrainHeight(x, z) - 2;
      const stemH = 0.3 + Math.random() * 0.5;

      // Stem
      dummy.position.set(x, y + stemH * 0.5, z);
      dummy.rotation.set(0, Math.random() * Math.PI, Math.random() * 0.15);
      dummy.scale.set(1, stemH / 0.5, 1);
      dummy.updateMatrix();
      stemInst.setMatrixAt(i, dummy.matrix);

      // Bloom
      const bloomScale = 0.8 + Math.random() * 1.2;
      dummy.position.set(x, y + stemH + 0.04, z);
      dummy.scale.setScalar(bloomScale);
      dummy.updateMatrix();
      bloomInst.setMatrixAt(i, dummy.matrix);

      const col = new THREE.Color(FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)]);
      bloomColors[i * 3] = col.r;
      bloomColors[i * 3 + 1] = col.g;
      bloomColors[i * 3 + 2] = col.b;
    }

    stemInst.instanceMatrix.needsUpdate = true;
    bloomInst.instanceMatrix.needsUpdate = true;
    bloomInst.instanceColor = new THREE.InstancedBufferAttribute(bloomColors, 3);

    return { stemMesh: stemInst, bloomMesh: bloomInst };
  }, []);

  return (
    <group ref={meshRef}>
      <primitive object={stemMesh} />
      <primitive object={bloomMesh} />
    </group>
  );
}

// ── Interactive species plants (with labels + click) ────────
const PETAL_COLORS_NAMED = [
  '#e8425c', '#d4a843', '#a855f4', '#3b82f6', '#ec4899',
  '#f59e0b', '#7de050', '#db2777', '#ff6f91', '#ffc75f',
  '#845ec2', '#9333ea', '#f97316', '#60a5fa', '#fde68a',
];

function SpeciesPlant({ position, species, index }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const openSpecies = useStore(s => s.openSpecies);

  const petalColor = PETAL_COLORS_NAMED[index % PETAL_COLORS_NAMED.length];

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.z = Math.sin(t * 0.8 + index) * 0.04;
      const targetScale = hovered ? 1.8 : 1.2;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      onClick={(e) => { e.stopPropagation(); openSpecies(species.scientific_name); }}
    >
      {/* Stem */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 0.7, 6]} />
        <meshStandardMaterial color="#2d8a18" roughness={0.7} />
      </mesh>
      {/* Leaves */}
      <mesh position={[0.1, 0.25, 0]} scale={[1, 0.35, 0.5]} rotation={[0, 0, -0.5]}>
        <sphereGeometry args={[0.12, 6, 4]} />
        <meshStandardMaterial color="#3da525" roughness={0.6} />
      </mesh>
      <mesh position={[-0.1, 0.2, 0]} scale={[1, 0.35, 0.5]} rotation={[0, 0, 0.5]}>
        <sphereGeometry args={[0.12, 6, 4]} />
        <meshStandardMaterial color="#3da525" roughness={0.6} />
      </mesh>
      {/* Flower head */}
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color={petalColor} roughness={0.3} emissive={petalColor} emissiveIntensity={0.1} />
      </mesh>
      {/* Petals */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.13, 0.75, Math.sin(angle) * 0.13]}
            rotation={[0.3, angle, 0]}
          >
            <circleGeometry args={[0.09, 6]} />
            <meshStandardMaterial color={petalColor} side={THREE.DoubleSide} roughness={0.5} />
          </mesh>
        );
      })}

      {/* Floating label */}
      <Html
        position={[0, 1.3, 0]}
        center
        distanceFactor={10}
        style={{
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
          opacity: hovered ? 1 : 0.75,
          transform: hovered ? 'scale(1.12)' : 'scale(1)',
        }}
      >
        <div style={{
          background: hovered ? 'rgba(10, 22, 10, 0.95)' : 'rgba(10, 22, 10, 0.75)',
          border: `1px solid ${hovered ? 'rgba(134, 193, 100, 0.6)' : 'rgba(134, 193, 100, 0.25)'}`,
          borderRadius: 8,
          padding: '4px 10px',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease',
          boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: 11,
            color: hovered ? '#a8e67a' : '#86c164',
          }}>
            {species.scientific_name}
          </div>
          {species.common_names && (
            <div style={{ fontSize: 9, color: '#5a7854', marginTop: 1 }}>
              {Array.isArray(species.common_names)
                ? species.common_names[0]
                : typeof species.common_names === 'string'
                  ? (() => { try { return JSON.parse(species.common_names)?.[0]; } catch { return species.common_names; } })()
                  : ''}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// ── Main Plants component ────────────────────────────────────
export default function Plants() {
  const [speciesList, setSpeciesList] = useState([]);

  useEffect(() => {
    apiListSpecies('Plantae', 25)
      .then(data => {
        const list = data?.species ?? data ?? [];
        setSpeciesList(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        setSpeciesList([
          { scientific_name: 'Rosa gallica', common_names: ['French Rose'] },
          { scientific_name: 'Taraxacum officinale', common_names: ['Dandelion'] },
          { scientific_name: 'Lavandula angustifolia', common_names: ['Lavender'] },
          { scientific_name: 'Helianthus annuus', common_names: ['Sunflower'] },
          { scientific_name: 'Mentha piperita', common_names: ['Peppermint'] },
          { scientific_name: 'Salvia rosmarinus', common_names: ['Rosemary'] },
          { scientific_name: 'Aloe vera', common_names: ['Aloe Vera'] },
          { scientific_name: 'Chamaemelum nobile', common_names: ['Chamomile'] },
          { scientific_name: 'Ocimum basilicum', common_names: ['Basil'] },
          { scientific_name: 'Thymus vulgaris', common_names: ['Thyme'] },
          { scientific_name: 'Digitalis purpurea', common_names: ['Foxglove'] },
          { scientific_name: 'Atropa belladonna', common_names: ['Deadly Nightshade'] },
          { scientific_name: 'Papaver somniferum', common_names: ['Opium Poppy'] },
          { scientific_name: 'Cannabis sativa', common_names: ['Hemp'] },
          { scientific_name: 'Calendula officinalis', common_names: ['Marigold'] },
        ]);
      });
  }, []);

  const plantPositions = useMemo(() => {
    if (speciesList.length === 0) return [];
    const positions = [];
    const count = Math.min(speciesList.length, 25);
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const x = (col - 2) * 7 + (Math.random() - 0.5) * 5;
      const z = -row * 8 + (Math.random() - 0.5) * 4;
      const y = getTerrainHeight(x, z) - 2;
      positions.push([x, y, z]);
    }
    return positions;
  }, [speciesList]);

  return (
    <group>
      {/* Dense decorative wildflower layers */}
      <WildflowerField />
      <TallFlowerField />

      {/* Interactive species plants with labels */}
      {speciesList.slice(0, 25).map((species, i) => (
        plantPositions[i] && (
          <SpeciesPlant
            key={species.scientific_name || i}
            position={plantPositions[i]}
            species={species}
            index={i}
          />
        )
      ))}
    </group>
  );
}
