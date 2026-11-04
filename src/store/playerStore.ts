import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CHARACTERS, SKINS, TRAILS, type CharacterId } from '../data/characters';
import { levelFromXp, LEVEL_COIN_BONUS } from '../data/levels';
import { MISSIONS, dayKey, weekKey, type Stat } from '../data/missions';
import { ACHIEVEMENTS } from '../data/achievements';
import type { RoundAward, RoundStats } from '../lib/rules';
import type { MapId } from '../data/maps';

export type Quality = 'low' | 'medium' | 'high';

export interface GameRecord {
  at: number; score: number; coins: number; survivalTime: number; xp: number; survived: boolean; character: CharacterId;
}

type Counters = Record<Stat, number>;
const emptyCounters = (): Counters => ({ coins: 0, rounds: 0, bestSurvival: 0, bestScore: 0, rareCoins: 0, playSeconds: 0 });

export interface RoundOutcome {
  award: RoundAward;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newHigh: boolean;
  achievements: string[];
}

interface PlayerState {
  username: string;
  xp: number;
  coins: number;
  gamesPlayed: number;
  bestScore: number;
  totals: { coins: number; rare: number; crystals: number; dashes: number; playSeconds: number; survived: number };
  history: GameRecord[];
  streak: { count: number; lastDay: string | null };
  daily: { key: string; c: Counters };
  weekly: { key: string; c: Counters };
  claimed: string[];
  achievements: string[];
  owned: { characters: CharacterId[]; skins: string[]; trails: string[] };
  equipped: { character: CharacterId; skin: string; trail: string };
  map: MapId;
  settings: { music: boolean; sfx: boolean; quality: Quality; reducedMotion: boolean };
  createdAt: number;

  setUsername: (name: string) => void;
  setMap: (map: MapId) => void;
  setSettings: (s: Partial<PlayerState['settings']>) => void;
  rollPeriods: () => void;
  applyRound: (stats: RoundStats, award: RoundAward) => RoundOutcome;
  claimMission: (id: string) => { ok: boolean; message: string };
  buyCharacter: (id: CharacterId) => { ok: boolean; message: string };
  buySkin: (id: string) => { ok: boolean; message: string };
  buyTrail: (id: string) => { ok: boolean; message: string };
  equipCharacter: (id: CharacterId) => void;
  equipSkin: (id: string) => void;
  equipTrail: (id: string) => void;
  resetProgress: () => void;
}

const defaults = () => ({
  username: 'Degen' + Math.floor(1000 + Math.random() * 9000),
  xp: 0,
  coins: 100,
  gamesPlayed: 0,
  bestScore: 0,
  totals: { coins: 0, rare: 0, crystals: 0, dashes: 0, playSeconds: 0, survived: 0 },
  history: [] as GameRecord[],
  streak: { count: 0, lastDay: null as string | null },
  daily: { key: dayKey(), c: emptyCounters() },
  weekly: { key: weekKey(), c: emptyCounters() },
  claimed: [] as string[],
  achievements: [] as string[],
  owned: { characters: [] as CharacterId[], skins: ['default'], trails: ['violet'] },
  equipped: { character: 'rookie' as CharacterId, skin: 'default', trail: 'violet' },
  map: 'station' as MapId,
  settings: {
    music: true, sfx: true,
    quality: (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'low' : 'medium') as Quality,
    reducedMotion: typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  },
  createdAt: Date.now(),
});

export function isCharacterUnlocked(s: Pick<PlayerState, 'xp' | 'owned'>, id: CharacterId, verifiedNfts: string[] = []) {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) return false;
  if (c.unlock.nftOnly) return verifiedNfts.includes(id);
  if (s.owned.characters.includes(id)) return true;
  return levelFromXp(s.xp).level >= (c.unlock.level ?? 1);
}

export function isTrailUnlocked(s: Pick<PlayerState, 'xp' | 'owned'>, id: string) {
  const t = TRAILS.find((x) => x.id === id);
  if (!t) return false;
  if (s.owned.trails.includes(id)) return true;
  if (t.level) return levelFromXp(s.xp).level >= t.level;
  return t.price === 0;
}

function yesterday(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return dayKey(dt);
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      ...defaults(),

      setUsername: (name) => set({ username: name.replace(/[^\w\- .]/g, '').slice(0, 18) || get().username }),
      setMap: (map) => set({ map }),
      setSettings: (s) => set({ settings: { ...get().settings, ...s } }),

      rollPeriods: () => {
        const dk = dayKey();
        const wk = weekKey();
        const st = get();
        if (st.daily.key !== dk) set({ daily: { key: dk, c: emptyCounters() } });
        if (st.weekly.key !== wk) set({ weekly: { key: wk, c: emptyCounters() } });
      },

      applyRound: (stats, award) => {
        get().rollPeriods();
        const st = get();
        const oldLevel = levelFromXp(st.xp).level;
        const collected = stats.normal + stats.rare + stats.crystals;
        const newHigh = award.valid && award.score > st.bestScore;

        if (!award.valid) {
          return { award, leveledUp: false, oldLevel, newLevel: oldLevel, newHigh: false, achievements: [] };
        }

        const bump = (c: Counters): Counters => ({
          coins: c.coins + collected,
          rounds: c.rounds + 1,
          bestSurvival: Math.max(c.bestSurvival, Math.floor(stats.survivalTime)),
          bestScore: Math.max(c.bestScore, award.score),
          rareCoins: c.rareCoins + stats.rare,
          playSeconds: c.playSeconds + Math.round(stats.survivalTime),
        });

        const today = dayKey();
        let streak = st.streak;
        if (streak.lastDay !== today) {
          streak = { count: streak.lastDay === yesterday(today) ? streak.count + 1 : 1, lastDay: today };
        }

        let xp = st.xp + award.xp;
        let coins = st.coins + award.coins;
        const newLevelInfo = levelFromXp(xp);
        for (let l = oldLevel + 1; l <= newLevelInfo.level; l++) coins += LEVEL_COIN_BONUS[l] ?? 0;

        const totals = {
          coins: st.totals.coins + collected,
          rare: st.totals.rare + stats.rare,
          crystals: st.totals.crystals + stats.crystals,
          dashes: st.totals.dashes + stats.dashes,
          playSeconds: st.totals.playSeconds + Math.round(stats.survivalTime),
          survived: st.totals.survived + (stats.survived ? 1 : 0),
        };

        // Achievements
        const earned: string[] = [];
        const has = (id: string) => st.achievements.includes(id) || earned.includes(id);
        const check = (id: string, cond: boolean) => { if (cond && !has(id)) earned.push(id); };
        check('first', true);
        check('coins100', totals.coins >= 100);
        check('survivor', stats.survived);
        check('score1000', award.score >= 1000);
        check('crystals', totals.crystals >= 10);
        check('dash100', totals.dashes >= 100);
        check('lvl5', newLevelInfo.level >= 5);
        check('lvl10', newLevelInfo.level >= 10);
        check('streak3', streak.count >= 3);
        for (const id of earned) coins += ACHIEVEMENTS.find((a) => a.id === id)?.reward ?? 0;

        const record: GameRecord = {
          at: Date.now(), score: award.score, coins: collected, survivalTime: Math.round(stats.survivalTime * 10) / 10,
          xp: award.xp, survived: stats.survived, character: st.equipped.character,
        };

        set({
          xp, coins, totals, streak,
          gamesPlayed: st.gamesPlayed + 1,
          bestScore: Math.max(st.bestScore, award.score),
          history: [record, ...st.history].slice(0, 30),
          daily: { ...st.daily, c: bump(st.daily.c) },
          weekly: { ...st.weekly, c: bump(st.weekly.c) },
          achievements: [...st.achievements, ...earned],
        });
        xp = get().xp;
        const newLevel = levelFromXp(xp).level;
        return { award, leveledUp: newLevel > oldLevel, oldLevel, newLevel, newHigh, achievements: earned };
      },

      claimMission: (id) => {
        get().rollPeriods();
        const st = get();
        const m = MISSIONS.find((x) => x.id === id);
        if (!m) return { ok: false, message: 'Unknown mission' };
        const period = m.period === 'daily' ? st.daily : st.weekly;
        const claimKey = `${period.key}:${m.id}`;
        if (st.claimed.includes(claimKey)) return { ok: false, message: 'Reward already claimed' };
        if (period.c[m.stat] < m.target) return { ok: false, message: 'Mission not complete yet' };
        const oldLevel = levelFromXp(st.xp).level;
        const xp = st.xp + m.reward.xp;
        let coins = st.coins + m.reward.coins;
        const nl = levelFromXp(xp).level;
        for (let l = oldLevel + 1; l <= nl; l++) coins += LEVEL_COIN_BONUS[l] ?? 0;
        // Keep the claimed list small: drop keys from old periods.
        const keep = st.claimed.filter((k) => k.startsWith(st.daily.key) || k.startsWith(st.weekly.key));
        set({ xp, coins, claimed: [...keep, claimKey] });
        return { ok: true, message: `+${m.reward.coins} coins, +${m.reward.xp} XP` };
      },

      buyCharacter: (id) => {
        const st = get();
        const c = CHARACTERS.find((x) => x.id === id);
        if (!c || !c.unlock.price) return { ok: false, message: 'Not purchasable' };
        if (isCharacterUnlocked(st, id)) return { ok: false, message: 'Already unlocked' };
        if (st.coins < c.unlock.price) return { ok: false, message: 'Not enough coins' };
        set({ coins: st.coins - c.unlock.price, owned: { ...st.owned, characters: [...st.owned.characters, id] } });
        return { ok: true, message: `${c.name} unlocked` };
      },
      buySkin: (id) => {
        const st = get();
        const s = SKINS.find((x) => x.id === id);
        if (!s) return { ok: false, message: 'Unknown skin' };
        if (st.owned.skins.includes(id)) return { ok: false, message: 'Already owned' };
        if (st.coins < s.price) return { ok: false, message: 'Not enough coins' };
        set({ coins: st.coins - s.price, owned: { ...st.owned, skins: [...st.owned.skins, id] } });
        return { ok: true, message: `${s.name} added to inventory` };
      },
      buyTrail: (id) => {
        const st = get();
        const t = TRAILS.find((x) => x.id === id);
        if (!t) return { ok: false, message: 'Unknown trail' };
        if (isTrailUnlocked(st, id)) return { ok: false, message: 'Already unlocked' };
        if (t.level) return { ok: false, message: `Unlocks at level ${t.level}` };
        if (st.coins < t.price) return { ok: false, message: 'Not enough coins' };
        set({ coins: st.coins - t.price, owned: { ...st.owned, trails: [...st.owned.trails, id] } });
        return { ok: true, message: `${t.name} unlocked` };
      },
      equipCharacter: (id) => { if (isCharacterUnlocked(get(), id)) set({ equipped: { ...get().equipped, character: id } }); },
      equipSkin: (id) => { if (get().owned.skins.includes(id)) set({ equipped: { ...get().equipped, skin: id } }); },
      equipTrail: (id) => { if (isTrailUnlocked(get(), id)) set({ equipped: { ...get().equipped, trail: id } }); },
      resetProgress: () => set({ ...defaults() }),
    }),
    {
      name: 'degen-arena-player-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { setUsername, setMap, setSettings, rollPeriods, applyRound, claimMission, buyCharacter, buySkin, buyTrail, equipCharacter, equipSkin, equipTrail, resetProgress, ...data } = s;
        return data;
      },
    },
  ),
);

/** Small toast queue for notifications across the app. */
interface Toast { id: number; title: string; body?: string; tone: 'good' | 'bad' | 'info' }
interface ToastState { toasts: Toast[]; push: (t: Omit<Toast, 'id'>) => void; drop: (id: number) => void }
let tid = 1;
export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = tid++;
    set({ toasts: [...get().toasts, { ...t, id }].slice(-4) });
    setTimeout(() => get().drop(id), 3200);
  },
  drop: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));
