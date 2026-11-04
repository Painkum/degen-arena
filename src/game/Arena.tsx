// Floating space-station dojo above a purple nebula: light deck with blue/orange rails,
// a crystal core firing a golden beam, loop tracks, a giant moon and floating grass islands.
// Shared by the game and the dashboard preview.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ARENA_R, PYLON_R } from './world';
import { deckTexture, moonTexture, waterTexture } from './textures';
import type { Quality } from '../store/playerStore';
import type { MapId } from '../data/maps';
import { GroveEnvironment } from './maps/Grove';
import { HarborEnvironment } from './maps/Harbor';

const BLUE = '#2f4fd1';
const ORANGE = '#f08c2e';
const PINK = '#ff4fa3';
const GOLD = '#ffd23f';

// ---------------- sky ----------------
export interface SkyColors { base1: [number, number, number]; base2: [number, number, number]; c1: [number, number, number]; c2: [number, number, number]; c3: [number, number, number]; haze: [number, number, number] }
export const STATION_SKY: SkyColors = { base1: [0.08, 0.06, 0.28], base2: [0.03, 0.02, 0.1], c1: [0.55, 0.18, 0.75], c2: [0.95, 0.35, 0.75], c3: [0.25, 0.45, 0.95], haze: [0.35, 0.25, 0.75] };

export function NebulaSky({ colors = STATION_SKY }: { colors?: SkyColors }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      t: { value: 0 },
      base1: { value: new THREE.Vector3(...colors.base1) }, base2: { value: new THREE.Vector3(...colors.base2) },
      c1: { value: new THREE.Vector3(...colors.c1) }, c2: { value: new THREE.Vector3(...colors.c2) },
      c3: { value: new THREE.Vector3(...colors.c3) }, haze: { value: new THREE.Vector3(...colors.haze) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float t; uniform vec3 base1; uniform vec3 base2; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 haze; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      float n(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=0.5; } return v; }
      void main(){
        vec3 d = vP;
        vec3 base = mix(base1, base2, smoothstep(-0.2, 0.9, d.y));
        float cl1 = fbm(d*2.2 + vec3(0.0, t*0.01, 0.0));
        float cl2 = fbm(d*3.5 + vec3(5.2, 1.3, t*0.008));
        vec3 col = base;
        col += c1 * smoothstep(0.45, 0.85, cl1) * 0.9;
        col += c2 * smoothstep(0.6, 0.95, cl2) * 0.55;
        col += c3 * smoothstep(0.55, 0.9, fbm(d*1.6 - 3.0)) * 0.5;
        col += haze * exp(-abs(d.y+0.05)*5.0) * 0.4; // horizon haze
        float s = step(0.9975, h(floor(d*420.0)));
        col += s * vec3(1.0);
        gl_FragColor = vec4(col, 1.0);
      }`,
  }), [colors]);
  useFrame((_, dt) => { mat.uniforms.t.value += dt; });
  return <mesh material={mat}><sphereGeometry args={[420, 48, 24]} /></mesh>;
}

function Moon() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => { ref.current.rotation.y += dt * 0.01; });
  const glow = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    grd.addColorStop(0, 'rgba(170,200,255,.55)');
    grd.addColorStop(1, 'rgba(170,200,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <group position={[-60, 85, -230]}>
      <mesh ref={ref}>
        <sphereGeometry args={[38, 48, 32]} />
        <meshBasicMaterial map={moonTexture()} fog={false} toneMapped={false} />
      </mesh>
      <sprite scale={[150, 150, 1]}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
    </group>
  );
}

// ---------------- the deck ----------------
function Deck() {
  const tex = deckTexture();
  const glass = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => { glass.current.opacity = 0.18 + Math.sin(clock.elapsedTime * 2.5) * 0.05; });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[ARENA_R + 0.4, 96]} />
        <meshStandardMaterial map={tex} roughness={0.55} metalness={0.15} />
      </mesh>
      {/* outer wall: dark band + chunky blue rail + orange inner rail */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[ARENA_R + 0.5, ARENA_R + 0.2, 1.1, 96, 1, true]} />
        <meshStandardMaterial color="#2a2448" metalness={0.5} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ARENA_R + 0.45, 0.28, 12, 128]} />
        <meshStandardMaterial color={BLUE} metalness={0.4} roughness={0.3} emissive={BLUE} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ARENA_R - 0.05, 0.08, 8, 128]} />
        <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.9} />
      </mesh>
      {/* faint energy barrier */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[ARENA_R + 0.45, ARENA_R + 0.45, 2, 96, 1, true]} />
        <meshStandardMaterial ref={glass} color="#7aa8ff" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} emissive="#7aa8ff" emissiveIntensity={0.4} />
      </mesh>
      {/* underside machinery */}
      <mesh position={[0, -2.6, 0]}>
        <cylinderGeometry args={[ARENA_R - 1, ARENA_R - 5, 3, 48]} />
        <meshStandardMaterial color="#3a3366" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, -4.6, 0]}>
        <cylinderGeometry args={[ARENA_R - 6, 4, 2.5, 32]} />
        <meshStandardMaterial color="#2a2448" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-1.4, -3.9].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[i ? ARENA_R - 5.6 : ARENA_R - 0.6, 0.12, 8, 96]} />
          <meshStandardMaterial color={i ? PINK : '#5fd0ff'} emissive={i ? PINK : '#5fd0ff'} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
      {/* glowing support pillars down to the islands */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const r = ARENA_R - 4;
        return (
          <group key={i} position={[Math.cos(a) * r, -9, Math.sin(a) * r]}>
            <mesh>
              <cylinderGeometry args={[0.7, 0.7, 12, 12, 1, true]} />
              <meshStandardMaterial color="#8fe3ff" emissive="#5fd0ff" emissiveIntensity={1.2} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh>
              <cylinderGeometry args={[0.18, 0.18, 12, 6]} />
              <meshBasicMaterial color="#e0f7ff" toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ---------------- crystal core + golden beam ----------------
function Core() {
  const helix = useRef<THREE.Group>(null!);
  const crystal = useRef<THREE.Mesh>(null!);
  const beam = useRef<THREE.MeshBasicMaterial>(null!);
  const coils = useMemo(() => [PINK, '#ff7a3d', '#c45cff'].map((c, k) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 220; i++) {
      const t = i / 220;
      const a = t * Math.PI * 14 + (k * Math.PI * 2) / 3;
      const r = 2.2 + Math.sin(t * Math.PI) * 3.5;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 6 + t * 26, Math.sin(a) * r));
    }
    return { geo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.06, 5, false), c };
  }), []);
  useFrame(({ clock }, dt) => {
    helix.current.rotation.y += dt * 0.6;
    crystal.current.rotation.y += dt * 0.3;
    beam.current.opacity = 0.75 + Math.sin(clock.elapsedTime * 6) * 0.1;
  });
  return (
    <group>
      {/* pedestal */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[PYLON_R, PYLON_R + 0.2, 0.7, 32]} />
        <meshStandardMaterial color="#e8e4f6" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PYLON_R - 0.05, 0.22, 12, 48]} />
        <meshStandardMaterial color="#b3261e" roughness={0.35} metalness={0.3} />
      </mesh>
      {/* faceted crystal dome */}
      <mesh ref={crystal} position={[0, 1.3, 0]}>
        <icosahedronGeometry args={[1.75, 1]} />
        <meshStandardMaterial color="#9ef0ff" emissive="#2ec5e8" emissiveIntensity={0.55} transparent opacity={0.85} roughness={0.1} metalness={0.2} flatShading />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <icosahedronGeometry args={[1.78, 1]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.35} />
      </mesh>
      {/* golden beam (up into the sky and down through the station) */}
      <mesh position={[0, 30, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 60, 16, 1, true]} />
        <meshBasicMaterial ref={beam} color={GOLD} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 30, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 60, 16, 1, true]} />
        <meshBasicMaterial color="#ff9d2e" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, -25, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 40, 12, 1, true]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* neon coils spiralling around the beam */}
      <group ref={helix}>
        {coils.map((c, i) => (
          <mesh key={i} geometry={c.geo}>
            <meshBasicMaterial color={c.c} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ---------------- loop tracks + giant rings ----------------
function Tracks() {
  const tracks = useMemo(() => {
    const out: { geo: THREE.TubeGeometry; edge: THREE.TubeGeometry }[] = [];
    const defs = [
      { r: 30, y: -2, wob: 7, freq: 3, tilt: 0.25 },
      { r: 42, y: 6, wob: 9, freq: 2, tilt: -0.35 },
      { r: 26, y: -14, wob: 5, freq: 4, tilt: 0.1 },
    ];
    for (const d of defs) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const rr = d.r + Math.sin(a * d.freq) * 4;
        pts.push(new THREE.Vector3(Math.cos(a) * rr, d.y + Math.sin(a * d.freq + 1) * d.wob + Math.cos(a) * d.r * d.tilt, Math.sin(a) * rr));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      out.push({ geo: new THREE.TubeGeometry(curve, 256, 0.9, 6, true), edge: new THREE.TubeGeometry(curve, 256, 0.95, 6, true) });
    }
    return out;
  }, []);
  return (
    <group>
      {tracks.map((t, i) => (
        <group key={i} scale={[1, 0.35, 1]}>
          <mesh geometry={t.geo}><meshStandardMaterial color="#e3dff3" roughness={0.5} /></mesh>
          <mesh geometry={t.edge} scale={[1, 1.15, 1]}><meshStandardMaterial color={i % 2 ? ORANGE : BLUE} emissive={i % 2 ? ORANGE : BLUE} emissiveIntensity={0.5} side={THREE.BackSide} /></mesh>
        </group>
      ))}
      {/* giant segmented rings in the distance */}
      {[
        { p: [70, 10, -40], r: [0.2, 1.1, 0.3], s: 22 },
        { p: [-80, -5, 30], r: [1.3, 0.4, 0], s: 28 },
        { p: [20, 25, 95], r: [0.1, 0.2, 0.9], s: 18 },
      ].map((g, i) => (
        <group key={i} position={g.p as [number, number, number]} rotation={g.r as [number, number, number]}>
          <mesh>
            <torusGeometry args={[g.s, 1.4, 6, 48]} />
            <meshStandardMaterial color="#5a62b8" metalness={0.6} roughness={0.4} flatShading />
          </mesh>
          <mesh>
            <torusGeometry args={[g.s, 0.35, 6, 64]} />
            <meshBasicMaterial color={i === 1 ? PINK : '#5fd0ff'} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------- floating islands ----------------
export type IslandDef = { p: [number, number, number]; s: number; crystals?: boolean; mushrooms?: boolean; tree?: boolean; waterfall?: boolean };

export function Mushroom({ x, z, s, color }: { x: number; z: number; s: number; color: string }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.12, 0.18, 1.2, 8]} /><meshStandardMaterial color="#bdf3ff" emissive="#7fe0ff" emissiveIntensity={0.6} /></mesh>
      <mesh position={[0, 1.2, 0]}><sphereGeometry args={[0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} /></mesh>
      <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.8, 16]} /><meshBasicMaterial color="#d6f6ff" toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

export function Island({ d, rock, grass }: { d: IslandDef; rock: THREE.Material; grass: THREE.Material }) {
  const ref = useRef<THREE.Group>(null!);
  const water = useMemo(() => (d.waterfall ? waterTexture().clone() : null), [d.waterfall]);
  if (water) { water.needsUpdate = true; water.repeat.set(1, 3); }
  const seed = d.p[0] * 13 + d.p[2] * 7;
  useFrame(({ clock }, dt) => {
    ref.current.position.y = d.p[1] + Math.sin(clock.elapsedTime * 0.5 + seed) * 0.6;
    if (water) water.offset.y += dt * 1.2;
  });
  return (
    <group ref={ref} position={d.p} scale={d.s}>
      <mesh position={[0, -2.2, 0]} rotation={[Math.PI, seed, 0]} material={rock}><coneGeometry args={[2.6, 4.6, 7, 2]} /></mesh>
      <mesh position={[0, -0.25, 0]} material={rock}><cylinderGeometry args={[2.7, 2.6, 0.6, 7]} /></mesh>
      <mesh position={[0, 0.12, 0]} material={grass}><cylinderGeometry args={[2.75, 2.75, 0.25, 7]} /></mesh>
      {d.crystals && [0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.7) * 1.3, 0.8 + (i % 2) * 0.3, Math.sin(i * 1.7) * 1.3]} rotation={[0.3 * i, i, 0.4 - i * 0.2]} scale={[0.35, 1 + (i % 3) * 0.4, 0.35]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#ff8ad8" emissive="#ff4fb8" emissiveIntensity={0.9} roughness={0.15} flatShading />
        </mesh>
      ))}
      {d.mushrooms && <>
        <Mushroom x={-0.8} z={0.6} s={1.2} color="#4f7dff" />
        <Mushroom x={1.0} z={-0.4} s={0.8} color="#6a5cff" />
      </>}
      {d.tree && (
        <group position={[0.4, 0, 0.3]}>
          <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.07, 0.1, 2.4, 6]} /><meshStandardMaterial color="#5ac8ff" emissive="#2b8fd6" emissiveIntensity={0.4} /></mesh>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <mesh key={i} position={[0, 2.4, 0]} rotation={[0.9, (i / 7) * Math.PI * 2, 0]}>
              <coneGeometry args={[0.12, 1.3, 4]} />
              <meshStandardMaterial color="#7cc4ff" emissive="#3d7dff" emissiveIntensity={0.9} />
            </mesh>
          ))}
        </group>
      )}
      {water && (
        <mesh position={[1.6, -3.5, 1.6]} rotation={[0, -Math.PI / 4, 0]}>
          <planeGeometry args={[0.9, 8]} />
          <meshBasicMaterial map={water} transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function Islands({ count }: { count: number }) {
  const rock = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7a5a8a', roughness: 0.9, flatShading: true }), []);
  const rock2 = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8b5a3c', roughness: 0.9, flatShading: true }), []);
  const grass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5fbf4a', roughness: 0.8, flatShading: true }), []);
  const grass2 = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8c3a2a', roughness: 0.85, flatShading: true }), []);
  const defs: IslandDef[] = [
    // under the station (connected by the glowing pillars)
    { p: [10, -16, 8], s: 1.6, mushrooms: true },
    { p: [-11, -17, 6], s: 1.4, tree: true },
    { p: [2, -18, -12], s: 1.7, crystals: true },
    // around the arena
    { p: [32, -4, 14], s: 1.8, crystals: true, waterfall: true },
    { p: [-30, 2, -18], s: 1.5, mushrooms: true, tree: true },
    { p: [-26, -6, 26], s: 1.2, crystals: true },
    { p: [22, 8, -34], s: 1.4, tree: true },
    { p: [48, 14, -10], s: 2.2, mushrooms: true, crystals: true },
    { p: [-50, -10, -4], s: 2.4, crystals: true, waterfall: true },
    { p: [6, -8, 46], s: 1.9, mushrooms: true },
    { p: [-18, 18, -55], s: 2.6, crystals: true, tree: true },
    { p: [60, -18, 40], s: 3, mushrooms: true },
  ];
  return (
    <group>
      {defs.slice(0, count).map((d, i) => (
        <Island key={i} d={d} rock={i % 3 === 0 ? rock2 : rock} grass={i % 4 === 3 ? grass2 : grass} />
      ))}
    </group>
  );
}

function HoverDiscs() {
  const g = useRef<THREE.Group>(null!);
  const discs = useMemo(() => [
    { r: 24, y: 3, a: 0.4 }, { r: 27, y: -1, a: 2.2 }, { r: 23, y: 5, a: 4.1 }, { r: 35, y: 9, a: 5.3 },
  ], []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    g.current.children.forEach((c, i) => {
      const d = discs[i];
      const a = d.a + t * 0.05;
      c.position.set(Math.cos(a) * d.r, d.y + Math.sin(t + i) * 0.8, Math.sin(a) * d.r);
      c.rotation.z = Math.sin(t * 0.7 + i) * 0.15;
    });
  });
  return (
    <group ref={g}>
      {discs.map((_, i) => (
        <group key={i}>
          <mesh><cylinderGeometry args={[3, 3, 0.25, 32]} /><meshStandardMaterial color="#b3261e" roughness={0.4} metalness={0.3} /></mesh>
          <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.6, 0.08, 6, 40]} /><meshBasicMaterial color={ORANGE} toneMapped={false} /></mesh>
        </group>
      ))}
    </group>
  );
}

export function Asteroids({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const data = useMemo(() => Array.from({ length: count }, (_, i) => ({
    r: 55 + (i * 37) % 70, y: -30 + ((i * 53) % 70), a: i * 2.4, s: 0.6 + ((i * 7) % 10) / 6, sp: 0.01 + ((i * 3) % 5) / 400,
  })), [count]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      const a = d.a + t * d.sp;
      q.setFromEuler(new THREE.Euler(t * 0.2 + i, t * 0.3, 0));
      m.compose(new THREE.Vector3(Math.cos(a) * d.r, d.y, Math.sin(a) * d.r), q, new THREE.Vector3(d.s, d.s, d.s));
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#6b5f86" roughness={0.9} flatShading />
    </instancedMesh>
  );
}

function StationEnvironment({ quality }: { quality: Quality }) {
  const q = quality === 'high' ? 1 : quality === 'medium' ? 0.7 : 0.4;
  return (
    <>
      <NebulaSky />
      <fogExp2 attach="fog" args={['#2a1f5c', 0.0045]} />
      <ambientLight intensity={0.55} color="#c9c0ff" />
      <hemisphereLight args={['#b9a8ff', '#3b1a5c', 0.7]} />
      <directionalLight position={[-20, 35, -30]} intensity={1.3} color="#dfe8ff" />
      <pointLight position={[0, 4, 0]} intensity={30} distance={22} color={GOLD} />
      {quality !== 'low' && <pointLight position={[0, -8, 0]} intensity={60} distance={30} color={PINK} />}
      <Stars radius={260} depth={60} count={Math.round(2500 * q)} factor={5} fade speed={0.4} />
      <Moon />
      <Deck />
      <Core />
      <Tracks />
      <Islands count={quality === 'low' ? 7 : 12} />
      <HoverDiscs />
      <Asteroids count={Math.round(40 * q)} />
      <Sparkles count={Math.round(90 * q)} scale={[ARENA_R * 2.4, 10, ARENA_R * 2.4]} position={[0, 5, 0]} size={3} speed={0.35} color="#ffd8a8" />
      <Sparkles count={Math.round(60 * q)} scale={[60, 30, 60]} position={[0, -6, 0]} size={4} speed={0.2} color="#9fdcff" />
    </>
  );
}

export function ArenaEnvironment({ quality, map = 'station' }: { quality: Quality; map?: MapId }) {
  if (map === 'grove') return <GroveEnvironment quality={quality} />;
  if (map === 'harbor') return <HarborEnvironment quality={quality} />;
  return <StationEnvironment quality={quality} />;
}
