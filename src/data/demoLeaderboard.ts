// DEMO DATA: generated players shown until real Supabase records are available.
import type { CharacterId } from './characters';
import { levelFromXp } from './levels';

export interface LeaderRow {
  id: string;
  username: string;
  avatar: CharacterId;
  level: number;
  xp: number;
  bestScore: number;
  games: number;
  isDemo: boolean;
  isYou?: boolean;
}

const A = ['Neon', 'Based', 'Cyber', 'Void', 'Rekt', 'Moon', 'Gwei', 'Pixel', 'Laser', 'Ape', 'Chad', 'Glitch', 'Hodl', 'Volt', 'Frog', 'Turbo', 'Degen', 'Alpha', 'Shadow', 'Byte'];
const B = ['Wizard', 'Runner', 'Ninja', 'Maxi', 'Sniper', 'Whale', 'Goblin', 'Ronin', 'Bot', 'Knight', 'Viper', 'Lord', 'Hunter', 'Monk', 'Punk'];
const AV: CharacterId[] = ['rookie', 'warrior', 'assassin', 'reaper'];

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function demoPlayers(kind: 'weekly' | 'alltime'): LeaderRow[] {
  const r = rng(kind === 'weekly' ? 4242 : 1337);
  const rows: LeaderRow[] = [];
  const used = new Set<string>();
  const scale = kind === 'weekly' ? 0.35 : 1;
  while (rows.length < 50) {
    let name = A[Math.floor(r() * A.length)] + B[Math.floor(r() * B.length)];
    if (r() > 0.5) name += Math.floor(r() * 99);
    if (used.has(name)) continue;
    used.add(name);
    const i = rows.length;
    const xp = Math.max(0, Math.round((9500 - i * 170 + r() * 300) * scale));
    rows.push({
      id: `demo-${kind}-${i}`,
      username: name,
      avatar: AV[Math.floor(r() * AV.length)],
      xp,
      level: levelFromXp(xp).level,
      bestScore: Math.round((1900 - i * 28 + r() * 60) * (kind === 'weekly' ? 0.85 : 1)),
      games: Math.round((420 - i * 7 + r() * 40) * scale),
      isDemo: true,
    });
  }
  return rows;
}
