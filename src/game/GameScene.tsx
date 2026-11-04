import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ArenaEnvironment } from './Arena';
import { Coins, Boosters, Lasers, Walls, Traps, Hammers, Zones, Opponents, PlayerAvatar } from './Entities';
import { world, step } from './world';
import { createParticleSystem, setParticleBudget } from './particles';
import { input } from './input';
import type { Quality } from '../store/playerStore';
import type { CharacterId } from '../data/characters';
import type { MapId } from '../data/maps';

function Loop() {
  useFrame((_, dt) => step(dt));
  return null;
}

function ParticleLayer() {
  const sys = useMemo(() => createParticleSystem(), []);
  useEffect(() => () => sys.clear(), [sys]);
  useFrame((_, dt) => { if (!world.paused) sys.update(Math.min(dt, 0.05)); });
  return <primitive object={sys.points} />;
}

function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 1, 9));
  const first = useRef(true);
  useFrame((_, dt) => {
    const p = world.player;
    const c = world.cam;
    const height = c.dist * 0.62;
    const tx = p.x + Math.sin(c.yaw) * c.dist;
    const tz = p.z + Math.cos(c.yaw) * c.dist;
    const k = first.current ? 1 : 1 - Math.exp(-dt * 6);
    first.current = false;
    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (height + 1 - camera.position.y) * k;
    camera.position.z += (tz - camera.position.z) * k;
    if (!reducedMotion && c.shake > 0) {
      const s = c.shake * 0.5;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    look.current.lerp(new THREE.Vector3(p.x, 1.2, p.z), 1 - Math.exp(-dt * 10));
    camera.lookAt(look.current);
  });
  return null;
}

/** Drag on the canvas (mouse or touch) to orbit the camera; wheel to zoom. */
function useCameraDrag(el: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let id: number | null = null;
    let lastX = 0;
    const down = (e: PointerEvent) => {
      if (id !== null) return;
      id = e.pointerId;
      lastX = e.clientX;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      input.camYawDelta -= (e.clientX - lastX) * 0.006;
      lastX = e.clientX;
    };
    const up = (e: PointerEvent) => { if (e.pointerId === id) id = null; };
    const wheel = (e: WheelEvent) => { input.zoomDelta += Math.sign(e.deltaY) * 0.8; };
    node.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    node.addEventListener('wheel', wheel, { passive: true });
    return () => {
      node.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      node.removeEventListener('wheel', wheel);
    };
  }, [el]);
}

export function GameScene({ quality, reducedMotion, character, skin, trail, roundKey, map }: {
  quality: Quality; reducedMotion: boolean; character: CharacterId; skin: string; trail: string; roundKey: number; map: MapId;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  useCameraDrag(wrap);
  useEffect(() => { setParticleBudget(quality === 'low' || reducedMotion ? 0.5 : 1); }, [quality, reducedMotion]);
  const dpr: [number, number] = quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [0.75, 1];

  return (
    <div ref={wrap} className="absolute inset-0 touch-none select-none">
      <Canvas
        dpr={dpr}
        gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
        camera={{ fov: 55, near: 0.1, far: 900, position: [0, 8, 20] }}
      >
        <color attach="background" args={['#05030c']} />
        <Suspense fallback={null}>
          <ArenaEnvironment quality={quality} map={map} />
          <group key={roundKey}>
            <Coins />
            <Boosters />
            <Lasers />
            <Walls />
            <Traps />
            <Hammers />
            <Zones />
            <Opponents />
            <PlayerAvatar character={character} skin={skin} trail={trail} />
            <ParticleLayer />
          </group>
          <Loop />
          <CameraRig reducedMotion={reducedMotion} />
          {quality !== 'low' && (
            <EffectComposer multisampling={0}>
              <Bloom mipmapBlur intensity={quality === 'high' ? 1.1 : 0.8} luminanceThreshold={0.88} luminanceSmoothing={0.2} />
              <Vignette eskil={false} offset={0.2} darkness={0.7} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
