// Procedural chibi ninja / samurai characters with code-driven animations
// (idle, run, dash, jump, hurt, collect, win, lose). Faces +Z.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CharacterId, Palette } from '../data/characters';
import type { PlayerAnim } from './world';
import { blobTexture } from './textures';

export interface AnimSource { current: PlayerAnim }

const SKIN = '#f3c6a2';
const PALE = '#e9e4dc';

function useMats(p: Palette) {
  return useMemo(() => {
    const std = (color: string, rough = 0.75, metal = 0.05) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    return {
      cloth: std(p.armor, 0.8),
      cloth2: std(p.suit, 0.85),
      trim: std(p.accent, 0.5, 0.2),
      lacquer: std(p.armor, 0.3, 0.35),
      gold: std('#d9a520', 0.35, 0.8),
      skin: std(SKIN, 0.6),
      pale: std(PALE, 0.5),
      hair: std(p.hair ?? '#2b2b34', 0.6),
      dark: std('#15151c', 0.6, 0.3),
      white: std('#ffffff', 0.3),
      iris: new THREE.MeshStandardMaterial({ color: p.visor, emissive: p.visor, emissiveIntensity: 0.35, roughness: 0.2 }),
      glowEye: new THREE.MeshStandardMaterial({ color: p.visor, emissive: p.visor, emissiveIntensity: 3, toneMapped: false }),
      blade: new THREE.MeshStandardMaterial({ color: '#dfe6ee', roughness: 0.15, metalness: 1 }),
      redBlade: new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff2020', emissiveIntensity: 2.6, toneMapped: false }),
      rope: std('#d8c7a0', 0.95),
    };
  }, [p.armor, p.suit, p.accent, p.visor, p.hair]);
}

const box = new THREE.BoxGeometry(1, 1, 1);
const sphere = new THREE.SphereGeometry(1, 24, 18);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 18);
const cone = new THREE.ConeGeometry(1, 1, 14);
const torus = new THREE.TorusGeometry(1, 0.18, 8, 28);
const halfTorus = new THREE.TorusGeometry(1, 0.08, 6, 20, Math.PI);
const helmet = new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 1.8);

type V3 = [number, number, number];
function M({ g, m, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0] }: { g: THREE.BufferGeometry; m: THREE.Material; p?: V3; s?: V3 | number; r?: V3 }) {
  const sc: V3 = typeof s === 'number' ? [s, s, s] : s;
  return <mesh geometry={g} material={m} position={p} scale={sc} rotation={r} />;
}

type Mats = ReturnType<typeof useMats>;

/** Katana: handle along +y from origin, blade continues past the guard. */
function Katana({ m, sheathed, glow, len = 0.75 }: { m: Mats; sheathed?: boolean; glow?: boolean; len?: number }) {
  return (
    <group>
      <M g={cyl} m={m.dark} p={[0, 0.1, 0]} s={[0.025, 0.2, 0.025]} />
      <M g={cyl} m={m.gold} p={[0, 0.21, 0]} s={[0.06, 0.015, 0.06]} />
      {sheathed
        ? <M g={cyl} m={m.cloth2} p={[0, 0.22 + len / 2, 0]} s={[0.032, len, 0.032]} />
        : <M g={box} m={glow ? m.redBlade : m.blade} p={[0, 0.22 + len / 2, 0]} s={[0.025, len, 0.05]} />}
      {sheathed && <M g={cyl} m={m.gold} p={[0, 0.22 + len, 0]} s={[0.034, 0.03, 0.034]} />}
    </group>
  );
}

/** Big chibi eyes: white + iris + pupil + highlight. */
function Eyes({ m, glow, y = 0.02, z = 0.3, angry = true }: { m: Mats; glow?: boolean; y?: number; z?: number; angry?: boolean }) {
  return (
    <group position={[0, y, z]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.12, 0, 0]}>
          {glow ? (
            <M g={sphere} m={m.glowEye} s={[0.06, 0.05, 0.03]} />
          ) : (
            <>
              <M g={sphere} m={m.white} s={[0.075, 0.085, 0.035]} />
              <M g={sphere} m={m.iris} p={[0, -0.005, 0.02]} s={[0.05, 0.06, 0.025]} />
              <M g={sphere} m={m.dark} p={[0, -0.005, 0.035]} s={[0.025, 0.03, 0.015]} />
              <M g={sphere} m={m.white} p={[s * -0.015, 0.025, 0.045]} s={0.012} />
            </>
          )}
          {/* eyebrow */}
          <M g={box} m={m.dark} p={[0, 0.11, 0.01]} s={[0.12, 0.025, 0.03]} r={[0, 0, angry ? s * -0.35 : 0]} />
        </group>
      ))}
    </group>
  );
}

export function CharacterModel({ variant, palette, anim, scale = 1, shadow = true }: {
  variant: CharacterId; palette: Palette; anim?: AnimSource; scale?: number; shadow?: boolean;
}) {
  const m = useMats(palette);
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const lLeg = useRef<THREE.Group>(null!);
  const rLeg = useRef<THREE.Group>(null!);
  const lArm = useRef<THREE.Group>(null!);
  const rArm = useRef<THREE.Group>(null!);
  const cape = useRef<THREE.Group>(null);
  const phase = useRef(Math.random() * 10);
  const fall = useRef(0);

  const armored = variant === 'warrior' || variant === 'reaper';
  const BODY_Y = 0.5;

  useFrame((state, dt) => {
    const a = anim?.current;
    const t = state.clock.elapsedTime;
    const speed = a?.speed ?? 0;
    const run = Math.min(1, speed / 7);
    phase.current += dt * (4 + speed * 1.4);
    const ph = phase.current;
    const sw = Math.sin(ph) * 0.9 * run;

    let lean = run * 0.22;
    let bodyY = BODY_Y + Math.abs(Math.cos(ph)) * 0.07 * run + Math.sin(t * 2.2) * 0.012 * (1 - run);
    let armL = -sw * 1.1, armR = sw * 1.1, armLz = 0.18, armRz = -0.18;
    let legL = sw, legR = -sw;
    let spin = 0;

    if (a?.dash) {
      // classic ninja run: lean hard, arms swept back
      lean = 0.7;
      armL = armR = 1.3;
      armLz = 0.3; armRz = -0.3;
      legL = -0.7; legR = 0.6;
    }
    if (a && a.air > 0.05 && !a.dash) {
      legL = -1.0; legR = -0.4;
      armL = armR = -0.5;
      armLz = 1.0; armRz = -1.0;
      lean = 0.15;
      spin = a.air > 1.8 ? (t * 12) % (Math.PI * 2) : 0; // flip on the double jump
    }
    if (a && a.collect > 0) {
      const k = a.collect / 0.35;
      bodyY += Math.sin(k * Math.PI) * 0.2;
      armRz = -0.18 - Math.sin(k * Math.PI) * 2.2;
    }
    if (a && a.hurt > 0) lean = -0.4 * (a.hurt / 0.4);
    if (a?.mode === 'win') {
      const j = Math.abs(Math.sin(a.modeT * 5));
      bodyY += j * 0.4;
      armL = armR = -2.9;
      armLz = 0.35; armRz = -0.35;
      legL = legR = -j * 0.4;
      spin = a.modeT * 2.2;
      lean = 0;
    }
    fall.current = a?.mode === 'lose' ? Math.min(1, fall.current + dt * 2.2) : 0;

    body.current.position.y = bodyY;
    body.current.rotation.x = lean;
    root.current.rotation.y = a?.mode === 'win' ? spin : 0;
    root.current.rotation.x = -fall.current * 1.45 + (a?.mode !== 'win' ? spin : 0);
    root.current.position.y = fall.current * 0.25;
    lLeg.current.rotation.x = legL;
    rLeg.current.rotation.x = legR;
    lArm.current.rotation.set(armL, 0, armLz);
    rArm.current.rotation.set(armR, 0, armRz);
    head.current.rotation.y = Math.sin(t * 0.7) * 0.18 * (1 - run);
    head.current.rotation.x = -lean * 0.5;
    if (cape.current) cape.current.rotation.x = 0.1 + run * 0.7 + Math.sin(t * 7) * 0.06 * (0.3 + run);
    root.current.visible = !(a && a.invuln > 0 && a.mode === 'play' && Math.floor(t * 18) % 2 === 0);
  });

  return (
    <group scale={scale}>
      {shadow && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[1.5, 1.5]} />
          <meshBasicMaterial map={blobTexture()} transparent depthWrite={false} />
        </mesh>
      )}
      <group ref={root}>
        {/* legs: baggy hakama pants, wrapped ankles, sandals */}
        {[-1, 1].map((side) => (
          <group key={side} ref={side < 0 ? lLeg : rLeg} position={[side * 0.11, BODY_Y, 0]}>
            <M g={cyl} m={variant === 'assassin' ? m.cloth2 : m.cloth} p={[0, -0.2, 0]} s={[0.13, 0.36, 0.13]} />
            <M g={sphere} m={variant === 'assassin' ? m.cloth2 : m.cloth} p={[0, -0.3, 0]} s={[0.14, 0.12, 0.14]} />
            <M g={cyl} m={variant === 'warrior' ? m.lacquer : m.trim} p={[0, -0.42, 0]} s={[0.085, 0.07, 0.085]} />
            <M g={box} m={m.dark} p={[0, -0.47, 0.04]} s={[0.12, 0.06, 0.2]} />
            {armored && <M g={box} m={m.lacquer} p={[0, -0.25, 0.1]} s={[0.15, 0.25, 0.05]} />}
          </group>
        ))}

        <group ref={body} position={[0, BODY_Y, 0]}>
          {/* hips + sash */}
          <M g={cyl} m={variant === 'assassin' ? m.cloth2 : m.cloth} p={[0, 0.06, 0]} s={[0.22, 0.16, 0.18]} />
          {variant === 'warrior' ? (
            <M g={torus} m={m.rope} p={[0, 0.16, 0]} s={[0.215, 0.18, 0.4]} r={[Math.PI / 2, 0, 0]} />
          ) : (
            <M g={cyl} m={m.trim} p={[0, 0.16, 0]} s={[0.21, 0.07, 0.17]} />
          )}
          {variant === 'rookie' && <M g={cyl} m={m.dark} p={[0, 0.16, 0.17]} s={[0.07, 0.03, 0.07]} r={[Math.PI / 2, 0, 0]} />}
          {variant === 'assassin' && (
            <>
              <M g={torus} m={m.trim} p={[0, 0.17, 0.17]} s={0.05} />
              <M g={box} m={m.trim} p={[-0.04, 0.08, 0.18]} s={[0.04, 0.12, 0.02]} r={[0, 0, 0.3]} />
              <M g={box} m={m.trim} p={[0.04, 0.08, 0.18]} s={[0.04, 0.12, 0.02]} r={[0, 0, -0.3]} />
            </>
          )}
          {/* armored skirt plates */}
          {armored && [-0.7, -0.25, 0.25, 0.7].map((a, i) => (
            <group key={i} rotation={[0, a, 0]}>
              <M g={box} m={m.lacquer} p={[0, 0.0, 0.2]} s={[0.13, 0.2, 0.03]} r={[-0.25, 0, 0]} />
              <M g={box} m={m.gold} p={[0, -0.095, 0.225]} s={[0.13, 0.015, 0.035]} r={[-0.25, 0, 0]} />
            </group>
          ))}

          {/* torso (gi) */}
          <M g={cyl} m={m.cloth} p={[0, 0.36, 0]} s={[0.2, 0.36, 0.16]} />
          {/* V collar */}
          <M g={box} m={variant === 'assassin' ? m.cloth : m.cloth2} p={[-0.045, 0.43, 0.14]} s={[0.06, 0.22, 0.03]} r={[0, 0, -0.4]} />
          <M g={box} m={variant === 'assassin' ? m.cloth : m.cloth2} p={[0.045, 0.43, 0.14]} s={[0.06, 0.22, 0.03]} r={[0, 0, 0.4]} />
          {/* chest strap / armor */}
          {variant === 'rookie' && <M g={box} m={m.dark} p={[0, 0.36, 0.16]} s={[0.05, 0.42, 0.02]} r={[0, 0, 0.75]} />}
          {armored && (
            <>
              <M g={box} m={m.lacquer} p={[0, 0.38, 0.12]} s={[0.36, 0.26, 0.1]} />
              <M g={box} m={m.gold} p={[0, 0.3, 0.175]} s={[0.36, 0.02, 0.02]} />
              <M g={box} m={m.gold} p={[0, 0.4, 0.175]} s={[0.36, 0.02, 0.02]} />
            </>
          )}
          {/* haori jacket (Sky Ronin) */}
          {variant === 'assassin' && (
            <>
              <M g={box} m={m.cloth2} p={[-0.17, 0.33, 0.02]} s={[0.1, 0.42, 0.3]} />
              <M g={box} m={m.cloth2} p={[0.17, 0.33, 0.02]} s={[0.1, 0.42, 0.3]} />
              {[[-0.22, 0.45], [-0.2, 0.3], [0.21, 0.4], [0.2, 0.22], [-0.21, 0.18]].map(([x, y], i) => (
                <M key={i} g={sphere} m={m.trim} p={[x, y, 0.17]} s={0.018} />
              ))}
            </>
          )}

          {/* back: weapons / cape */}
          <group ref={cape} position={[0, 0.55, -0.16]}>
            {(variant === 'assassin' || variant === 'guardian') && (
              <M g={box} m={variant === 'guardian' ? m.trim : m.cloth2} p={[0, -0.22, -0.02]} s={[0.36, 0.45, 0.02]} />
            )}
          </group>
          {(variant === 'assassin') && (
            <>
              <group position={[0.05, 0.25, -0.2]} rotation={[0, 0, 0.7]}><Katana m={m} sheathed len={0.6} /></group>
              <group position={[-0.05, 0.22, -0.22]} rotation={[0, 0, -0.85]}><Katana m={m} sheathed len={0.55} /></group>
            </>
          )}
          {(variant === 'reaper' || variant === 'guardian') && (
            <group position={[0, 0.2, -0.2]} rotation={[0, 0, 0.6]}><Katana m={m} sheathed len={0.7} /></group>
          )}
          {/* katana at the hip (Shadow Ninja / Oni) */}
          {(variant === 'rookie' || variant === 'warrior') && (
            <group position={[-0.22, 0.16, 0.08]} rotation={[1.2, 0, 0.25]}><Katana m={m} sheathed len={0.55} /></group>
          )}

          {/* arms (pivot at shoulder) */}
          {[-1, 1].map((side) => (
            <group key={side} ref={side < 0 ? lArm : rArm} position={[side * 0.24, 0.52, 0]}>
              {/* shoulder armor */}
              {armored && [0, 1, 2].map((k) => (
                <group key={k}>
                  <M g={box} m={m.lacquer} p={[side * 0.06, 0.02 - k * 0.07, 0]} s={[0.2, 0.06, 0.24]} r={[0, 0, side * -0.35]} />
                  <M g={box} m={m.gold} p={[side * 0.065, -0.012 - k * 0.07, 0]} s={[0.2, 0.012, 0.245]} r={[0, 0, side * -0.35]} />
                </group>
              ))}
              {variant === 'rookie' && side < 0 && (
                <M g={box} m={m.dark} p={[-0.04, 0.03, 0]} s={[0.18, 0.08, 0.2]} r={[0, 0, 0.35]} />
              )}
              {/* wide sleeve */}
              <M g={cyl} m={variant === 'assassin' ? m.cloth2 : m.cloth} p={[0, -0.13, 0]} s={[0.085, 0.26, 0.085]} />
              <M g={cyl} m={variant === 'assassin' ? m.cloth2 : m.cloth} p={[0, -0.22, 0]} s={[0.11, 0.08, 0.11]} />
              {/* wrist wrap */}
              <M g={cyl} m={variant === 'warrior' ? m.lacquer : variant === 'rookie' ? m.trim : m.dark} p={[0, -0.3, 0]} s={[0.065, 0.08, 0.065]} />
              <M g={sphere} m={m.skin} p={[0, -0.37, 0]} s={0.065} />
              {/* held weapons */}
              {side > 0 && variant === 'warrior' && (
                <group position={[0, -0.37, 0.02]} rotation={[Math.PI / 2 + 0.3, 0, 0]}><Katana m={m} glow len={0.85} /></group>
              )}
              {side > 0 && variant === 'rookie' && (
                <group position={[0, -0.39, 0.03]}>
                  <M g={cyl} m={m.trim} p={[0, -0.08, 0]} s={[0.022, 0.16, 0.022]} />
                  <M g={cyl} m={m.dark} p={[0, -0.2, 0]} s={[0.006, 0.08, 0.006]} />
                  <M g={cyl} m={m.trim} p={[0, -0.32, 0.02]} s={[0.022, 0.16, 0.022]} r={[0.2, 0, 0]} />
                </group>
              )}
            </group>
          ))}

          {/* head (big chibi head) */}
          <group ref={head} position={[0, 0.62, 0]}>
            <M g={cyl} m={m.skin} p={[0, 0.02, 0]} s={[0.07, 0.08, 0.07]} />
            <group position={[0, 0.3, 0]}>
              {variant === 'rookie' && (
                <>
                  <M g={sphere} m={m.skin} p={[0, 0, 0.04]} s={[0.31, 0.32, 0.3]} />
                  {/* hood shell + pointed tip */}
                  <M g={sphere} m={m.cloth} p={[0, 0.03, -0.04]} s={[0.38, 0.39, 0.36]} />
                  <M g={cone} m={m.cloth} p={[0, 0.34, -0.12]} s={[0.15, 0.26, 0.15]} r={[-0.5, 0, 0]} />
                  <M g={torus} m={m.cloth2} p={[0, 0.02, 0.2]} s={[0.29, 0.3, 0.5]} />
                  {/* red mask over lower face */}
                  <M g={sphere} m={m.trim} p={[0, -0.13, 0.1]} s={[0.29, 0.16, 0.26]} />
                  {/* grey fringe */}
                  <M g={box} m={m.hair} p={[-0.05, 0.17, 0.27]} s={[0.24, 0.08, 0.06]} r={[0, 0, 0.35]} />
                  <Eyes m={m} y={0.03} z={0.29} />
                </>
              )}
              {variant === 'warrior' && (
                <>
                  <M g={sphere} m={m.pale} s={[0.3, 0.33, 0.29]} />
                  <M g={sphere} m={m.dark} p={[0, 0.1, -0.04]} s={[0.31, 0.26, 0.29]} />
                  <M g={sphere} m={m.dark} p={[0, 0.3, -0.12]} s={0.08} />
                  {[-1, 1].map((s) => (
                    <group key={s} position={[s * 0.15, 0.22, 0.05]} rotation={[0.2, 0, s * -0.35]}>
                      <M g={cone} m={m.dark} p={[0, 0.12, 0]} s={[0.05, 0.26, 0.05]} />
                      <M g={cone} m={m.glowEye} p={[0, 0.27, 0]} s={[0.02, 0.06, 0.02]} />
                    </group>
                  ))}
                  <M g={box} m={m.glowEye} p={[0, 0.17, 0.27]} s={[0.04, 0.04, 0.01]} r={[0, 0, Math.PI / 4]} />
                  <Eyes m={m} glow y={0.03} z={0.27} />
                  <M g={box} m={m.dark} p={[0, -0.14, 0.27]} s={[0.1, 0.02, 0.01]} />
                </>
              )}
              {variant === 'assassin' && (
                <>
                  <M g={sphere} m={m.skin} s={[0.31, 0.32, 0.3]} />
                  {/* hair cap, topknot and side locks */}
                  <M g={sphere} m={m.hair} p={[0, 0.07, -0.04]} s={[0.33, 0.29, 0.31]} />
                  <M g={sphere} m={m.hair} p={[0, 0.34, -0.06]} s={[0.1, 0.09, 0.1]} />
                  <M g={cone} m={m.hair} p={[-0.08, 0.44, -0.05]} s={[0.06, 0.18, 0.04]} r={[0, 0, 0.6]} />
                  <M g={cone} m={m.hair} p={[0.08, 0.45, -0.05]} s={[0.06, 0.2, 0.04]} r={[0, 0, -0.5]} />
                  <M g={torus} m={m.trim} p={[0, 0.3, -0.06]} s={[0.08, 0.08, 0.15]} r={[Math.PI / 2, 0, 0]} />
                  <M g={box} m={m.hair} p={[-0.27, -0.08, 0.12]} s={[0.06, 0.26, 0.08]} r={[0, 0, -0.15]} />
                  <M g={box} m={m.hair} p={[0.27, -0.08, 0.12]} s={[0.06, 0.26, 0.08]} r={[0, 0, 0.15]} />
                  {/* forehead marks */}
                  <M g={cone} m={m.hair} p={[0, 0.17, 0.29]} s={[0.025, 0.06, 0.01]} r={[0, 0, Math.PI]} />
                  <M g={sphere} m={m.skin} p={[-0.31, 0, 0]} s={[0.05, 0.07, 0.04]} />
                  <M g={sphere} m={m.skin} p={[0.31, 0, 0]} s={[0.05, 0.07, 0.04]} />
                  <Eyes m={m} y={0.0} z={0.27} />
                  <M g={box} m={m.dark} p={[0, -0.16, 0.285]} s={[0.06, 0.012, 0.01]} />
                </>
              )}
              {variant === 'reaper' && (
                <>
                  <M g={sphere} m={m.dark} s={[0.3, 0.32, 0.29]} />
                  {/* kabuto helmet + crescent crest */}
                  <M g={helmet} m={m.lacquer} p={[0, 0.02, -0.02]} s={[0.36, 0.36, 0.35]} />
                  <M g={cyl} m={m.lacquer} p={[0, -0.02, -0.04]} s={[0.4, 0.04, 0.38]} />
                  <M g={halfTorus} m={m.gold} p={[0, 0.36, 0.1]} s={[0.22, 0.2, 0.2]} />
                  {/* menpo war mask */}
                  <M g={sphere} m={m.lacquer} p={[0, -0.13, 0.1]} s={[0.27, 0.15, 0.22]} />
                  <M g={box} m={m.gold} p={[0, -0.12, 0.31]} s={[0.12, 0.015, 0.01]} />
                  <Eyes m={m} glow y={0.04} z={0.26} />
                </>
              )}
              {variant === 'guardian' && (
                <>
                  <M g={sphere} m={m.skin} s={[0.31, 0.32, 0.3]} />
                  <M g={sphere} m={m.cloth2} p={[0, 0.08, -0.04]} s={[0.32, 0.27, 0.3]} />
                  <M g={cyl} m={m.trim} p={[0, 0.13, 0]} s={[0.32, 0.06, 0.31]} />
                  <M g={box} m={m.trim} p={[0, 0.1, -0.33]} s={[0.04, 0.2, 0.02]} r={[0.3, 0, 0.2]} />
                  <Eyes m={m} y={0.0} z={0.27} />
                </>
              )}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
