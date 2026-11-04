// 3D previews used by the dashboard (one canvas mounted at a time).
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ArenaEnvironment } from '../game/Arena';
import { CharacterModel } from '../game/CharacterModel';
import type { PlayerAnim } from '../game/world';
import type { CharacterId, Palette } from '../data/characters';
import { charById } from '../data/characters';
import type { Quality } from '../store/playerStore';
import type { MapId } from '../data/maps';

function useAnim(mode: PlayerAnim['mode'] = 'play', speed = 0) {
  return useRef<PlayerAnim>({ speed, dash: false, hurt: 0, collect: 0, mode, modeT: 0, invuln: 0, air: 0 });
}

function Runner({ variant, radius, speed, offset }: { variant: CharacterId; radius: number; speed: number; offset: number }) {
  const g = useRef<THREE.Group>(null!);
  const anim = useAnim('play', 6);
  useFrame(({ clock }) => {
    const a = clock.elapsedTime * speed + offset;
    g.current.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    g.current.rotation.y = -a + (speed > 0 ? 0 : Math.PI);
  });
  return <group ref={g}><CharacterModel variant={variant} palette={charById(variant).palette} anim={anim} /></group>;
}

function AutoOrbit() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime * 0.12;
    camera.position.set(Math.cos(t) * 30, 13 + Math.sin(t * 0.7) * 2, Math.sin(t) * 30);
    camera.lookAt(0, 1, 0);
  });
  return null;
}

export function ArenaPreview({ quality, hero, map = 'station' }: { quality: Quality; hero: CharacterId; map?: MapId }) {
  const q: Quality = quality === 'high' ? 'medium' : quality;
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 45, position: [30, 13, 0], far: 900 }} gl={{ antialias: true }}>
      <color attach="background" args={['#05030c']} />
      <Suspense fallback={null}>
        <ArenaEnvironment key={map} quality={q} map={map} />
        <Runner variant={hero} radius={9} speed={0.45} offset={0} />
        <Runner variant="warrior" radius={12} speed={-0.35} offset={2} />
        <Runner variant="assassin" radius={6} speed={0.6} offset={4} />
        <AutoOrbit />
        {quality !== 'low' && (
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.88} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}

function Pedestal({ color }: { color: string }) {
  const ring = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => { ring.current.rotation.z += dt * 0.6; });
  return (
    <group>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[1.3, 1.5, 0.3, 48]} />
        <meshStandardMaterial color="#14101f" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.15, 1.25, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <torusGeometry args={[1.42, 0.03, 8, 64]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function CharacterShowcase({ variant, palette, quality, mode = 'play', locked = false }: {
  variant: CharacterId; palette: Palette; quality: Quality; mode?: PlayerAnim['mode']; locked?: boolean;
}) {
  const anim = useAnim(mode);
  anim.current.mode = mode;
  const shownPalette = useMemo(() => (locked ? { armor: '#1a1825', suit: '#0a0a10', accent: '#3f3a52', visor: '#3f3a52' } : palette), [locked, palette]);
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 35, position: [0, 1.6, 5.2] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} />
      <pointLight position={[-3, 2, -2]} intensity={25} color={palette.accent} />
      <pointLight position={[3, 1, 2]} intensity={10} color="#39ff88" />
      <Suspense fallback={null}>
        <group position={[0, -0.9, 0]}>
          <Pedestal color={locked ? '#3f3a52' : palette.accent} />
          <CharacterModel key={variant} variant={variant} palette={shownPalette} anim={anim} scale={1.15} shadow={false} />
        </group>
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={1.6} minPolarAngle={1.1} maxPolarAngle={1.7} target={[0, 0.2, 0]} />
        {quality !== 'low' && (
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.88} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
