// Coin Survival simulation. Plain mutable data updated every frame by step();
// React components read it in useFrame, and the HUD reads the throttled useRound store.
import { create } from 'zustand';
import { ROUND_SECONDS, POINTS, computeScore, type RoundStats } from '../lib/rules';
import { charById, type CharacterId } from '../data/characters';
import { input, moveVector } from './input';
import { sound } from '../audio/sound';
import { emitBurst } from './particles';

export const ARENA_R = 17;
export const PYLON_R = 2.3;
export const LASER_INNER = 2.6;
export const LASER_OUTER = 15.2;
const MAX_COINS = 22;

export type CoinType = 'normal' | 'rare' | 'crystal';
export type BoostType = 'speed' | 'shield' | 'magnet' | 'heal';
export type Phase = 'countdown' | 'playing' | 'ending' | 'ended';

export const COIN_COLOR: Record<CoinType, string> = { normal: '#39ff88', rare: '#a855f7', crystal: '#22d3ee' };
export const BOOST_COLOR: Record<BoostType, string> = { speed: '#fbbf24', shield: '#22d3ee', magnet: '#ff3ea5', heal: '#39ff88' };

export interface Coin { active: boolean; type: CoinType; x: number; z: number; age: number; ttl: number; pop: number; px: number; pz: number }
export interface Booster { active: boolean; type: BoostType; x: number; z: number; age: number; pop: number; px: number; pz: number }
export interface Bot { x: number; z: number; vx: number; vz: number; yaw: number; target: number; rushT: number; rushCd: number; character: CharacterId; hurt: number; speedK: number }
export interface Wall { angle: number; orbit: number; phase: number; speed: number; half: number; x: number; z: number; r: number }
export interface Trap { x: number; z: number; r: number; phase: number; state: 'off' | 'warn' | 'on' }
export interface Hammer { x: number; z: number; len: number; angle: number; speed: number }
export interface Zone { active: boolean; x: number; z: number; r: number; t: number; fuse: number; exploded: boolean }

export interface PlayerAnim { speed: number; dash: boolean; hurt: number; collect: number; mode: 'play' | 'win' | 'lose'; modeT: number; invuln: number; air: number }

export const world = {
  t: 0, // elapsed play time
  ht: 0, // hazard animation clock (runs during countdown/ending too)
  phase: 'countdown' as Phase,
  countdown: 3,
  endT: 0,
  paused: false,
  character: 'rookie' as CharacterId,
  player: {
    x: 0, z: 8, vx: 0, vz: 0, y: 0, vy: 0, yaw: Math.PI, health: 100, jumps: 0,
    dashT: 0, dashCd: 0, invuln: 0, speedT: 0, shieldT: 0, magnetT: 0,
    anim: { speed: 0, dash: false, hurt: 0, collect: 0, mode: 'play', modeT: 0, invuln: 0, air: 0 } as PlayerAnim,
  },
  cam: { yaw: 0, dist: 10, shake: 0 },
  coins: [] as Coin[],
  boosters: [] as Booster[],
  bots: [] as Bot[],
  lasers: [{ angle: 0, on: 1 }, { angle: Math.PI, on: 1 }, { angle: Math.PI / 2, on: 0 }],
  walls: [] as Wall[],
  traps: [] as Trap[],
  hammers: [] as Hammer[],
  zones: [] as Zone[],
  stats: { normal: 0, rare: 0, crystals: 0, dashes: 0 },
  timers: { coin: 0, booster: 6, zone: 5, lastCrystal: -10, hud: 0 },
  difficulty: 0,
  mods: { speed: 1, dashCd: 1.2, dmg: 1 },
};

// ---------- HUD store (throttled mirror of world) ----------
export interface Popup { id: number; text: string; color: string }
interface RoundUI {
  phase: Phase; countdown: number; timeLeft: number; health: number; score: number; coins: number;
  dashReady: number; buffs: { speed: number; shield: number; magnet: number }; popups: Popup[];
  hurtTick: number; paused: boolean; endReason: 'time' | 'health' | null; result: RoundStats | null; difficulty: number;
}
export const useRound = create<RoundUI>(() => ({
  phase: 'countdown', countdown: 3, timeLeft: ROUND_SECONDS, health: 100, score: 0, coins: 0, dashReady: 1,
  buffs: { speed: 0, shield: 0, magnet: 0 }, popups: [], hurtTick: 0, paused: false, endReason: null, result: null, difficulty: 0,
}));

let popId = 1;
function popup(text: string, color: string) {
  const id = popId++;
  useRound.setState((s) => ({ popups: [...s.popups, { id, text, color }].slice(-5) }));
  setTimeout(() => useRound.setState((s) => ({ popups: s.popups.filter((p) => p.id !== id) })), 900);
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function randomSpot(minR: number, maxR: number, avoidX = 999, avoidZ = 999, avoidD = 0) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(rand(minR * minR, maxR * maxR));
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.hypot(x - avoidX, z - avoidZ) > avoidD) return { x, z };
  }
  return { x: 0, z: minR + 1 };
}

// ---------- setup ----------
export function resetWorld(character: CharacterId) {
  const def = charById(character);
  world.character = character;
  world.t = 0;
  world.ht = 0;
  world.phase = 'countdown';
  world.countdown = 3;
  world.endT = 0;
  world.paused = false;
  world.difficulty = 0;
  world.mods = {
    speed: 0.85 + def.stats.speed * 0.06,
    dashCd: 1.5 - def.stats.dash * 0.1,
    dmg: 1.3 - def.stats.armor * 0.1,
  };
  const p = world.player;
  Object.assign(p, { x: 0, z: 9, vx: 0, vz: 0, y: 0, vy: 0, jumps: 0, yaw: 0, health: 100, dashT: 0, dashCd: 0, invuln: 0, speedT: 0, shieldT: 0, magnetT: 0 });
  Object.assign(p.anim, { speed: 0, dash: false, hurt: 0, collect: 0, mode: 'play', modeT: 0, invuln: 0, air: 0 });
  world.cam.yaw = 0;
  world.cam.shake = 0;
  world.stats = { normal: 0, rare: 0, crystals: 0, dashes: 0 };
  world.timers = { coin: 0, booster: 6, zone: 6, lastCrystal: -10, hud: 0 };

  world.coins = Array.from({ length: MAX_COINS }, () => ({ active: false, type: 'normal' as CoinType, x: 0, z: 0, age: 0, ttl: 0, pop: -1, px: 0, pz: 0 }));
  for (let i = 0; i < 14; i++) spawnCoin(i < 2 ? 'rare' : 'normal');

  world.boosters = Array.from({ length: 3 }, () => ({ active: false, type: 'speed' as BoostType, x: 0, z: 0, age: 0, pop: -1, px: 0, pz: 0 }));

  const botChars: CharacterId[] = (['warrior', 'assassin', 'reaper', 'rookie'] as CharacterId[]).filter((c) => c !== character).slice(0, 3);
  world.bots = botChars.map((c, i) => {
    const a = (i / 3) * Math.PI * 2 + 0.6;
    return { x: Math.cos(a) * 12, z: Math.sin(a) * 12, vx: 0, vz: 0, yaw: 0, target: -1, rushT: 0, rushCd: rand(6, 12), character: c, hurt: 0, speedK: rand(0.9, 1.05) };
  });

  world.lasers = [{ angle: 0, on: 1 }, { angle: Math.PI, on: 1 }, { angle: Math.PI / 2, on: 0 }];
  world.walls = [0, 1].map((i) => ({ angle: i * Math.PI + 0.8, orbit: 0.12 * (i ? -1 : 1), phase: i * 1.7, speed: 0.55, half: 2.6, x: 0, z: 0, r: 0 }));
  world.traps = [0, 1, 2, 3].map((i) => {
    const a = i * (Math.PI / 2) + Math.PI / 4;
    return { x: Math.cos(a) * 8.5, z: Math.sin(a) * 8.5, r: 1.9, phase: i * 1.3, state: 'off' as const };
  });
  world.hammers = [0, 1].map((i) => {
    const a = i * Math.PI + Math.PI / 2 + 0.3;
    return { x: Math.cos(a) * 11.5, z: Math.sin(a) * 11.5, len: 3.3, angle: i, speed: i ? -1.4 : 1.4 };
  });
  world.zones = Array.from({ length: 6 }, () => ({ active: false, x: 0, z: 0, r: 2.4, t: 0, fuse: 1.8, exploded: false }));

  useRound.setState({
    phase: 'countdown', countdown: 3, timeLeft: ROUND_SECONDS, health: 100, score: 0, coins: 0, dashReady: 1,
    buffs: { speed: 0, shield: 0, magnet: 0 }, popups: [], hurtTick: 0, paused: false, endReason: null, result: null, difficulty: 0,
  });
}

function spawnCoin(force?: CoinType) {
  const slot = world.coins.find((c) => !c.active && c.pop < 0);
  if (!slot) return;
  let type: CoinType = force ?? 'normal';
  if (!force) {
    const r = Math.random();
    const crystalOk = world.t - world.timers.lastCrystal > 4.5 && !world.coins.some((c) => c.active && c.type === 'crystal');
    if (crystalOk && r < 0.08 + world.difficulty * 0.05) type = 'crystal';
    else if (r < 0.28) type = 'rare';
  }
  if (type === 'crystal') world.timers.lastCrystal = world.t;
  const p = world.player;
  const spot = randomSpot(PYLON_R + 1.2, ARENA_R - 1.2, p.x, p.z, 3);
  Object.assign(slot, { active: true, type, x: spot.x, z: spot.z, age: 0, ttl: type === 'crystal' ? 9 : 999, pop: -1 });
}

function spawnBooster() {
  const slot = world.boosters.find((b) => !b.active && b.pop < 0);
  if (!slot) return;
  const types: BoostType[] = ['speed', 'shield', 'magnet', 'heal'];
  let type = types[Math.floor(Math.random() * types.length)];
  if (world.player.health < 45 && Math.random() < 0.6) type = 'heal';
  const spot = randomSpot(PYLON_R + 2, ARENA_R - 2);
  Object.assign(slot, { active: true, type, x: spot.x, z: spot.z, age: 0, pop: -1 });
}

function spawnZone() {
  const z = world.zones.find((q) => !q.active);
  if (!z) return;
  const p = world.player;
  const targeted = Math.random() < 0.45 + world.difficulty * 0.3;
  const spot = targeted ? { x: p.x + p.vx * 0.4, z: p.z + p.vz * 0.4 } : randomSpot(PYLON_R + 2, ARENA_R - 1.5);
  const r = Math.hypot(spot.x, spot.z);
  if (r > ARENA_R - 1) { spot.x *= (ARENA_R - 1) / r; spot.z *= (ARENA_R - 1) / r; }
  Object.assign(z, { active: true, x: spot.x, z: spot.z, r: 2.2 + world.difficulty * 0.8, t: 0, fuse: 1.9 - world.difficulty * 0.4, exploded: false });
}

// ---------- combat ----------
function damage(amount: number, sx: number, sz: number, knock: number, label: string) {
  const p = world.player;
  if (p.invuln > 0 || world.phase !== 'playing') return;
  const dx = p.x - sx;
  const dz = p.z - sz;
  const d = Math.hypot(dx, dz) || 1;
  p.vx += (dx / d) * knock;
  p.vz += (dz / d) * knock;
  if (p.shieldT > 0) {
    p.shieldT = 0;
    p.invuln = 0.7;
    sound.play('hit');
    popup('SHIELD BROKEN', BOOST_COLOR.shield);
    emitBurst(p.x, 1, p.z, BOOST_COLOR.shield, 24, 5);
    return;
  }
  p.health = Math.max(0, p.health - Math.round(amount * world.mods.dmg));
  p.invuln = 0.9;
  p.anim.hurt = 0.4;
  world.cam.shake = 0.45;
  sound.play('damage');
  emitBurst(p.x, 1, p.z, '#f43f5e', 18, 4);
  popup(`-${Math.round(amount * world.mods.dmg)} ${label}`, '#f43f5e');
  useRound.setState((s) => ({ health: p.health, hurtTick: s.hurtTick + 1 }));
  if (p.health <= 0) endRound('health');
}

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const abx = bx - ax;
  const abz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / (abx * abx + abz * abz || 1)));
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

function collect(c: Coin, byPlayer: boolean) {
  c.active = false;
  c.pop = 0;
  c.px = c.x;
  c.pz = c.z;
  if (!byPlayer) {
    emitBurst(c.x, 0.9, c.z, '#64748b', 6, 2);
    return;
  }
  world.stats[c.type === 'crystal' ? 'crystals' : c.type]++;
  const pts = c.type === 'crystal' ? POINTS.crystal : c.type === 'rare' ? POINTS.rare : POINTS.normal;
  emitBurst(c.x, 0.9, c.z, COIN_COLOR[c.type], c.type === 'normal' ? 14 : 26, c.type === 'normal' ? 3.5 : 5);
  sound.play(c.type === 'crystal' ? 'crystal' : c.type === 'rare' ? 'rare' : 'coin');
  world.player.anim.collect = 0.35;
  popup(`+${pts}`, COIN_COLOR[c.type]);
  const s = world.stats;
  useRound.setState({ score: computeScore({ ...s, survived: false }), coins: s.normal + s.rare + s.crystals });
}

function grabBooster(b: Booster) {
  const p = world.player;
  b.active = false;
  b.pop = 0;
  b.px = b.x;
  b.pz = b.z;
  sound.play('boost');
  emitBurst(b.x, 1, b.z, BOOST_COLOR[b.type], 30, 5);
  if (b.type === 'speed') { p.speedT = 6; popup('SPEED BOOST', BOOST_COLOR.speed); }
  if (b.type === 'shield') { p.shieldT = 10; popup('SHIELD ONLINE', BOOST_COLOR.shield); }
  if (b.type === 'magnet') { p.magnetT = 7; popup('COIN MAGNET', BOOST_COLOR.magnet); }
  if (b.type === 'heal') {
    p.health = Math.min(100, p.health + 30);
    popup('+30 HP', BOOST_COLOR.heal);
    useRound.setState({ health: p.health });
  }
}

export function endRound(reason: 'time' | 'health') {
  if (world.phase !== 'playing') return;
  world.phase = 'ending';
  world.endT = 0;
  const survived = reason === 'time';
  world.player.anim.mode = survived ? 'win' : 'lose';
  world.player.anim.modeT = 0;
  sound.play(survived ? 'victory' : 'gameover');
  sound.setIntensity(0);
  const s = world.stats;
  const survivalTime = survived ? ROUND_SECONDS : Math.min(world.t, ROUND_SECONDS);
  const result: RoundStats = {
    normal: s.normal, rare: s.rare, crystals: s.crystals, dashes: s.dashes, survived,
    survivalTime: Math.round(survivalTime * 10) / 10, score: computeScore({ ...s, survived }), characterId: world.character,
  };
  if (survived) popup(`+${POINTS.survival} SURVIVAL BONUS`, '#fbbf24');
  useRound.setState({ phase: 'ending', endReason: reason, result, score: result.score, timeLeft: survived ? 0 : useRound.getState().timeLeft });
}

export function setPaused(p: boolean) {
  if (world.phase === 'ended' || world.phase === 'ending') return;
  world.paused = p;
  useRound.setState({ paused: p });
}

// ---------- main step ----------
export function step(dt: number) {
  if (world.paused) return;
  dt = Math.min(dt, 1 / 20);
  const p = world.player;
  const ui = useRound.getState();

  // camera input
  world.cam.yaw += input.camYawDelta;
  input.camYawDelta = 0;
  if (input.keys.has('KeyQ')) world.cam.yaw += dt * 2;
  if (input.keys.has('KeyE')) world.cam.yaw -= dt * 2;
  world.cam.dist = Math.max(6, Math.min(16, world.cam.dist + input.zoomDelta));
  input.zoomDelta = 0;
  world.cam.shake = Math.max(0, world.cam.shake - dt);

  if (world.phase === 'countdown') {
    const before = Math.ceil(world.countdown);
    world.countdown -= dt;
    const after = Math.ceil(world.countdown);
    if (after !== before && after > 0) sound.play('countdown');
    if (world.countdown <= 0) {
      world.phase = 'playing';
      world.player.invuln = 2; // spawn protection
      sound.play('go');
      sound.setIntensity(1);
      useRound.setState({ phase: 'playing', countdown: 0 });
    } else if (after !== ui.countdown) useRound.setState({ countdown: after });
    animateHazards(dt);
    return;
  }

  if (world.phase === 'ending' || world.phase === 'ended') {
    world.endT += dt;
    p.anim.modeT += dt;
    p.vx *= 0.9;
    p.vz *= 0.9;
    p.anim.speed = 0;
    if (p.y > 0) { p.vy -= 30 * dt; p.y = Math.max(0, p.y + p.vy * dt); p.anim.air = p.y; }
    animateHazards(dt);
    tickPops(dt);
    if (world.phase === 'ending' && world.endT > 2.2) {
      world.phase = 'ended';
      useRound.setState({ phase: 'ended' });
    }
    return;
  }

  // ----- playing -----
  world.t += dt;
  const d = (world.difficulty = Math.min(1, world.t / ROUND_SECONDS));

  // movement relative to camera
  const mv = moveVector();
  const yaw = world.cam.yaw;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  let mx = fx * mv.y + rx * mv.x;
  let mz = fz * mv.y + rz * mv.x;
  const ml = Math.hypot(mx, mz);
  if (ml > 1) { mx /= ml; mz /= ml; }

  p.dashCd = Math.max(0, p.dashCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.speedT = Math.max(0, p.speedT - dt);
  p.shieldT = Math.max(0, p.shieldT - dt);
  p.magnetT = Math.max(0, p.magnetT - dt);
  p.anim.hurt = Math.max(0, p.anim.hurt - dt);
  p.anim.collect = Math.max(0, p.anim.collect - dt);

  // jump (one extra mid-air jump allowed)
  if (input.jumpQueued) {
    input.jumpQueued = false;
    if (p.y < 0.05 || p.jumps < 2) {
      if (p.y < 0.05) p.jumps = 0;
      p.vy = p.jumps === 0 ? 10.5 : 8.5;
      p.jumps++;
      sound.play('jump');
      emitBurst(p.x, 0.15, p.z, trailColor, 8, 2.5);
    }
  }
  if (p.y > 0 || p.vy > 0) {
    p.vy -= 30 * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.jumps = 0;
      emitBurst(p.x, 0.1, p.z, '#ffffff', 6, 1.8);
    }
  }
  p.anim.air = p.y;

  if (input.dashQueued) {
    input.dashQueued = false;
    if (p.dashCd <= 0) {
      let dx = mx, dz = mz;
      if (Math.hypot(dx, dz) < 0.1) { dx = Math.sin(p.yaw); dz = Math.cos(p.yaw); }
      const l = Math.hypot(dx, dz) || 1;
      p.vx = (dx / l) * 24;
      p.vz = (dz / l) * 24;
      p.dashT = 0.2;
      p.dashCd = world.mods.dashCd;
      world.stats.dashes++;
      sound.play('dash');
    }
  }

  if (p.dashT > 0) {
    p.dashT -= dt;
    emitBurst(p.x, 0.9, p.z, trailColor, 2, 0.6);
  } else {
    const speed = 7.2 * world.mods.speed * (p.speedT > 0 ? 1.45 : 1);
    const k = Math.min(1, dt * 12);
    p.vx += (mx * speed - p.vx) * k;
    p.vz += (mz * speed - p.vz) * k;
  }
  p.x += p.vx * dt;
  p.z += p.vz * dt;
  const sp = Math.hypot(p.vx, p.vz);
  if (sp > 0.5) {
    const target = Math.atan2(p.vx, p.vz);
    let diff = target - p.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    p.yaw += diff * Math.min(1, dt * 14);
  }
  p.anim.speed = sp;
  p.anim.dash = p.dashT > 0;
  p.anim.invuln = p.invuln;

  // bounds: outer edge + central pylon
  let r = Math.hypot(p.x, p.z);
  if (r > ARENA_R - 0.6) { p.x *= (ARENA_R - 0.6) / r; p.z *= (ARENA_R - 0.6) / r; }
  r = Math.hypot(p.x, p.z);
  if (r < PYLON_R + 0.5) { const k = (PYLON_R + 0.5) / (r || 1); p.x *= k; p.z *= k; }

  // ----- coins -----
  world.timers.coin -= dt;
  const activeCoins = world.coins.reduce((n, c) => n + (c.active ? 1 : 0), 0);
  if (world.timers.coin <= 0 && activeCoins < 12 + Math.floor(d * 6)) {
    spawnCoin();
    world.timers.coin = 0.5;
  }
  const magnet = p.magnetT > 0;
  for (const c of world.coins) {
    if (!c.active) continue;
    c.age += dt;
    if (c.age > c.ttl) { c.active = false; emitBurst(c.x, 0.9, c.z, COIN_COLOR[c.type], 8, 2); continue; }
    const dx = p.x - c.x, dz = p.z - c.z;
    const dist = Math.hypot(dx, dz);
    if (magnet && dist < 6) {
      c.x += (dx / dist) * dt * 12;
      c.z += (dz / dist) * dt * 12;
    }
    if (dist < 1.15) collect(c, true);
  }

  // ----- boosters -----
  world.timers.booster -= dt;
  if (world.timers.booster <= 0) {
    spawnBooster();
    world.timers.booster = rand(8, 11);
  }
  for (const b of world.boosters) {
    if (!b.active) continue;
    b.age += dt;
    if (b.age > 14) { b.active = false; continue; }
    if (Math.hypot(p.x - b.x, p.z - b.z) < 1.3) grabBooster(b);
  }

  animateHazards(dt);
  hazardCollisions();

  // ----- danger zones -----
  world.timers.zone -= dt;
  if (world.timers.zone <= 0) {
    spawnZone();
    if (d > 0.6 && Math.random() < 0.5) spawnZone();
    world.timers.zone = 6.5 - d * 3.8;
  }
  for (const z of world.zones) {
    if (!z.active) continue;
    z.t += dt;
    if (!z.exploded && z.t >= z.fuse) {
      z.exploded = true;
      emitBurst(z.x, 0.4, z.z, '#ff3b3b', 40, 7);
      sound.play('hit');
      if (Math.hypot(p.x - z.x, p.z - z.z) < z.r) damage(18, z.x, z.z, 10, 'BLAST');
    }
    if (z.t > z.fuse + 0.6) z.active = false;
  }

  // ----- bots -----
  for (const b of world.bots) {
    b.hurt = Math.max(0, b.hurt - dt);
    b.rushCd -= dt;
    let tx: number, tz: number, spd: number;
    if (b.rushT > 0) {
      b.rushT -= dt;
      tx = p.x; tz = p.z;
      spd = 8.2 + d * 1.6;
    } else {
      if (b.rushCd <= 0 && Math.hypot(p.x - b.x, p.z - b.z) < 10) {
        b.rushT = 1.6;
        b.rushCd = rand(9, 14) - d * 4;
      }
      let tgt = world.coins[b.target];
      if (!tgt || !tgt.active || Math.random() < 0.004) {
        let best = -1, bestD = 1e9;
        world.coins.forEach((c, i) => {
          if (!c.active) return;
          const dd = Math.hypot(c.x - b.x, c.z - b.z) + Math.random() * 6;
          if (dd < bestD) { bestD = dd; best = i; }
        });
        b.target = best;
        tgt = world.coins[best];
      }
      tx = tgt ? tgt.x : 0;
      tz = tgt ? tgt.z : 10;
      spd = (4.6 + d * 1.6) * b.speedK;
    }
    const dx = tx - b.x, dz = tz - b.z;
    const dl = Math.hypot(dx, dz) || 1;
    const k = Math.min(1, dt * 5);
    b.vx += ((dx / dl) * spd - b.vx) * k;
    b.vz += ((dz / dl) * spd - b.vz) * k;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    const br = Math.hypot(b.x, b.z);
    if (br > ARENA_R - 0.6) { b.x *= (ARENA_R - 0.6) / br; b.z *= (ARENA_R - 0.6) / br; }
    if (br < PYLON_R + 0.5) { const kk = (PYLON_R + 0.5) / (br || 1); b.x *= kk; b.z *= kk; }
    b.yaw = Math.atan2(b.vx, b.vz);
    for (const c of world.coins) if (c.active && Math.hypot(c.x - b.x, c.z - b.z) < 1.0) collect(c, false);
    // bump player
    const pd = Math.hypot(p.x - b.x, p.z - b.z) || 0.01;
    if (pd < 1.1 && p.y < 0.8) {
      if (p.dashT > 0) {
        // dashing into a bot knocks it away
        b.vx -= ((p.x - b.x) / pd) * 14;
        b.vz -= ((p.z - b.z) / pd) * 14;
        b.hurt = 0.4;
        b.rushT = 0;
      } else {
        damage(b.rushT > 0 ? 10 : 5, b.x, b.z, 9, 'BUMP');
        b.rushT = 0;
      }
    }
  }

  // ----- timer -----
  const timeLeft = Math.max(0, ROUND_SECONDS - world.t);
  world.timers.hud -= dt;
  if (world.timers.hud <= 0) {
    world.timers.hud = 0.1;
    useRound.setState({
      timeLeft,
      dashReady: 1 - p.dashCd / world.mods.dashCd,
      buffs: { speed: p.speedT, shield: p.shieldT, magnet: p.magnetT },
      difficulty: d,
    });
  }
  tickPops(dt);
  if (timeLeft <= 0) endRound('time');
}

function tickPops(dt: number) {
  for (const c of world.coins) if (c.pop >= 0) { c.pop += dt; if (c.pop > 0.45) c.pop = -1; }
  for (const b of world.boosters) if (b.pop >= 0) { b.pop += dt; if (b.pop > 0.45) b.pop = -1; }
}

function animateHazards(dt: number) {
  const d = world.difficulty;
  const playing = world.phase === 'playing';
  const lspeed = 0.5 + d * 0.7;
  for (const l of world.lasers) l.angle += lspeed * dt;
  if (playing && world.t > 28 && world.lasers[2].on < 1) world.lasers[2].on = Math.min(1, world.lasers[2].on + dt * 0.5);
  world.ht += dt;
  const tt = world.ht;
  for (const w of world.walls) {
    w.angle += w.orbit * dt * (1 + d);
    w.r = 9.5 + Math.sin(tt * (w.speed + d * 0.5) + w.phase) * 5.5;
    w.x = Math.cos(w.angle) * w.r;
    w.z = Math.sin(w.angle) * w.r;
  }
  const onLen = 1.4 + d * 1.2;
  for (const t of world.traps) {
    const cyc = (tt + t.phase) % 5.5;
    t.state = cyc < 5.5 - onLen - 1 ? 'off' : cyc < 5.5 - onLen ? 'warn' : 'on';
  }
  for (const h of world.hammers) h.angle += h.speed * (1 + d * 0.8) * dt;
}

function hazardCollisions() {
  const p = world.player;
  const dashing = p.dashT > 0;
  // lasers (dash phases through)
  const r = Math.hypot(p.x, p.z);
  if (!dashing && p.y < 0.75 && r > LASER_INNER && r < LASER_OUTER) {
    const pa = Math.atan2(p.z, p.x);
    for (const l of world.lasers) {
      if (l.on < 1) continue;
      let da = pa - l.angle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.cos(da) > 0 && Math.abs(r * Math.sin(da)) < 0.42) {
        damage(12, 0, 0, 0, 'LASER');
        // push sideways out of the beam
        const s = Math.sign(da) || 1;
        p.vx += -Math.sin(pa) * s * 8;
        p.vz += Math.cos(pa) * s * 8;
      }
    }
  }
  // energy walls (tangent segments)
  if (!dashing) for (const w of world.walls) {
    const tx = -Math.sin(w.angle) * w.half, tz = Math.cos(w.angle) * w.half;
    if (segDist(p.x, p.z, w.x - tx, w.z - tz, w.x + tx, w.z + tz) < 0.6) damage(10, w.x, w.z, 12, 'WALL');
  }
  // electric traps
  for (const t of world.traps) {
    if (t.state === 'on' && p.y < 0.3 && Math.hypot(p.x - t.x, p.z - t.z) < t.r) damage(7, t.x, t.z, 4, 'SHOCK');
  }
  // spinning hammers (two arms each). Dashing does not protect against these.
  for (const h of world.hammers) {
    for (const s of [0, Math.PI]) {
      const ex = h.x + Math.cos(h.angle + s) * h.len;
      const ez = h.z + Math.sin(h.angle + s) * h.len;
      if (p.y < 0.95 && segDist(p.x, p.z, h.x, h.z, ex, ez) < 0.65) damage(14, h.x, h.z, 14, 'SMASH');
    }
    // solid hub
    const hd = Math.hypot(p.x - h.x, p.z - h.z);
    if (hd < 0.9) { p.x = h.x + ((p.x - h.x) / (hd || 1)) * 0.9; p.z = h.z + ((p.z - h.z) / (hd || 1)) * 0.9; }
  }
}

let trailColor = '#a855f7';
export function setTrailColor(c: string) { trailColor = c; }
