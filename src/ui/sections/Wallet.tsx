import { useEffect, useState } from 'react';
import { useWallet, shortAddress, BASE_CHAIN } from '../../web3/wallet';
import { NFT_COLLECTIONS, verifyOwnedItems } from '../../web3/nft';
import { sound } from '../../audio/sound';

export function WalletSection() {
  const w = useWallet();
  const [owned, setOwned] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (w.status !== 'connected' || !w.provider || !w.address) { setOwned(null); return; }
    verifyOwnedItems(w.provider, w.address).then((g) => setOwned(g.map((x) => `${x.kind}:${x.id}`)));
  }, [w.status, w.provider, w.address]);

  const statusText = {
    disconnected: 'Not connected',
    connecting: 'Waiting for wallet…',
    connected: 'Connected to Base',
    'wrong-network': 'Connected · wrong network',
    error: 'Connection failed',
  }[w.status];
  const statusColor = w.status === 'connected' ? 'bg-neon-green' : w.status === 'wrong-network' ? 'bg-amber-400' : w.status === 'error' ? 'bg-rose-500' : w.status === 'connecting' ? 'bg-neon-purple animate-pulse' : 'bg-white/30';

  return (
    <div className="space-y-6">
      <h1 className="section-title">WALLET</h1>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel-glow p-6">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${statusColor}`} />
            <span className="font-display text-sm font-bold tracking-widest">{statusText.toUpperCase()}</span>
            <span className="chip ml-auto border-blue-400/50 text-blue-300">BASE · CHAIN 8453</span>
          </div>

          {w.address ? (
            <div className="mt-5 rounded-lg border border-white/10 bg-black/40 p-4">
              <div className="text-[10px] font-bold tracking-[0.25em] text-white/45">ADDRESS · {w.walletName}</div>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-display text-xl font-bold">{shortAddress(w.address)}</span>
                <button
                  className="text-xs text-neon-green underline"
                  onClick={() => { navigator.clipboard?.writeText(w.address!).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }).catch(() => {}); }}
                >
                  {copied ? 'copied' : 'copy'}
                </button>
                <a className="text-xs text-white/50 underline" href={`${BASE_CHAIN.blockExplorerUrls[0]}/address/${w.address}`} target="_blank" rel="noreferrer">basescan</a>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-white/65">
              Connecting a wallet is optional. DEGEN ARENA is fully playable without one. Your wallet will later be used to verify ownership of NFT characters, skins and badges on Base.
            </p>
          )}

          {w.error && <div className="mt-4 rounded-lg border border-rose-500/50 bg-rose-500/10 p-3 text-sm text-rose-200">{w.error}</div>}

          <div className="mt-6 flex flex-wrap gap-3">
            {!w.address && (
              w.wallets.length > 1 ? (
                w.wallets.map((d) => (
                  <button key={d.info.uuid} className="btn-primary" disabled={w.status === 'connecting'} onClick={() => { sound.play('click'); w.connect(d); }}>
                    {d.info.icon && <img src={d.info.icon} alt="" className="mr-2 h-5 w-5 rounded" />}
                    {d.info.name.toUpperCase()}
                  </button>
                ))
              ) : (
                <button className="btn-primary" disabled={w.status === 'connecting'} onClick={() => { sound.play('click'); w.connect(); }}>
                  {w.status === 'connecting' ? 'CONNECTING…' : 'CONNECT WALLET'}
                </button>
              )
            )}
            {w.status === 'wrong-network' && <button className="btn-purple" onClick={() => w.switchToBase()}>SWITCH TO BASE</button>}
            {w.address && <button className="btn-ghost" onClick={() => { sound.play('click'); w.disconnect(); }}>DISCONNECT</button>}
          </div>
          <p className="mt-4 text-xs text-white/40">
            DEGEN ARENA never asks you to sign transactions or send funds. There is no token. Arena coins (Ð) are virtual and separate from cryptocurrency.
          </p>
        </div>

        <div className="panel p-6">
          <div className="font-display text-xs tracking-[0.2em] text-white/50">ON-CHAIN ITEMS</div>
          {NFT_COLLECTIONS.length === 0 ? (
            <div className="mt-3 space-y-3 text-sm text-white/65">
              <p>No NFT collections are live yet, so no items can be owned.</p>
              <p>When collections launch on Base, the game will read your wallet's balance from the contract and unlock:</p>
              <ul className="list-inside list-disc text-white/55">
                <li>NFT characters (e.g. Base Guardian)</li>
                <li>NFT skins and cosmetics</li>
                <li>On-chain achievement badges</li>
              </ul>
            </div>
          ) : (
            <div className="mt-3 text-sm">
              {!w.address ? 'Connect a wallet to check ownership.' : owned === null ? 'Checking ownership on Base…' : owned.length ? owned.join(', ') : 'No eligible items found in this wallet.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
