export const LEVEL_TITLES = [
  'Rookie', 'Arena Beginner', 'Coin Hunter', 'Cyber Runner', 'Arena Warrior',
  'Elite Degen', 'Cyber Legend', 'Arena Master', 'Neon Champion', 'Degen Overlord',
];
/** Total XP needed to reach level (index + 1). */
export const LEVEL_XP = [0, 150, 400, 800, 1400, 2200, 3300, 4700, 6500, 9000];
export const MAX_LEVEL = LEVEL_XP.length;

export function levelFromXp(xp: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) level = i + 1;
  const cur = LEVEL_XP[level - 1];
  const next = level < MAX_LEVEL ? LEVEL_XP[level] : cur;
  const progress = level >= MAX_LEVEL ? 1 : (xp - cur) / (next - cur);
  return { level, title: LEVEL_TITLES[level - 1], cur, next, progress };
}

/** Coin bonuses paid out on reaching a level. Unlocks are described in LEVEL_REWARDS. */
export const LEVEL_COIN_BONUS: Record<number, number> = { 2: 100, 6: 500, 9: 1000 };

export const LEVEL_REWARDS: Record<number, string> = {
  2: '+100 coins', 3: 'Cyber Warrior unlocked', 4: 'Plasma Pink dash trail', 5: 'Neon Assassin unlocked',
  6: '+500 coins', 7: 'Solar Flare dash trail', 8: 'Void Reaper unlocked', 9: '+1000 coins', 10: 'Overlord badge',
};
