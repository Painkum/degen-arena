// Scoring + reward rules. This file is mirrored in supabase/functions/submit-score/index.ts
// so the server can re-check every round. Keep the two in sync.

export const ROUND_SECONDS = 60;
export const POINTS = { normal: 10, rare: 25, crystal: 50, survival: 100 } as const;

export interface RoundStats {
  normal: number;
  rare: number;
  crystals: number;
  survived: boolean;
  survivalTime: number; // seconds
  dashes: number;
  score: number;
  characterId: string;
}

export interface RoundAward {
  valid: boolean;
  reason?: string;
  score: number;
  xp: number;
  coins: number;
}

export function computeScore(s: Pick<RoundStats, 'normal' | 'rare' | 'crystals' | 'survived'>) {
  return s.normal * POINTS.normal + s.rare * POINTS.rare + s.crystals * POINTS.crystal + (s.survived ? POINTS.survival : 0);
}

/** Rejects rounds that could not have happened in the real game. */
export function validateRound(s: RoundStats): RoundAward {
  const bad = (reason: string): RoundAward => ({ valid: false, reason, score: 0, xp: 0, coins: 0 });
  const ints = [s.normal, s.rare, s.crystals, s.dashes];
  if (ints.some((n) => !Number.isInteger(n) || n < 0)) return bad('Invalid counters');
  if (!(s.survivalTime >= 0 && s.survivalTime <= ROUND_SECONDS + 1)) return bad('Invalid survival time');
  if (s.survived && s.survivalTime < ROUND_SECONDS - 1) return bad('Survival flag mismatch');
  const pickups = s.normal + s.rare + s.crystals;
  // Spawner cannot produce more than ~2.2 pickups per second plus the opening field of coins.
  if (pickups > s.survivalTime * 2.2 + 20) return bad('Too many pickups for round length');
  if (s.crystals > s.survivalTime / 4 + 3) return bad('Too many crystals');
  if (s.dashes > s.survivalTime * 1.5 + 2) return bad('Too many dashes');
  const score = computeScore(s);
  if (score !== s.score) return bad('Score does not match pickups');
  const xp = Math.round(score / 5) + Math.floor(s.survivalTime) + (s.survived ? 50 : 0);
  const coins = s.normal + s.rare * 3 + s.crystals * 5 + (s.survived ? 25 : 0);
  return { valid: true, score, xp, coins };
}

export function performanceRating(score: number, survived: boolean) {
  if (score >= 1400 && survived) return { grade: 'S', label: 'LEGENDARY RUN', color: '#fbbf24' };
  if (score >= 900) return { grade: 'A', label: 'ELITE DEGEN', color: '#39ff88' };
  if (score >= 550) return { grade: 'B', label: 'SOLID GAINS', color: '#a855f7' };
  if (score >= 250) return { grade: 'C', label: 'PAPER HANDS', color: '#22d3ee' };
  return { grade: 'D', label: 'GOT REKT', color: '#f43f5e' };
}
