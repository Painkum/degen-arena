// Backend gateway. Uses Supabase when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set,
// otherwise runs in LOCAL DEMO MODE (progress only lives in this browser's storage).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { validateRound, type RoundAward, type RoundStats } from '../lib/rules';
import { demoPlayers, type LeaderRow } from '../data/demoLeaderboard';
import type { CharacterId } from '../data/characters';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const BACKEND_MODE: 'supabase' | 'demo' = url && key ? 'supabase' : 'demo';
let client: SupabaseClient | null = null;

function sb() {
  if (!client && url && key) client = createClient(url, key);
  return client;
}

async function ensureSession(username: string) {
  const c = sb()!;
  const { data } = await c.auth.getSession();
  if (data.session) return data.session;
  // Anonymous sign-in must be enabled in Supabase Auth settings.
  const res = await c.auth.signInAnonymously({ options: { data: { username } } });
  if (res.error) throw res.error;
  return res.data.session!;
}

/**
 * Submit a finished round. In Supabase mode the edge function re-validates the round and
 * awards XP/coins server-side; the client only mirrors the server's answer.
 */
export async function submitRound(stats: RoundStats, username: string): Promise<RoundAward & { source: 'server' | 'local' }> {
  if (BACKEND_MODE === 'supabase') {
    try {
      await ensureSession(username);
      const { data, error } = await sb()!.functions.invoke('submit-score', { body: { action: 'submit', stats, username } });
      if (error) throw error;
      return { ...(data as RoundAward), source: 'server' };
    } catch (e) {
      console.warn('[backend] submit failed, falling back to local validation', e);
    }
  }
  return { ...validateRound(stats), source: 'local' };
}

export async function fetchLeaderboard(kind: 'weekly' | 'alltime'): Promise<{ rows: LeaderRow[]; demo: boolean }> {
  if (BACKEND_MODE === 'supabase') {
    try {
      const view = kind === 'weekly' ? 'leaderboard_weekly' : 'leaderboard_alltime';
      const { data, error } = await sb()!.from(view).select('*').limit(50);
      if (error) throw error;
      if (data && data.length > 0) {
        return {
          demo: false,
          rows: data.map((r: Record<string, unknown>) => ({
            id: String(r.player_id), username: String(r.username), avatar: (r.avatar as CharacterId) ?? 'rookie',
            level: Number(r.level), xp: Number(r.xp), bestScore: Number(r.best_score), games: Number(r.games), isDemo: false,
          })),
        };
      }
    } catch (e) {
      console.warn('[backend] leaderboard fetch failed, showing demo data', e);
    }
  }
  return { rows: demoPlayers(kind), demo: true };
}
