export type BadgeIcon = 'bolt' | 'coin' | 'shield' | 'crown' | 'gem' | 'flame' | 'star' | 'skull';

export interface AchievementDef { id: string; name: string; desc: string; reward: number; icon: BadgeIcon; color: string }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first', name: 'First Blood', desc: 'Finish your first arena round', reward: 50, icon: 'bolt', color: '#a855f7' },
  { id: 'coins100', name: 'Coin Collector', desc: 'Collect 100 coins in total', reward: 100, icon: 'coin', color: '#39ff88' },
  { id: 'survivor', name: 'Survivor', desc: 'Survive a full 60 second round', reward: 100, icon: 'shield', color: '#22d3ee' },
  { id: 'score1000', name: 'High Roller', desc: 'Score 1,000 in one round', reward: 200, icon: 'crown', color: '#fbbf24' },
  { id: 'crystals', name: 'Crystal Clear', desc: 'Collect 10 energy crystals in total', reward: 150, icon: 'gem', color: '#ff3ea5' },
  { id: 'dash100', name: 'Dash Master', desc: 'Dash 100 times', reward: 100, icon: 'flame', color: '#f97316' },
  { id: 'lvl5', name: 'Arena Warrior', desc: 'Reach level 5', reward: 250, icon: 'star', color: '#39ff88' },
  { id: 'lvl10', name: 'Degen Overlord', desc: 'Reach level 10', reward: 1000, icon: 'skull', color: '#f43f5e' },
  { id: 'streak3', name: 'Daily Degen', desc: 'Keep a 3 day play streak', reward: 150, icon: 'flame', color: '#a855f7' },
];
