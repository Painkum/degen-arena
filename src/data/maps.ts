export type MapId = 'station' | 'grove' | 'harbor';

export interface MapDef {
  id: MapId;
  name: string;
  tagline: string;
  desc: string;
  /** Two colors used for the selection card art. */
  colors: [string, string];
}

export const MAPS: MapDef[] = [
  {
    id: 'station', name: 'Nebula Station', tagline: 'Floating dojo above a purple nebula',
    desc: 'A sky-high station deck with blue rails, a crystal core firing a golden beam, loop tracks and a giant moon.',
    colors: ['#7c3aed', '#f08c2e'],
  },
  {
    id: 'grove', name: 'Crystal Grove', tagline: 'Mushroom isle under a starry sky',
    desc: 'An ancient floating island ringed by giant glowing mushrooms, pink crystals and waterfalls pouring into the void.',
    colors: ['#0f766e', '#ff6ad5'],
  },
  {
    id: 'harbor', name: 'Cosmic Harbor', tagline: 'Space dock on a galaxy sea',
    desc: 'A docking platform floating on a sea of liquid galaxy, between moored starships, ring gates and hologram pods.',
    colors: ['#a21caf', '#22d3ee'],
  },
];

export const mapById = (id: MapId) => MAPS.find((m) => m.id === id) ?? MAPS[0];
