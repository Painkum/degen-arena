// NFT ownership architecture for future on-chain characters, skins and badges on Base.
// Nothing here pretends a player owns anything: ownership is only granted after a real
// on-chain balanceOf read returns > 0 for a configured collection.
import type { Eip1193Provider } from './wallet';

export interface NftCollection {
  /** Game item unlocked by owning a token from this collection */
  grants: { kind: 'character' | 'skin' | 'badge'; id: string };
  name: string;
  address: `0x${string}`;
  standard: 'erc721' | 'erc1155';
  tokenId?: bigint; // required for erc1155
}

/**
 * Collections live here once contracts are deployed on Base.
 * Empty in v1: no NFTs exist yet, so nothing can be "owned".
 */
export const NFT_COLLECTIONS: NftCollection[] = [];

const pad = (hex: string) => hex.replace(/^0x/, '').padStart(64, '0');

async function balanceOf(p: Eip1193Provider, c: NftCollection, owner: string): Promise<bigint> {
  // erc721 balanceOf(address) = 0x70a08231 ; erc1155 balanceOf(address,uint256) = 0x00fdd58e
  const data = c.standard === 'erc721'
    ? '0x70a08231' + pad(owner)
    : '0x00fdd58e' + pad(owner) + pad((c.tokenId ?? 0n).toString(16));
  const res = (await p.request({ method: 'eth_call', params: [{ to: c.address, data }, 'latest'] })) as string;
  return BigInt(res && res !== '0x' ? res : '0x0');
}

/** Returns ids of game items whose ownership was verified on-chain. */
export async function verifyOwnedItems(p: Eip1193Provider, owner: string): Promise<NftCollection['grants'][]> {
  const out: NftCollection['grants'][] = [];
  for (const c of NFT_COLLECTIONS) {
    try {
      if ((await balanceOf(p, c, owner)) > 0n) out.push(c.grants);
    } catch (e) {
      console.warn('[nft] ownership check failed for', c.name, e);
    }
  }
  return out;
}
