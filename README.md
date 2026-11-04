# DEGEN ARENA

**Enter the arena. Fight for glory. Claim your rank.**

A browser-based 3D arcade survival game with chibi ninja characters, built with React, TypeScript, Three.js (React Three Fiber + Drei) and Tailwind CSS. Web3-ready on Base, but no wallet is needed to play.

## Gameplay: Coin Survival
- 60-second rounds, 100 HP.
- Collect energy coins: normal **10**, rare **25**, crystal **50**, plus **100** for surviving the full round.
- Dodge rotating lasers, moving energy walls, shock pads, spinning hammers and blast zones, while AI rivals steal coins and charge at you.
- Boosters: speed, shield, coin magnet, repair. Difficulty rises every second.

### Controls
| Desktop | Mobile |
| --- | --- |
| WASD move | Left joystick |
| Space jump (press twice for double jump) | JUMP button |
| Shift / K dash | DASH button |
| Drag mouse / Q E to orbit camera, wheel to zoom | Drag to turn camera |
| Esc / P pause | Pause button |

## Features
- **3 maps:** Nebula Station, Crystal Grove, Cosmic Harbor.
- **5 characters:** Shadow Ninja, Oni Samurai, Sky Ronin, Shadow Shogun, Base Guardian (future NFT).
- Dashboard with home, play, character select, inventory (skins, dash trails, collectibles, badges), daily and weekly missions, leaderboard, profile and wallet.
- 10 levels of XP progression, achievements, daily streaks and virtual arena coins (not cryptocurrency).
- All music and sound effects are synthesized live with the Web Audio API, so there are no copyrighted assets.
- Graphics quality setting, reduced-motion support and touch controls.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:5173. Build for production with `npm run build`.

## Backend (optional): Supabase
Without credentials the game runs in a clearly labeled **local demo mode**, where progress is saved in the browser only.

To enable Supabase:
1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Run `supabase/migrations/0001_degen_arena.sql`.
3. Enable anonymous sign-ins in Supabase Auth.
4. Deploy the score validator: `supabase functions deploy submit-score`.

Clients can only read data. Scores, XP and coins are validated and written server-side.

## Web3
- Optional wallet connection (EIP-1193 / EIP-6963) on Base (chain 8453).
- No transactions, no token.
- NFT ownership is only recognized after an on-chain `balanceOf` check. Collections are configured in `src/web3/nft.ts`, and the list is empty for now.

## Deploy
Ready for Vercel: framework preset **Vite**, build command `npm run build`, output folder `dist`.
