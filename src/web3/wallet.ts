// Real wallet connection through EIP-1193 / EIP-6963 browser wallets (Coinbase Wallet, MetaMask, Rabby...).
// No transactions are ever sent. Connecting is optional.
import { create } from 'zustand';

export const BASE_CHAIN = {
  chainId: '0x2105', // 8453
  chainName: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (ev: string, cb: (...a: unknown[]) => void) => void;
  removeListener?: (ev: string, cb: (...a: unknown[]) => void) => void;
}
interface ProviderInfo { uuid: string; name: string; icon: string; rdns: string }
export interface DiscoveredWallet { info: ProviderInfo; provider: Eip1193Provider }

type Status = 'disconnected' | 'connecting' | 'connected' | 'wrong-network' | 'error';

interface WalletState {
  status: Status;
  address: string | null;
  chainId: string | null;
  error: string | null;
  wallets: DiscoveredWallet[];
  provider: Eip1193Provider | null;
  walletName: string | null;
  connect: (w?: DiscoveredWallet) => Promise<void>;
  switchToBase: () => Promise<void>;
  disconnect: () => void;
}

export const shortAddress = (a: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

function errMessage(e: unknown) {
  const code = (e as { code?: number })?.code;
  if (code === 4001) return 'Request rejected in wallet.';
  if (code === -32002) return 'A wallet request is already pending. Open your wallet.';
  return (e as { message?: string })?.message ?? 'Wallet error';
}

export const useWallet = create<WalletState>((set, get) => {
  const onAccounts = (...a: unknown[]) => {
    const accts = a[0] as string[];
    if (!accts || accts.length === 0) get().disconnect();
    else set({ address: accts[0] });
  };
  const onChain = (...a: unknown[]) => {
    const id = String(a[0]).toLowerCase();
    set({ chainId: id, status: id === BASE_CHAIN.chainId ? 'connected' : 'wrong-network' });
  };

  return {
    status: 'disconnected', address: null, chainId: null, error: null, wallets: [], provider: null, walletName: null,

    connect: async (w) => {
      const injected = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
      const provider = w?.provider ?? get().wallets[0]?.provider ?? injected;
      if (!provider) {
        set({ status: 'error', error: 'No wallet found. Install Coinbase Wallet or MetaMask, or keep playing without one.' });
        return;
      }
      set({ status: 'connecting', error: null });
      try {
        const accts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
        const chainId = String(await provider.request({ method: 'eth_chainId' })).toLowerCase();
        provider.on?.('accountsChanged', onAccounts);
        provider.on?.('chainChanged', onChain);
        set({
          provider, address: accts[0] ?? null, chainId,
          walletName: w?.info.name ?? get().wallets[0]?.info.name ?? 'Browser wallet',
          status: chainId === BASE_CHAIN.chainId ? 'connected' : 'wrong-network',
        });
        if (chainId !== BASE_CHAIN.chainId) await get().switchToBase();
      } catch (e) {
        set({ status: 'error', error: errMessage(e) });
      }
    },

    switchToBase: async () => {
      const p = get().provider;
      if (!p) return;
      try {
        await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BASE_CHAIN.chainId }] });
      } catch (e) {
        if ((e as { code?: number })?.code === 4902) {
          try {
            await p.request({ method: 'wallet_addEthereumChain', params: [BASE_CHAIN] });
          } catch (e2) {
            set({ error: errMessage(e2) });
          }
        } else set({ error: errMessage(e) });
      }
    },

    disconnect: () => {
      const p = get().provider;
      p?.removeListener?.('accountsChanged', onAccounts);
      p?.removeListener?.('chainChanged', onChain);
      // Some wallets support revoking the site permission; ignore if not.
      p?.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }).catch(() => {});
      set({ status: 'disconnected', address: null, chainId: null, provider: null, error: null, walletName: null });
    },
  };
});

// EIP-6963 multi-wallet discovery
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (ev: Event) => {
    const detail = (ev as CustomEvent<DiscoveredWallet>).detail;
    if (!detail?.info?.uuid) return;
    const list = useWallet.getState().wallets;
    if (!list.some((w) => w.info.uuid === detail.info.uuid)) useWallet.setState({ wallets: [...list, detail] });
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}
