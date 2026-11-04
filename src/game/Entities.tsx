// Renderers for everything the simulation moves. They read `world` every frame (no React re-renders).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { world, COIN_COLOR, BOOST_COLOR, LASER_INNER, LASER_OUTER, type PlayerAnim, type BoostType } from './world';
import { CharacterModel } from './CharacterModel';
import { charById, resolvePalette, type CharacterId } from '../data/characters';
import { ringTexture } from './textures';

const glow = (c: string, i = 2.5) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, toneMapped: false, metalness: 0.3, roughness: 0.3 });

// ---------------- coins ----------------
const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 28);
const coinRim = new THREE.TorusGeometry(0.42, 0.05, 8, 28);
const coinMark = new THREE.BoxGeometry(0.14, 0.42, 0.12);
const crystalGeo = new THREE.OctahedronGeometry(0.5, 0);
const haloGeo = new THREE.PlaneGeometry(1.8, 1.8);

function haloTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function Coins() {
  const mats = useMemo(() => {
    const tex = haloTex();
    return {
      normal: { body: new THREE.MeshStandardMaterial({ color: '#0f3d26', metalness: 1, roughness: 0.25, emissive: COIN_COLOR.normal, emissiveIntensity: 0.6 }), glow: glow(COIN_COLOR.normal, 3) },
      rare: { body: new THREE.MeshStandardMaterial({ color: '#2e1150', metalness: 1, roughness: 0.25, emissive: COIN_COLOR.rare, emissiveIntensity: 0.8 }), glow: glow(COIN_COLOR.rare, 3.2) },
      crystal: { body: glow(COIN_COLOR.crystal, 2.5), glow: glow('#ffffff', 3) },
      halo: Object.fromEntries((['normal', 'rare', 'crystal'] as const).map((k) => [k, new THREE.MeshBasicMaterial({ map: tex, color: COIN_COLOR[k], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })])) as Record<string, THREE.MeshBasicMaterial>,
    };
  }, []);
  const refs = useRef<THREE.Group[]>([]);
  const slots = world.coins.length || 22;

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    world.coins.forEach((c, i) => {
      const g = refs.current[i];
      if (!g) return;
      const showing = c.active || c.pop >= 0;
      g.visible = showing;
      if (!showing) return;
      const kids = g.children;
      kids[0].visible = c.type === 'normal';
      kids[1].visible = c.type === 'rare';
      kids[2].visible = c.type === 'crystal';
      const halo = kids[3] as THREE.Mesh;
      halo.material = mats.halo[c.type];
      halo.quaternion.copy(camera.quaternion);
      if (c.active) {
        const spawn = Math.min(1, c.age * 3);
        let s = spawn * (c.type === 'normal' ? 1 : 1.2);
        if (c.type === 'crystal' && c.ttl - c.age < 2.5 && Math.floor(t * 8) % 2 === 0) s *= 0.6;
        g.position.set(c.x, 1 + Math.sin(t * 2.5 + i) * 0.18, c.z);
        g.scale.setScalar(s);
        g.rotation.y = t * 2.4 + i;
      } else {
        const p = c.pop;
        g.position.set(c.px, 1 + p * 4, c.pz);
        g.scale.setScalar(p < 0.12 ? 1 + p * 6 : Math.max(0, (0.45 - p) / 0.33) * 1.7);
        g.rotation.y += 0.5;
      }
    });
  });

  return (
    <group>
      {Array.from({ length: slots }, (_, i) => (
        <group key={i} ref={(el) => { if (el) refs.current[i] = el; }} visible={false}>
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={coinGeo} material={mats.normal.body} />
            <mesh geometry={coinRim} material={mats.normal.glow} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={coinMark} material={mats.normal.glow} />
          </group>
          <group rotation={[Math.PI / 2, 0, 0]} scale={1.15}>
            <mesh geometry={coinGeo} material={mats.rare.body} />
            <mesh geometry={coinRim} material={mats.rare.glow} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={coinMark} material={mats.rare.glow} rotation={[0, 0, Math.PI / 4]} />
            <mesh geometry={coinMark} material={mats.rare.glow} rotation={[0, 0, -Math.PI / 4]} />
          </group>
          <group>
            <mesh geometry={crystalGeo} material={mats.crystal.body} scale={[0.7, 1.2, 0.7]} />
            <mesh geometry={crystalGeo} material={mats.crystal.glow} scale={[0.25, 0.5, 0.25]} />
          </group>
          <mesh geometry={haloGeo} material={mats.halo.normal} />
        </group>
      ))}
    </group>
  );
}

// ---------------- boosters ----------------
function BoostIcon({ type }: { type: BoostType }) {
  const m = useMemo(() => glow('#ffffff', 2), []);
  if (type === 'speed') return <mesh material={m} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.22, 0.45, 3]} /></mesh>;
  if (type === 'shield') return <mesh material={m}><torusGeometry args={[0.2, 0.06, 6, 16]} /></mesh>;
  if (type === 'magnet') return <mesh material={m} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.2, 0.07, 6, 16, Math.PI]} /></mesh>;
  return (
    <group>
      <mesh material={m}><boxGeometry args={[0.42, 0.12, 0.12]} /></mesh>
      <mesh material={m}><boxGeometry args={[0.12, 0.42, 0.12]} /></mesh>
    </group>
  );
}

export function Boosters() {
  const refs = useRef<THREE.Group[]>([]);
  const types: BoostType[] = ['speed', 'shield', 'magnet', 'heal'];
  const shells = useMemo(() => Object.fromEntries(types.map((t) => [t, new THREE.MeshStandardMaterial({ color: BOOST_COLOR[t], emissive: BOOST_COLOR[t], emissiveIntensity: 0.8, transparent: true, opacity: 0.55, metalness: 0.2, roughness: 0.1 })])), []);
  const beams = useMemo(() => Object.fromEntries(types.map((t) => [t, new THREE.MeshBasicMaterial({ color: BOOST_COLOR[t], transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending })])), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    world.boosters.forEach((b, i) => {
      const g = refs.current[i];
      if (!g) return;
      const show = b.active || b.pop >= 0;
      g.visible = show;
      if (!show) return;
      types.forEach((ty, k) => { g.children[k].visible = ty === b.type; });
      if (b.active) {
        g.position.set(b.x, 1.1 + Math.sin(t * 3) * 0.15, b.z);
        g.scale.setScalar(Math.min(1, b.age * 3) * (b.age > 11 && Math.floor(t * 8) % 2 ? 0.7 : 1));
      } else {
        g.position.set(b.px, 1.1 + b.pop * 3, b.pz);
        g.scale.setScalar(Math.max(0, 1 - b.pop * 2.2) * 1.5);
      }
      g.rotation.y = t * 1.5;
    });
  });
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => { if (el) refs.current[i] = el; }} visible={false}>
          {types.map((ty) => (
            <group key={ty}>
              <mesh material={shells[ty]}><capsuleGeometry args={[0.38, 0.35, 4, 12]} /></mesh>
              <BoostIcon type={ty} />
              <mesh material={beams[ty]} position={[0, 2.5, 0]}><cylinderGeometry args={[0.25, 0.5, 5, 12, 1, true]} /></mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// ---------------- hazards ----------------
export function Lasers() {
  const refs = useRef<THREE.Group[]>([]);
  const L = LASER_OUTER - LASER_INNER;
  const core = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe4f1', toneMapped: false }), []);
  const outer = useMemo(() => world.lasers.map(() => new THREE.MeshBasicMaterial({ color: '#ff2e7e', transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })), []);
  const emitter = useMemo(() => glow('#ff2e7e', 3), []);
  useFrame(({ clock }) => {
    world.lasers.forEach((l, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.rotation.y = -l.angle;
      g.visible = l.on > 0.01;
      const flick = l.on < 1 ? (Math.floor(clock.elapsedTime * 12) % 2 ? 0.1 : 0.35) : 0.45 + Math.sin(clock.elapsedTime * 30) * 0.08;
      outer[i].opacity = flick;
      g.children[0].visible = l.on >= 1;
    });
  });
  return (
    <group>
      {world.lasers.map((_, i) => (
        <group key={i} ref={(el) => { if (el) refs.current[i] = el; }}>
          <mesh material={core} position={[LASER_INNER + L / 2, 0.65, 0]}><boxGeometry args={[L, 0.07, 0.07]} /></mesh>
          <mesh material={outer[i]} position={[LASER_INNER + L / 2, 0.65, 0]}><boxGeometry args={[L, 0.32, 0.32]} /></mesh>
          <mesh material={emitter} position={[LASER_OUTER + 0.2, 0.65, 0]}><sphereGeometry args={[0.28, 12, 8]} /></mesh>
          <mesh material={emitter} position={[LASER_OUTER + 0.2, 0.3, 0]}><cylinderGeometry args={[0.1, 0.25, 0.6, 8]} /></mesh>
        </group>
      ))}
    </group>
  );
}

export function Walls() {
  const refs = useRef<THREE.Group[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#39ff88', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), []);
  const post = useMemo(() => glow('#39ff88', 2.5), []);
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b1530', metalness: 0.9, roughness: 0.3 }), []);
  useFrame(({ clock }) => {
    mat.opacity = 0.28 + Math.sin(clock.elapsedTime * 10) * 0.08;
    world.walls.forEach((w, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.set(w.x, 0, w.z);
      g.rotation.y = -(w.angle + Math.PI / 2);
    });
  });
  return (
    <group>
      {world.walls.map((w, i) => (
        <group key={i} ref={(el) => { if (el) refs.current[i] = el; }}>
          <mesh material={mat} position={[0, 0.9, 0]}><boxGeometry args={[w.half * 2, 1.5, 0.12]} /></mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * w.half, 0, 0]}>
              <mesh material={frame} position={[0, 0.9, 0]}><boxGeometry args={[0.3, 1.9, 0.3]} /></mesh>
              <mesh material={post} position={[0, 1.9, 0]}><sphereGeometry args={[0.16, 8, 6]} /></mesh>
            </group>
          ))}
          <mesh material={post} position={[0, 1.65, 0]}><boxGeometry args={[w.half * 2, 0.05, 0.05]} /></mesh>
          <mesh material={post} position={[0, 0.15, 0]}><boxGeometry args={[w.half * 2, 0.05, 0.05]} /></mesh>
        </group>
      ))}
    </group>
  );
}

export function Traps() {
  const mats = useMemo(() => world.traps.map(() => new THREE.MeshBasicMaterial({ map: ringTexture('#22d3ee'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#334155', toneMapped: false })), []);
  const arcs = useRef<THREE.Group[]>([]);
  const arcMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#a5f3fc', toneMapped: false }), []);
  const base = useMemo(() => new THREE.MeshStandardMaterial({ color: '#141022', metalness: 0.9, roughness: 0.35 }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    world.traps.forEach((tr, i) => {
      const m = mats[i];
      if (tr.state === 'off') { m.color.set('#3b3355'); m.opacity = 0.6; }
      else if (tr.state === 'warn') { m.color.set('#fbbf24'); m.opacity = Math.floor(t * 10) % 2 ? 1 : 0.35; }
      else { m.color.set('#22d3ee'); m.opacity = 0.8 + Math.random() * 0.2; }
      const a = arcs.current[i];
      if (a) {
        a.visible = tr.state === 'on';
        if (a.visible) a.children.forEach((c) => { c.rotation.y = Math.random() * Math.PI; c.scale.y = 0.4 + Math.random() * 0.8; c.position.y = Math.random() * 0.4; });
      }
    });
  });
  return (
    <group>
      {world.traps.map((tr, i) => (
        <group key={i} position={[tr.x, 0, tr.z]}>
          <mesh material={base} position={[0, 0.02, 0]}><cylinderGeometry args={[tr.r + 0.15, tr.r + 0.25, 0.08, 24]} /></mesh>
          <mesh material={mats[i]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}><planeGeometry args={[tr.r * 2.2, tr.r * 2.2]} /></mesh>
          <group ref={(el) => { if (el) arcs.current[i] = el; }}>
            {[0, 1, 2, 3].map((k) => (
              <mesh key={k} material={arcMat}><boxGeometry args={[tr.r * 1.8, 0.03, 0.03]} /></mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

export function Hammers() {
  const refs = useRef<THREE.Group[]>([]);
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2342', metalness: 0.95, roughness: 0.25 }), []);
  const hot = useMemo(() => glow('#f97316', 2.5), []);
  useFrame(() => {
    world.hammers.forEach((h, i) => {
      const g = refs.current[i];
      if (g) g.rotation.y = -h.angle;
    });
  });
  return (
    <group>
      {world.hammers.map((h, i) => (
        <group key={i} position={[h.x, 0, h.z]}>
          <mesh material={metal} position={[0, 0.8, 0]}><cylinderGeometry args={[0.5, 0.75, 1.6, 8]} /></mesh>
          <mesh material={hot} position={[0, 1.62, 0]}><cylinderGeometry args={[0.35, 0.35, 0.08, 16]} /></mesh>
          <group ref={(el) => { if (el) refs.current[i] = el; }} position={[0, 0.75, 0]}>
            {[0, Math.PI].map((s) => (
              <group key={s} rotation={[0, s, 0]}>
                <mesh material={metal} position={[h.len / 2, 0, 0]}><boxGeometry args={[h.len, 0.22, 0.28]} /></mesh>
                <mesh material={hot} position={[h.len / 2, 0.12, 0]}><boxGeometry args={[h.len * 0.8, 0.03, 0.3]} /></mesh>
                <mesh material={metal} position={[h.len, 0, 0]}><cylinderGeometry args={[0.45, 0.45, 0.9, 10]} /></mesh>
                <mesh material={hot} position={[h.len, 0, 0]}><cylinderGeometry args={[0.47, 0.47, 0.12, 10]} /></mesh>
              </group>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

export function Zones() {
  const refs = useRef<THREE.Group[]>([]);
  const ringMats = useMemo(() => world.zones.map(() => new THREE.MeshBasicMaterial({ map: ringTexture('#ff3b3b'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })), []);
  const fillMats = useMemo(() => world.zones.map(() => new THREE.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false })), []);
  const blastMats = useMemo(() => world.zones.map(() => new THREE.MeshBasicMaterial({ color: '#ffb4b4', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })), []);
  useFrame(({ clock }) => {
    world.zones.forEach((z, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.visible = z.active;
      if (!z.active) return;
      g.position.set(z.x, 0.1, z.z);
      const k = Math.min(1, z.t / z.fuse);
      const [ring, fill, blast] = g.children as THREE.Mesh[];
      ring.scale.setScalar(z.r * 2.2);
      ringMats[i].opacity = z.exploded ? 0 : Math.floor(clock.elapsedTime * (6 + k * 14)) % 2 ? 1 : 0.5;
      fill.scale.setScalar(z.r * 2 * k);
      fillMats[i].opacity = z.exploded ? 0 : 0.18 + k * 0.25;
      blast.visible = z.exploded;
      if (z.exploded) {
        const e = (z.t - z.fuse) / 0.6;
        blast.scale.set(z.r * (1 + e * 0.6), 2.5 * (1 - e) + 0.1, z.r * (1 + e * 0.6));
        blastMats[i].opacity = 0.8 * (1 - e);
      }
    });
  });
  return (
    <group>
      {world.zones.map((_, i) => (
        <group key={i} ref={(el) => { if (el) refs.current[i] = el; }} visible={false}>
          <mesh material={ringMats[i]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1, 1]} /></mesh>
          <mesh material={fillMats[i]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><circleGeometry args={[0.5, 32]} /></mesh>
          <mesh material={blastMats[i]} position={[0, 0.5, 0]}><cylinderGeometry args={[1, 1, 1, 24, 1, true]} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------- opponents ----------------
function Bot({ index }: { index: number }) {
  const g = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.MeshBasicMaterial>(null!);
  const bot = world.bots[index];
  const anim = useRef<PlayerAnim>({ speed: 0, dash: false, hurt: 0, collect: 0, mode: 'play', modeT: 0, invuln: 0, air: 0 });
  const def = charById(bot.character);
  useFrame(({ clock }) => {
    const b = world.bots[index];
    if (!b) return;
    g.current.position.set(b.x, 0, b.z);
    let diff = b.yaw - g.current.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    g.current.rotation.y += diff * 0.2;
    anim.current.speed = Math.hypot(b.vx, b.vz);
    anim.current.dash = b.rushT > 0;
    anim.current.hurt = b.hurt;
    const rushing = b.rushT > 0;
    ring.current.color.set(rushing ? '#ff3b3b' : def.palette.accent);
    ring.current.opacity = rushing ? (Math.floor(clock.elapsedTime * 10) % 2 ? 0.9 : 0.4) : 0.45;
  });
  return (
    <group ref={g}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.55, 0.7, 24]} />
        <meshBasicMaterial ref={ring} transparent toneMapped={false} />
      </mesh>
      <CharacterModel variant={bot.character} palette={def.palette} anim={anim} scale={0.95} />
    </group>
  );
}

export function Opponents() {
  return <group>{world.bots.map((_, i) => <Bot key={i} index={i} />)}</group>;
}

// ---------------- player ----------------
export function PlayerAvatar({ character, skin, trail }: { character: CharacterId; skin: string; trail: string }) {
  const g = useRef<THREE.Group>(null!);
  const shield = useRef<THREE.Mesh>(null!);
  const magnet = useRef<THREE.Mesh>(null!);
  const speed = useRef<THREE.Mesh>(null!);
  const marker = useRef<THREE.Mesh>(null!);
  const body = useRef<THREE.Group>(null!);
  const anim = useMemo(() => ({ current: world.player.anim }), []);
  const palette = resolvePalette(charById(character), skin);
  useFrame(({ clock }) => {
    const p = world.player;
    const t = clock.elapsedTime;
    g.current.position.set(p.x, 0, p.z);
    body.current.position.y = p.y;
    g.current.rotation.y = p.yaw;
    // ground shadow shrinks as the player rises
    marker.current.scale.setScalar(Math.max(0.45, 1 - p.y * 0.3));
    shield.current.visible = p.shieldT > 0;
    shield.current.rotation.y = t;
    shield.current.scale.setScalar(1 + Math.sin(t * 6) * 0.03);
    magnet.current.visible = p.magnetT > 0;
    magnet.current.rotation.z = t * 3;
    magnet.current.scale.setScalar(5.5 + Math.sin(t * 4) * 0.3);
    speed.current.visible = p.speedT > 0 || p.dashT > 0;
    marker.current.rotation.z = -t * 1.5;
  });
  return (
    <group ref={g}>
      <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.62, 0.78, 6]} />
        <meshBasicMaterial color={trail} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <group ref={body}>
      <CharacterModel variant={character} palette={palette} anim={anim} />
      <mesh ref={shield} position={[0, 1.1, 0]} visible={false}>
        <icosahedronGeometry args={[1.25, 1]} />
        <meshBasicMaterial color={BOOST_COLOR.shield} wireframe transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <mesh ref={magnet} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} visible={false}>
        <ringGeometry args={[0.96, 1, 48]} />
        <meshBasicMaterial color={BOOST_COLOR.magnet} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <mesh ref={speed} position={[0, 1, -0.6]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <coneGeometry args={[0.55, 1.6, 12, 1, true]} />
        <meshBasicMaterial color={trail} transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      </group>
    </group>
  );
}
