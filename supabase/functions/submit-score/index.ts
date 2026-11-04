// Supabase Edge Function: validates a finished round and awards XP / virtual coins server-side.
// Deploy:  supabase functions deploy submit-score
// The validation rules mirror src/lib/rules.ts — keep them in sync.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROUND_SECONDS = 60;
const POINTS = { normal: 10, rare: 25, crystal: 50, survival: 100 };
const LEVEL_XP = [0, 150, 400, 800, 1400, 2200, 3300, 4700, 6500, 9000];
const levelFromXp = (xp: number) => LEVEL_XP.reduce((l, need, i) => (xp >= need ? i + 1 : l), 1);

interface RoundStats { normal: number; rare: number; crystals: number; survived: boolean; survivalTime: number; dashes: number; score: number; characterId: string }

function validate(s: RoundStats) {
  const bad = (reason: string) => ({ valid: false, reason, score: 0, xp: 0, coins: 0 });
  const ints = [s.normal, s.rare, s.crystals, s.dashes];
  if (ints.some((n) => !Number.isInteger(n) || n < 0)) return bad('Invalid counters');
  if (!(s.survivalTime >= 0 && s.survivalTime <= ROUND_SECONDS + 1)) return bad('Invalid survival time');
  if (s.survived && s.survivalTime < ROUND_SECONDS - 1) return bad('Survival flag mismatch');
  const pickups = s.normal + s.rare + s.crystals;
  if (pickups > s.survivalTime * 2.2 + 20) return bad('Too many pickups for round length');
  if (s.crystals > s.survivalTime / 4 + 3) return bad('Too many crystals');
  if (s.dashes > s.survivalTime * 1.5 + 2) return bad('Too many dashes');
  const score = s.normal * POINTS.normal + s.rare * POINTS.rare + s.crystals * POINTS.crystal + (s.survived ? POINTS.survival : 0);
  if (score !== s.score) return bad('Score does not match pickups');
  const xp = Math.round(score / 5) + Math.floor(s.survivalTime) + (s.survived ? 50 : 0);
  const coins = s.normal + s.rare * 3 + s.crystals * 5 + (s.survived ? 25 : 0);
  return { valid: true, score, xp, coins };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Not signed in' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const body = await req.json().catch(() => null);
  if (!body || body.action !== 'submit') return json({ error: 'Bad request' }, 400);

  // Basic rate limit: one round per 20 seconds per player (a round lasts up to ~65s incl. countdown).
  const { data: last } = await admin.from('game_scores').select('created_at').eq('player_id', user.id).order('created_at', { ascending: false }).limit(1);
  if (last?.[0] && Date.now() - new Date(last[0].created_at).getTime() < 20_000) {
    return json({ valid: false, reason: 'Rounds submitted too quickly', score: 0, xp: 0, coins: 0 });
  }

  const stats = body.stats as RoundStats;
  const award = validate(stats);
  if (!award.valid) return json(award);

  const username = String(body.username ?? 'Degen').replace(/[^\w\- .]/g, '').slice(0, 18) || 'Degen';
  await admin.from('players').upsert({ id: user.id, username, avatar: stats.characterId }, { onConflict: 'id' });

  const { data: prog } = await admin.from('player_progress').select('*').eq('player_id', user.id).maybeSingle();
  const p = prog ?? { xp: 0, coins: 100, games_played: 0, best_score: 0, total_coins: 0, total_rare: 0, total_crystals: 0, total_dashes: 0, play_seconds: 0 };
  const xp = p.xp + award.xp;
  await admin.from('player_progress').upsert({
    player_id: user.id,
    xp,
    level: levelFromXp(xp),
    coins: p.coins + award.coins,
    games_played: p.games_played + 1,
    best_score: Math.max(p.best_score, award.score),
    total_coins: p.total_coins + stats.normal + stats.rare + stats.crystals,
    total_rare: p.total_rare + stats.rare,
    total_crystals: p.total_crystals + stats.crystals,
    total_dashes: p.total_dashes + stats.dashes,
    play_seconds: p.play_seconds + Math.round(stats.survivalTime),
    updated_at: new Date().toISOString(),
  });
  await admin.from('game_scores').insert({
    player_id: user.id, score: award.score, normal_coins: stats.normal, rare_coins: stats.rare, crystals: stats.crystals,
    dashes: stats.dashes, survival_time: stats.survivalTime, survived: stats.survived, character_id: stats.characterId,
    xp_awarded: award.xp, coins_awarded: award.coins,
  });

  return json(award);
});
