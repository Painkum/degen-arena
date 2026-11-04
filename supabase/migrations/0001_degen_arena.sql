-- DEGEN ARENA database schema (Supabase / Postgres)
-- Clients can READ their own data and public leaderboards, but cannot write scores,
-- XP or coins directly. All writes go through the `submit-score` edge function,
-- which runs with the service role and re-validates every round.

create table if not exists public.players (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (char_length(username) between 2 and 18),
  avatar text not null default 'rookie',
  wallet_address text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.player_progress (
  player_id uuid primary key references public.players (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1,
  coins integer not null default 100 check (coins >= 0), -- virtual arena coins, not crypto
  games_played integer not null default 0,
  best_score integer not null default 0,
  total_coins integer not null default 0,
  total_rare integer not null default 0,
  total_crystals integer not null default 0,
  total_dashes integer not null default 0,
  play_seconds integer not null default 0,
  streak_count integer not null default 0,
  streak_last_day date,
  updated_at timestamptz not null default now()
);

create table if not exists public.game_scores (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players (id) on delete cascade,
  score integer not null,
  normal_coins integer not null,
  rare_coins integer not null,
  crystals integer not null,
  dashes integer not null,
  survival_time real not null,
  survived boolean not null,
  character_id text not null,
  xp_awarded integer not null,
  coins_awarded integer not null,
  created_at timestamptz not null default now()
);
create index if not exists game_scores_player_idx on public.game_scores (player_id, created_at desc);
create index if not exists game_scores_week_idx on public.game_scores (created_at, score desc);

create table if not exists public.mission_progress (
  player_id uuid not null references public.players (id) on delete cascade,
  period_key text not null,          -- e.g. 2026-11-04 or 2026-W45
  stat text not null,                -- coins | rounds | bestSurvival | bestScore | rareCoins | playSeconds
  value integer not null default 0,
  primary key (player_id, period_key, stat)
);

create table if not exists public.mission_claims (
  player_id uuid not null references public.players (id) on delete cascade,
  period_key text not null,
  mission_id text not null,
  claimed_at timestamptz not null default now(),
  primary key (player_id, period_key, mission_id) -- prevents double claims
);

create table if not exists public.inventory (
  player_id uuid not null references public.players (id) on delete cascade,
  item_kind text not null check (item_kind in ('character', 'skin', 'trail', 'collectible')),
  item_id text not null,
  source text not null default 'purchase' check (source in ('purchase', 'level', 'nft', 'reward')),
  acquired_at timestamptz not null default now(),
  primary key (player_id, item_kind, item_id)
);

create table if not exists public.achievements (
  player_id uuid not null references public.players (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

-- Future: verified NFT ownership snapshots (filled by a server job that reads Base, never by the client)
create table if not exists public.nft_ownership (
  player_id uuid not null references public.players (id) on delete cascade,
  contract_address text not null,
  token_id text,
  grants_kind text not null,
  grants_id text not null,
  verified_at timestamptz not null default now(),
  primary key (player_id, contract_address, grants_id)
);

-- Row level security: read-only for clients
alter table public.players enable row level security;
alter table public.player_progress enable row level security;
alter table public.game_scores enable row level security;
alter table public.mission_progress enable row level security;
alter table public.mission_claims enable row level security;
alter table public.inventory enable row level security;
alter table public.achievements enable row level security;
alter table public.nft_ownership enable row level security;

create policy "players are public" on public.players for select using (true);
create policy "own progress" on public.player_progress for select using (auth.uid() = player_id);
create policy "own scores" on public.game_scores for select using (auth.uid() = player_id);
create policy "own missions" on public.mission_progress for select using (auth.uid() = player_id);
create policy "own claims" on public.mission_claims for select using (auth.uid() = player_id);
create policy "own inventory" on public.inventory for select using (auth.uid() = player_id);
create policy "own achievements" on public.achievements for select using (auth.uid() = player_id);
create policy "own nfts" on public.nft_ownership for select using (auth.uid() = player_id);
-- No insert/update/delete policies: only the service role (edge function) can write.

-- Public leaderboards
create or replace view public.leaderboard_alltime as
  select p.id as player_id, p.username, p.avatar, pp.level, pp.xp, pp.best_score, pp.games_played as games
  from public.players p join public.player_progress pp on pp.player_id = p.id
  where pp.games_played > 0
  order by pp.best_score desc, pp.xp desc
  limit 50;

create or replace view public.leaderboard_weekly as
  select p.id as player_id, p.username, p.avatar, pp.level,
         sum(gs.xp_awarded)::int as xp, max(gs.score) as best_score, count(*)::int as games
  from public.game_scores gs
  join public.players p on p.id = gs.player_id
  join public.player_progress pp on pp.player_id = p.id
  where gs.created_at >= date_trunc('week', now())
  group by p.id, p.username, p.avatar, pp.level
  order by best_score desc, xp desc
  limit 50;

grant select on public.leaderboard_alltime, public.leaderboard_weekly to anon, authenticated;
