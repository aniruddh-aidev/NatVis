import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../../store';

export default function CameraRig() {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 4, 20));
  const targetLook = useRef(new THREE.Vector3(0, 0, -10));
  const scrollY = useRef(0);
  const maxScroll = useRef(1);

  useEffect(() => {
    // Make page scrollable by setting body height
    document.body.style.height = '400vh';
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    // Initial camera
    camera.position.set(0, 5, 22);
    camera.lookAt(0, 0, -10);

    const handleScroll = () => {
      scrollY.current = window.scrollY;
      maxScroll.current = document.body.scrollHeight - window.innerHeight;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [camera]);

  useFrame(() => {
    const progress = Math.min(scrollY.current / Math.max(maxScroll.current, 1), 1);
    useStore.getState().setScrollProgress(progress);

    // Camera path: move forward and descend as user scrolls
    // Start: high and back (y=5, z=22) → End: low and close (y=2, z=-15)
    const startPos = new THREE.Vector3(0, 5, 22);
    const endPos = new THREE.Vector3(0, 1.5, -20);
    const currentTarget = new THREE.Vector3().lerpVectors(startPos, endPos, progress);
    targetPos.current.copy(currentTarget);

    // Look target follows ahead of camera
    const startLook = new THREE.Vector3(0, 1, 0);
    const endLook = new THREE.Vector3(0, 0, -30);
    targetLook.current.lerpVectors(startLook, endLook, progress);

    // Smooth lerp
    camera.position.lerp(targetPos.current, 0.08);
    
    // Smooth look-at
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    const desiredDir = new THREE.Vector3().subVectors(targetLook.current, camera.position).normalize();
    const smoothDir = currentLook.lerp(desiredDir, 0.06);
    const lookTarget = new THREE.Vector3().addVectors(camera.position, smoothDir);
    camera.lookAt(lookTarget);
  });

  return null;
}
