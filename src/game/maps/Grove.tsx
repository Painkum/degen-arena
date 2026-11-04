// Crystal Grove: floating mushroom island under a starry teal sky, with crystals and waterfalls.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ARENA_R, PYLON_R } from '../world';
import { groveTexture, waterTexture } from '../textures';
import { NebulaSky, Island, Mushroom, Asteroids, type IslandDef, type SkyColors } from '../Arena';
import type { Quality } from '../../store/playerStore';

const SKY: SkyColors = {
  base1: [0.02, 0.09, 0.1], base2: [0.01, 0.02, 0.04],
  c1: [0.05, 0.45, 0.4], c2: [0.15, 0.7, 0.55], c3: [0.2, 0.3, 0.8], haze: [0.1, 0.4, 0.35],
};

function Ground() {
  const tex = groveTexture();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[ARENA_R + 0.4, 96]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      {/* grassy lip + rocky underside */}
      <mesh position={[0, -0.36, 0]}>
        <cylinderGeometry args={[ARENA_R + 0.9, ARENA_R + 0.5, 0.6, 14]} />
        <meshStandardMaterial color="#3f8f3a" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, -8, 0]} rotation={[Math.PI, 0.2, 0]}>
        <coneGeometry args={[ARENA_R + 0.6, 15, 12, 3]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.95} flatShading />
      </mesh>
      {/* low stone fence posts */}
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * (ARENA_R + 0.5), 0.4, Math.sin(a) * (ARENA_R + 0.5)]}>
            <boxGeometry args={[0.6, 0.8, 0.6]} />
            <meshStandardMaterial color="#7d6a78" roughness={0.9} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function CrystalHeart() {
  const g = useRef<THREE.Group>(null!);
  const shaft = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(({ clock }, dt) => {
    g.current.rotation.y += dt * 0.25;
    shaft.current.opacity = 0.22 + Math.sin(clock.elapsedTime * 2) * 0.06;
  });
  const shards = [
    [0, 1.6, 0, 0.7, 2.6, 0, 0], [0.9, 0.9, 0.3, 0.4, 1.6, 0.3, -0.5], [-0.8, 0.9, -0.4, 0.45, 1.8, -0.2, 0.5],
    [0.2, 0.8, -1.0, 0.35, 1.3, -0.5, 0.1], [-0.3, 0.7, 1.0, 0.35, 1.2, 0.5, -0.2],
  ];
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[PYLON_R, PYLON_R + 0.3, 0.6, 9]} />
        <meshStandardMaterial color="#6f5d6c" roughness={0.9} flatShading />
      </mesh>
      <group ref={g} position={[0, 0.5, 0]}>
        {shards.map(([x, y, z, w, h, rx, rz], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[rx, i, rz]} scale={[w, h, w]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#ff9be2" emissive="#ff4fc0" emissiveIntensity={1.1} roughness={0.15} flatShading />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 30, 0]}>
        <cylinderGeometry args={[1.6, 2.4, 60, 16, 1, true]} />
        <meshBasicMaterial ref={shaft} color="#7ff5e0" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Giant glowing mushrooms just outside the fence. */
function MushroomRing() {
  const items = useMemo(() => Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + 0.25;
    const r = ARENA_R + 3.2 + (i % 3);
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 2.4 + (i % 4) * 0.6, c: ['#4f7dff', '#6a5cff', '#38bdf8'][i % 3] };
  }), []);
  return <group>{items.map((m, i) => <Mushroom key={i} x={m.x} z={m.z} s={m.s} color={m.c} />)}</group>;
}

function Waterfall({ x, z, h }: { x: number; z: number; h: number }) {
  const tex = useMemo(() => { const t = waterTexture().clone(); t.needsUpdate = true; t.repeat.set(1, 4); return t; }, []);
  useFrame((_, dt) => { tex.offset.y += dt * 1.4; });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2 - 20, 0]} rotation={[0, Math.atan2(x, z), 0]}>
        <planeGeometry args={[2.2, h + 20]} />
        <meshBasicMaterial map={tex} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function GroveEnvironment({ quality }: { quality: Quality }) {
  const q = quality === 'high' ? 1 : quality === 'medium' ? 0.7 : 0.4;
  const rock = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8b5a3c', roughness: 0.9, flatShading: true }), []);
  const top = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8c3a2a', roughness: 0.85, flatShading: true }), []);
  const grass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4f9f45', roughness: 0.85, flatShading: true }), []);
  const islands: IslandDef[] = [
    { p: [20, 14, -26], s: 2.4, crystals: true, waterfall: true },
    { p: [-26, 10, -18], s: 1.8, tree: true },
    { p: [-8, 20, -36], s: 2.8, crystals: true, mushrooms: true },
    { p: [34, 4, 12], s: 1.6, mushrooms: true },
    { p: [-34, -2, 20], s: 2.2, crystals: true, waterfall: true },
    { p: [8, -6, 38], s: 1.7, tree: true },
    { p: [50, 22, -40], s: 3.2, crystals: true },
    { p: [-56, 16, -30], s: 3, mushrooms: true, tree: true },
  ];
  return (
    <>
      <NebulaSky colors={SKY} />
      <fogExp2 attach="fog" args={['#0b2a2c', 0.006]} />
      <ambientLight intensity={0.6} color="#cdeee8" />
      <hemisphereLight args={['#9fe7ff', '#3b2416', 0.8]} />
      <directionalLight position={[15, 30, 10]} intensity={1.2} color="#e6fff7" />
      <pointLight position={[0, 4, 0]} intensity={35} distance={24} color="#ff6ad5" />
      <Stars radius={260} depth={60} count={Math.round(3500 * q)} factor={5} fade speed={0.5} />
      <Ground />
      <CrystalHeart />
      <MushroomRing />
      {islands.slice(0, quality === 'low' ? 5 : 8).map((d, i) => (
        <Island key={i} d={d} rock={rock} grass={i % 2 ? grass : top} />
      ))}
      <Waterfall x={-ARENA_R - 6} z={-10} h={22} />
      <Waterfall x={ARENA_R + 7} z={6} h={18} />
      <Asteroids count={Math.round(20 * q)} />
      <Sparkles count={Math.round(140 * q)} scale={[ARENA_R * 2.6, 10, ARENA_R * 2.6]} position={[0, 4, 0]} size={4} speed={0.3} color="#9ffff0" />
    </>
  );
}
