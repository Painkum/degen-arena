import { useEffect, useState } from 'react';
import { Logo, Portrait } from './Art';
import { usePlayer } from '../store/playerStore';
import { levelFromXp } from '../data/levels';
import { useWallet, shortAddress } from '../web3/wallet';
import { BACKEND_MODE } from '../services/backend';
import { sound } from '../audio/sound';
import { HomeSection } from './sections/Home';
import { PlaySection } from './sections/Play';
import { CharactersSection } from './sections/Characters';
import { InventorySection } from './sections/Inventory';
import { MissionsSection } from './sections/Missions';
import { LeaderboardSection } from './sections/Leaderboard';
import { ProfileSection } from './sections/Profile';
import { WalletSection } from './sections/Wallet';
import { MISSIONS } from '../data/missions';

export type Tab = 'home' | 'play' | 'characters' | 'inventory' | 'missions' | 'leaderboard' | 'profile' | 'wallet';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'M3 11 12 3l9 8v10h-6v-6H9v6H3Z' },
  { id: 'play', label: 'Play Arena', icon: 'M7 4v16l13-8Z' },
  { id: 'characters', label: 'Characters', icon: 'M12 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm-8 18c0-4 4-7 8-7s8 3 8 7Z' },
  { id: 'inventory', label: 'Inventory', icon: 'M4 7h16v13H4Zm4-4h8v4H8Z' },
  { id: 'missions', label: 'Missions', icon: 'M5 3h14v18l-7-4-7 4Z' },
  { id: 'leaderboard', label: 'Leaderboard', icon: 'M4 21V11h4v10Zm6 0V4h4v17Zm6 0v-7h4v7Z' },
  { id: 'profile', label: 'Profile', icon: 'M4 4h16v16H4Zm4 4v2h8V8Zm0 4v2h8v-2Zm0 4v2h5v-2Z' },
  { id: 'wallet', label: 'Wallet', icon: 'M3 7h18v13H3Zm2-4h12v4H5Zm11 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z' },
];

function Icon({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d={d} /></svg>;
}

export function Dashboard({ tab, setTab, onPlay }: { tab: Tab; setTab: (t: Tab) => void; onPlay: () => void }) {
  const p = usePlayer();
  const lvl = levelFromXp(p.xp);
  const wallet = useWallet();
  const [mounted, setMounted] = useState(0);
  useEffect(() => { setMounted((m) => m + 1); window.scrollTo({ top: 0 }); }, [tab]);
  const go = (t: Tab) => { sound.play('click'); setTab(t); };

  const claimable = MISSIONS.filter((m) => {
    const per = m.period === 'daily' ? p.daily : p.weekly;
    return per.c[m.stat] >= m.target && !p.claimed.includes(`${per.key}:${m.id}`);
  }).length;

  return (
    <div className="min-h-full pb-24 lg:pb-0 lg:pl-60">
      {/* sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-neon-purple/20 bg-black/40 p-4 backdrop-blur lg:flex">
        <Logo compact />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left font-display text-xs font-bold tracking-[0.15em] transition ${
                tab === n.id ? 'bg-neon-purple/20 text-white shadow-neon' : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon d={n.icon} className={`h-4 w-4 ${tab === n.id ? 'text-neon-green' : ''}`} />
              {n.label.toUpperCase()}
              {n.id === 'missions' && claimable > 0 && <span className="ml-auto rounded-full bg-neon-green px-1.5 text-[10px] text-black">{claimable}</span>}
            </button>
          ))}
        </nav>
        <button className="btn-primary w-full" onClick={onPlay}>PLAY NOW</button>
        <div className="mt-3 text-center text-[10px] tracking-widest text-white/35">
          {BACKEND_MODE === 'demo' ? 'LOCAL DEMO MODE' : 'SUPABASE CONNECTED'} · v0.1
        </div>
      </aside>

      {/* top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-neon-purple/15 bg-void/80 px-4 py-3 backdrop-blur pt-[max(12px,env(safe-area-inset-top))]">
        <div className="lg:hidden"><Logo compact /></div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {BACKEND_MODE === 'demo' && <span className="chip hidden border-amber-400/50 text-amber-300 sm:inline-flex" title="No Supabase credentials configured. Progress is stored in this browser only.">LOCAL DEMO</span>}
          <div className="flex items-center gap-1.5 rounded-lg border border-neon-green/30 bg-neon-green/5 px-2.5 py-1.5" title="Virtual arena coins (not cryptocurrency)">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-neon-green text-[9px] font-black text-black">Ð</span>
            <span className="font-display text-sm font-bold tabular-nums">{p.coins.toLocaleString()}</span>
          </div>
          <button onClick={() => go('wallet')} className={`hidden rounded-lg border px-3 py-1.5 font-display text-[10px] tracking-widest sm:block ${wallet.address ? 'border-neon-green/40 text-neon-green' : 'border-white/20 text-white/70 hover:border-neon-purple'}`}>
            {wallet.address ? shortAddress(wallet.address) : 'CONNECT WALLET'}
          </button>
          <button onClick={() => go('profile')} className="flex items-center gap-2 rounded-lg border border-neon-purple/30 bg-white/5 p-1 pr-3">
            <span className="overflow-hidden rounded-md"><Portrait id={p.equipped.character} size={30} /></span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-bold">{p.username}</span>
              <span className="block text-[10px] font-semibold text-neon-purple">LV {lvl.level} · {lvl.title}</span>
            </span>
          </button>
        </div>
      </header>

      <main key={mounted} className="mx-auto max-w-6xl animate-rise p-4 sm:p-6">
        {tab === 'home' && <HomeSection onPlay={onPlay} go={go} />}
        {tab === 'play' && <PlaySection onPlay={onPlay} />}
        {tab === 'characters' && <CharactersSection />}
        {tab === 'inventory' && <InventorySection />}
        {tab === 'missions' && <MissionsSection />}
        {tab === 'leaderboard' && <LeaderboardSection />}
        {tab === 'profile' && <ProfileSection />}
        {tab === 'wallet' && <WalletSection />}
      </main>

      {/* bottom nav (mobile/tablet) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neon-purple/20 bg-black/80 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="flex overflow-x-auto">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className={`relative flex min-w-[64px] flex-1 flex-col items-center gap-1 px-1 py-2 text-[9px] font-bold tracking-wider ${tab === n.id ? 'text-neon-green' : 'text-white/50'}`}
            >
              <Icon d={n.icon} className="h-5 w-5" />
              {n.label.split(' ')[0].toUpperCase()}
              {n.id === 'missions' && claimable > 0 && <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-neon-green" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
