export type Stat = 'coins' | 'rounds' | 'bestSurvival' | 'bestScore' | 'rareCoins' | 'playSeconds';

export interface MissionDef {
  id: string;
  period: 'daily' | 'weekly';
  title: string;
  desc: string;
  stat: Stat;
  target: number;
  reward: { coins: number; xp: number };
}

export const MISSIONS: MissionDef[] = [
  { id: 'd_coins', period: 'daily', title: 'Coin Sweeper', desc: 'Collect 50 coins', stat: 'coins', target: 50, reward: { coins: 60, xp: 40 } },
  { id: 'd_rounds', period: 'daily', title: 'Warm Up', desc: 'Play 3 arena rounds', stat: 'rounds', target: 3, reward: { coins: 50, xp: 30 } },
  { id: 'd_survive', period: 'daily', title: 'Hold the Line', desc: 'Survive for 45 seconds in one round', stat: 'bestSurvival', target: 45, reward: { coins: 70, xp: 50 } },
  { id: 'd_score', period: 'daily', title: 'Pump It', desc: 'Achieve a score of 500', stat: 'bestScore', target: 500, reward: { coins: 80, xp: 60 } },
  { id: 'd_rare', period: 'daily', title: 'Rare Hunter', desc: 'Collect 5 rare energy coins', stat: 'rareCoins', target: 5, reward: { coins: 60, xp: 40 } },
  { id: 'w_games', period: 'weekly', title: 'Grinder', desc: 'Complete 20 games', stat: 'rounds', target: 20, reward: { coins: 400, xp: 250 } },
  { id: 'w_coins', period: 'weekly', title: 'Vault Filler', desc: 'Collect 500 coins', stat: 'coins', target: 500, reward: { coins: 450, xp: 300 } },
  { id: 'w_score', period: 'weekly', title: 'Four Digits', desc: 'Reach a score of 1,000', stat: 'bestScore', target: 1000, reward: { coins: 500, xp: 350 } },
  { id: 'w_time', period: 'weekly', title: 'Arena Rat', desc: 'Play for 30 minutes', stat: 'playSeconds', target: 1800, reward: { coins: 500, xp: 300 } },
];

export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** ISO week key, e.g. 2026-W45 */
export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const wk = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${wk}`;
}
