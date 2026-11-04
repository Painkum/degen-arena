// Cosmic Harbor: docking platform on a sea of liquid galaxy, between starships, ring gates and hologram pods.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ARENA_R, PYLON_R } from '../world';
import { harborTexture } from '../textures';
import { NebulaSky, Asteroids, type SkyColors } from '../Arena';
import type { Quality } from '../../store/playerStore';

const SKY: SkyColors = {
  base1: [0.03, 0.02, 0.06], base2: [0.0, 0.0, 0.02],
  c1: [0.3, 0.08, 0.4], c2: [0.6, 0.15, 0.5], c3: [0.1, 0.2, 0.45], haze: [0.25, 0.08, 0.3],
};
const TEAL = '#5fb3a8';
const PINK = '#e05ca8';
const BEIGE = '#e7d8b8';
const CYAN = '#22d3ee';

/** Animated swirling galaxy liquid under the platform. */
function GalaxySea() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 } },
    transparent: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float t; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.1; a*=0.5; } return v; }
      void main(){
        vec2 p = (vUv - 0.5) * 18.0;
        float w = fbm(p + vec2(fbm(p + t*0.15), fbm(p - t*0.12)) * 2.0);
        vec3 col = mix(vec3(0.18,0.02,0.25), vec3(0.75,0.15,0.75), smoothstep(0.35, 0.8, w));
        col = mix(col, vec3(0.35,0.1,0.85), smoothstep(0.6, 0.95, fbm(p*0.6 + t*0.05)) * 0.6);
        // glints
        float g = step(0.985, h(floor((vUv + vec2(t*0.004, 0.0)) * 900.0))) * (0.5 + 0.5 * sin(t*6.0 + vUv.x*400.0));
        col += g * vec3(1.0);
        float edge = smoothstep(0.5, 0.35, length(vUv - 0.5));
        gl_FragColor = vec4(col * (0.35 + edge * 0.85), 1.0);
      }`,
  }), []);
  useFrame((_, dt) => { mat.uniforms.t.value += dt; });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]} material={mat}>
      <planeGeometry args={[320, 320]} />
    </mesh>
  );
}

function Dock() {
  const tex = harborTexture();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[ARENA_R + 0.4, 96]} />
        <meshStandardMaterial map={tex} roughness={0.5} metalness={0.4} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {/* base sits 5cm under the deck so the two surfaces never overlap */}
      <mesh position={[0, -0.66, 0]}>
        <cylinderGeometry args={[ARENA_R + 0.6, ARENA_R + 1.2, 1.2, 64]} />
        <meshStandardMaterial color={BEIGE} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ARENA_R + 0.5, 0.18, 8, 96]} />
        <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* glowing ring of light on the sea around the dock */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]} renderOrder={1}>
        <ringGeometry args={[ARENA_R + 1.2, ARENA_R + 3.5, 64]} />
        <meshBasicMaterial color={PINK} transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  );
}

function Reactor() {
  const orb = useRef<THREE.Mesh>(null!);
  const rings = useRef<THREE.Group>(null!);
  useFrame(({ clock }, dt) => {
    orb.current.rotation.y += dt * 0.8;
    orb.current.position.y = 2 + Math.sin(clock.elapsedTime * 1.6) * 0.2;
    rings.current.rotation.y -= dt * 0.5;
  });
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[PYLON_R, PYLON_R + 0.2, 0.6, 24]} />
        <meshStandardMaterial color={BEIGE} roughness={0.5} />
      </mesh>
      {/* glass hologram cylinder */}
      <mesh position={[0, 2.1, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 3, 24, 1, true]} />
        <meshStandardMaterial color="#9ff5ff" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} emissive={CYAN} emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={orb} position={[0, 2, 0]}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial color="#8b6bff" emissive="#7c3aed" emissiveIntensity={1.6} flatShading toneMapped={false} />
      </mesh>
      <group ref={rings} position={[0, 2, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[Math.PI / 2 + i * 0.5, i * 0.8, 0]}>
            <torusGeometry args={[1.25, 0.03, 6, 48]} />
            <meshBasicMaterial color={i === 1 ? PINK : CYAN} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 3.65, 0]}>
        <cylinderGeometry args={[1.7, 1.7, 0.25, 24]} />
        <meshStandardMaterial color={BEIGE} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Glass hologram pods sitting on round pads around the dock. */
function HoloPods() {
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    mats.current.forEach((m, i) => { if (m) m.opacity = 0.18 + Math.sin(clock.elapsedTime * 2 + i) * 0.06; });
  });
  return (
    <group>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.15;
        const r = ARENA_R + 4.5 + (i % 2) * 3;
        return (
          <group key={i} position={[Math.cos(a) * r, -1.2, Math.sin(a) * r]}>
            <mesh><cylinderGeometry args={[1.6, 1.8, 0.5, 24]} /><meshStandardMaterial color={BEIGE} roughness={0.5} /></mesh>
            <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.9, 1.2, 32]} /><meshBasicMaterial color={CYAN} toneMapped={false} /></mesh>
            <mesh position={[0, 1.6, 0]}>
              <boxGeometry args={[2, 2.6, 2]} />
              <meshStandardMaterial ref={(m) => { if (m) mats.current[i] = m; }} color="#9ff5ff" transparent opacity={0.2} depthWrite={false} emissive={CYAN} emissiveIntensity={0.25} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Chunky low-poly starship hull built from panels. */
function Starship({ position, rotation, length }: { position: [number, number, number]; rotation: number; length: number }) {
  const segs = Math.round(length / 5);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: segs }, (_, i) => (
        <group key={i} position={[0, 0, i * 5 - length / 2]}>
          <mesh><boxGeometry args={[9, 6, 4.6]} /><meshStandardMaterial color={TEAL} roughness={0.6} flatShading /></mesh>
          <mesh position={[0, 3.2, 0]}><boxGeometry args={[7, 0.8, 4.4]} /><meshStandardMaterial color={BEIGE} roughness={0.6} /></mesh>
          <mesh position={[4.6, 0.5, 0]}><boxGeometry args={[0.3, 1, 3.8]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} /></mesh>
          <mesh position={[4.6, -1.5, 0]}><boxGeometry args={[0.3, 0.4, 3.8]} /><meshBasicMaterial color={i % 2 ? PINK : CYAN} toneMapped={false} /></mesh>
          {i % 2 === 0 && (
            <mesh position={[5, 2, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.6, 0.8, 1.6, 10]} />
              <meshStandardMaterial color="#3b4d5c" roughness={0.4} metalness={0.5} />
            </mesh>
          )}
        </group>
      ))}
      <mesh position={[0, 0, -length / 2 - 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[4.6, 6, 6]} />
        <meshStandardMaterial color={TEAL} roughness={0.6} flatShading />
      </mesh>
    </group>
  );
}

function RingGate({ position, rotation, size }: { position: [number, number, number]; rotation: number; size: number }) {
  const inner = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(({ clock }) => { inner.current.opacity = 0.5 + Math.sin(clock.elapsedTime * 3 + size) * 0.25; });
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh><torusGeometry args={[size, size * 0.18, 8, 40]} /><meshStandardMaterial color={PINK} roughness={0.5} flatShading /></mesh>
      <mesh><torusGeometry args={[size * 0.98, size * 0.12, 8, 40]} /><meshStandardMaterial color={BEIGE} roughness={0.6} flatShading /></mesh>
      <mesh><torusGeometry args={[size * 0.8, 0.12, 6, 48]} /><meshBasicMaterial ref={inner} color={CYAN} transparent toneMapped={false} /></mesh>
    </group>
  );
}

function RingedPlanet() {
  const g = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { g.current.rotation.y += dt * 0.02; });
  return (
    <group ref={g} position={[70, 80, -200]} rotation={[0.3, 0, 0.35]}>
      <mesh><sphereGeometry args={[26, 32, 24]} /><meshStandardMaterial color="#e8c9e0" emissive="#b05a9a" emissiveIntensity={0.25} roughness={0.8} fog={false} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[34, 52, 64]} />
        <meshBasicMaterial color="#c88ab8" side={THREE.DoubleSide} transparent opacity={0.6} fog={false} />
      </mesh>
    </group>
  );
}

export function HarborEnvironment({ quality }: { quality: Quality }) {
  const q = quality === 'high' ? 1 : quality === 'medium' ? 0.7 : 0.4;
  return (
    <>
      <NebulaSky colors={SKY} />
      <fogExp2 attach="fog" args={['#14081f', 0.006]} />
      <ambientLight intensity={0.55} color="#e9d5ff" />
      <hemisphereLight args={['#c4b5fd', '#701a75', 0.7]} />
      <directionalLight position={[20, 30, 15]} intensity={1.2} color="#fff1f8" />
      <pointLight position={[0, 4, 0]} intensity={30} distance={24} color="#8b6bff" />
      <Stars radius={260} depth={60} count={Math.round(3000 * q)} factor={5} fade speed={0.4} />
      <RingedPlanet />
      <GalaxySea />
      <Dock />
      <Reactor />
      <HoloPods />
      <Starship position={[-44, 1.5, -6]} rotation={0.15} length={60} />
      {quality !== 'low' && <Starship position={[-30, 8, -70]} rotation={1.2} length={40} />}
      <RingGate position={[42, 6, 8]} rotation={-1.2} size={10} />
      <RingGate position={[52, 9, -26]} rotation={-0.9} size={12} />
      <RingGate position={[34, 4, 40]} rotation={-1.6} size={8} />
      <Asteroids count={Math.round(30 * q)} />
      <Sparkles count={Math.round(100 * q)} scale={[ARENA_R * 2.6, 8, ARENA_R * 2.6]} position={[0, 3, 0]} size={3} speed={0.3} color="#f5d0fe" />
    </>
  );
}
