export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';
export type CharacterId = 'rookie' | 'warrior' | 'assassin' | 'reaper' | 'guardian';

export interface Palette {
  armor: string; // main armor plates
  suit: string; // under-suit
  accent: string; // glowing trims
  visor: string; // eyes / visor glow
  hair?: string;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  rarity: Rarity;
  lore: string;
  palette: Palette;
  /** 1..5. Shown in UI and lightly applied in game. */
  stats: { speed: number; dash: number; armor: number };
  unlock: { level?: number; price?: number; nftOnly?: boolean };
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'rookie', name: 'Shadow Ninja', title: 'Silent, swift, slightly degen', rarity: 'Common',
    lore: 'Deep-blue hood, red face mask, a katana at the hip and nunchaku in hand. Every legend starts in the shadows.',
    palette: { armor: '#3d4f9a', suit: '#2b3670', accent: '#c0392b', visor: '#4aa8ff' },
    stats: { speed: 3, dash: 3, armor: 3 }, unlock: { level: 1 },
  },
  {
    id: 'warrior', name: 'Oni Samurai', title: 'Demon steel, burning blade', rarity: 'Rare',
    lore: 'Lacquered red armor with gold trim, oni horns and a glowing crimson katana. Shrugs off hits.',
    palette: { armor: '#a3161c', suit: '#2a1212', accent: '#d9a520', visor: '#ff3030' },
    stats: { speed: 2, dash: 3, armor: 5 }, unlock: { level: 3, price: 600 },
  },
  {
    id: 'assassin', name: 'Sky Ronin', title: 'Small blade, big attitude', rarity: 'Epic',
    lore: 'Sky-blue topknot, a dark haori with gold flecks and twin katanas strapped to the back. Fastest dash in the arena.',
    palette: { armor: '#86cdea', suit: '#1e2346', accent: '#f0b232', visor: '#6b4a2b', hair: '#7fd3f5' },
    stats: { speed: 5, dash: 5, armor: 2 }, unlock: { level: 5, price: 1500 },
  },
  {
    id: 'reaper', name: 'Shadow Shogun', title: 'Commander of the night', rarity: 'Legendary',
    lore: 'Black lacquer armor, a crescent-crested helmet and a war mask with violet eyes. Reserved for Arena Masters.',
    palette: { armor: '#1f1c30', suit: '#0d0b16', accent: '#9b6bff', visor: '#c58bff' },
    stats: { speed: 4, dash: 4, armor: 4 }, unlock: { level: 8 },
  },
  {
    id: 'guardian', name: 'Base Guardian', title: 'On-chain exclusive', rarity: 'Legendary',
    lore: 'Planned NFT ninja monk. It will unlock only after verified on-chain ownership on Base.',
    palette: { armor: '#2156d9', suit: '#0f1f52', accent: '#f1f5f9', visor: '#2b6cff' },
    stats: { speed: 4, dash: 4, armor: 4 }, unlock: { nftOnly: true },
  },
];

export const charById = (id: CharacterId) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

export const RARITY_COLOR: Record<Rarity, string> = {
  Common: '#94a3b8', Rare: '#39ff88', Epic: '#a855f7', Legendary: '#fbbf24',
};

export interface SkinDef { id: string; name: string; price: number; palette: Partial<Palette>; rarity: Rarity }
export const SKINS: SkinDef[] = [
  { id: 'default', name: 'Original Colors', price: 0, palette: {}, rarity: 'Common' },
  { id: 'toxic', name: 'Jade Clan', price: 250, palette: { armor: '#2f7a45', accent: '#39ff88' }, rarity: 'Rare' },
  { id: 'gold', name: 'Golden Shogunate', price: 600, palette: { armor: '#c99a1e', suit: '#3a2a08', accent: '#fff1a8' }, rarity: 'Epic' },
  { id: 'glitch', name: 'Neon Phantom', price: 1200, palette: { armor: '#6d28d9', suit: '#1e0b3a', accent: '#22d3ee', visor: '#ff3ea5' }, rarity: 'Legendary' },
];

export interface TrailDef { id: string; name: string; color: string; price: number; level?: number }
export const TRAILS: TrailDef[] = [
  { id: 'violet', name: 'Violet Wake', color: '#a855f7', price: 0 },
  { id: 'lime', name: 'Lime Surge', color: '#39ff88', price: 200 },
  { id: 'plasma', name: 'Plasma Pink', color: '#ff3ea5', price: 0, level: 4 },
  { id: 'solar', name: 'Solar Flare', color: '#fbbf24', price: 0, level: 7 },
];

export function resolvePalette(c: CharacterDef, skinId: string): Palette {
  const skin = SKINS.find((s) => s.id === skinId);
  return { ...c.palette, ...(skin?.palette ?? {}) };
}
