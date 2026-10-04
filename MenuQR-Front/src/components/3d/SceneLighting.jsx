import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Warm, soft "late-afternoon window" lighting. A procedural room environment
 * gives the ceramic and tomatoes believable reflections without downloading
 * an HDR file.
 */
export default function SceneLighting() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
      room.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
    };
  }, [gl, scene]);

  return (
    <>
      <hemisphereLight args={['#fff4e2', '#c9a98a', 0.7]} />
      <directionalLight position={[-3.5, 6, 4]} intensity={2.4} color="#ffe6c7" />
      <directionalLight position={[4, 2, -3]} intensity={0.9} color="#ffd2b0" />
    </>
  );
}
