// Procedural canvas textures (no external image downloads needed).
import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();
function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

/** Glowing arena floor: rings, hex grid, radial spokes, edge text. */
export function floorTexture() {
  return make('floor', 1024, 1024, (g) => {
    const C = 512;
    g.fillStyle = '#07050f';
    g.fillRect(0, 0, 1024, 1024);
    // hex grid
    g.strokeStyle = 'rgba(124,58,237,.22)';
    g.lineWidth = 1.5;
    const s = 26;
    for (let y = 0; y < 1024 + s; y += s * 1.5) {
      for (let x = 0; x < 1024 + s; x += s * Math.sqrt(3)) {
        const ox = (Math.round(y / (s * 1.5)) % 2) * (s * Math.sqrt(3)) / 2;
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          const px = x + ox + Math.cos(a) * s * 0.92, py = y + Math.sin(a) * s * 0.92;
          if (i) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.closePath();
        g.stroke();
      }
    }
    // radial spokes
    g.strokeStyle = 'rgba(57,255,136,.25)';
    g.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.beginPath();
      g.moveTo(C + Math.cos(a) * 90, C + Math.sin(a) * 90);
      g.lineTo(C + Math.cos(a) * 500, C + Math.sin(a) * 500);
      g.stroke();
    }
    // rings
    const ring = (r: number, color: string, w: number, blur: number) => {
      g.save();
      g.shadowColor = color;
      g.shadowBlur = blur;
      g.strokeStyle = color;
      g.lineWidth = w;
      g.beginPath();
      g.arc(C, C, r, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    };
    ring(500, '#a855f7', 10, 30);
    ring(470, '#39ff88', 3, 14);
    ring(330, '#a855f7', 5, 20);
    ring(250, '#39ff88', 2, 10);
    ring(150, '#a855f7', 6, 20);
    // dashed ring
    g.setLineDash([18, 14]);
    ring(400, 'rgba(168,85,247,.8)', 3, 8);
    g.setLineDash([]);
    // edge text
    g.save();
    g.translate(C, C);
    g.font = 'bold 26px Orbitron, sans-serif';
    g.fillStyle = 'rgba(57,255,136,.85)';
    g.textAlign = 'center';
    const txt = ' DEGEN ARENA  •  FIGHT FOR GLORY  •  CLAIM YOUR RANK  • ';
    const full = txt + txt;
    for (let i = 0; i < full.length; i++) {
      g.save();
      g.rotate((i / full.length) * Math.PI * 2);
      g.fillText(full[i], 0, -432);
      g.restore();
    }
    g.restore();
  });
}

/** City window texture for distant buildings. */
export function windowTexture() {
  return make('windows', 128, 256, (g) => {
    g.fillStyle = '#05040a';
    g.fillRect(0, 0, 128, 256);
    const colors = ['#a855f7', '#39ff88', '#22d3ee', '#ff3ea5', '#fbbf24'];
    for (let y = 4; y < 256; y += 10) {
      for (let x = 4; x < 128; x += 9) {
        if (Math.random() < 0.32) {
          g.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          g.globalAlpha = 0.4 + Math.random() * 0.6;
          g.fillRect(x, y, 5, 5);
        }
      }
    }
    g.globalAlpha = 1;
  });
}

/** Holographic billboard texture. */
export function holoTexture(text: string, sub: string, color: string) {
  return make('holo:' + text, 512, 256, (g) => {
    g.clearRect(0, 0, 512, 256);
    g.strokeStyle = color;
    g.lineWidth = 6;
    g.shadowColor = color;
    g.shadowBlur = 18;
    g.strokeRect(10, 10, 492, 236);
    g.fillStyle = color;
    g.globalAlpha = 0.12;
    g.fillRect(10, 10, 492, 236);
    g.globalAlpha = 1;
    g.font = '900 64px Orbitron, sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    g.fillText(text, 256, 125);
    g.font = '700 30px Rajdhani, sans-serif';
    g.fillStyle = color;
    g.fillText(sub, 256, 185);
    // scanlines
    g.globalAlpha = 0.18;
    g.fillStyle = '#000';
    for (let y = 0; y < 256; y += 4) g.fillRect(0, y, 512, 2);
    g.globalAlpha = 1;
  });
}

/** Soft round blob shadow. */
export function blobTexture() {
  return make('blob', 64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(0,0,0,.75)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  });
}

/** Radial ring texture used for danger zones and traps. */
export function ringTexture(color: string) {
  return make('ring:' + color, 256, 256, (g) => {
    const grd = g.createRadialGradient(128, 128, 20, 128, 128, 128);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(0.75, color + '55');
    grd.addColorStop(0.92, color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = color;
    g.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath();
      g.moveTo(128 + Math.cos(a) * 60, 128 + Math.sin(a) * 60);
      g.lineTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100);
      g.stroke();
    }
  });
}

/** Light space-station deck: panel seams, blue/orange lane rings, green shield pads. */
export function deckTexture() {
  return make('deck', 1024, 1024, (g) => {
    const C = 512;
    g.fillStyle = '#c9c3e3';
    g.fillRect(0, 0, 1024, 1024);
    // inner darker zone
    g.fillStyle = '#b4add3';
    g.beginPath(); g.arc(C, C, 330, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c9c3e3';
    g.beginPath(); g.arc(C, C, 250, 0, Math.PI * 2); g.fill();
    // panel seams: radial + rings
    g.strokeStyle = 'rgba(70,62,110,.45)';
    g.lineWidth = 2;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      g.beginPath();
      g.moveTo(C + Math.cos(a) * 140, C + Math.sin(a) * 140);
      g.lineTo(C + Math.cos(a) * 505, C + Math.sin(a) * 505);
      g.stroke();
    }
    for (const r of [140, 200, 250, 330, 380, 430]) { g.beginPath(); g.arc(C, C, r, 0, Math.PI * 2); g.stroke(); }
    // lane rings
    const ring = (r: number, color: string, w: number) => { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.arc(C, C, r, 0, Math.PI * 2); g.stroke(); };
    ring(492, '#2f4fd1', 22);
    ring(474, '#f08c2e', 6);
    ring(330, '#2f4fd1', 8);
    ring(250, '#f08c2e', 5);
    ring(140, '#e2483d', 14);
    // dark grip strips
    g.fillStyle = 'rgba(40,36,64,.55)';
    for (let i = 0; i < 16; i++) {
      g.save(); g.translate(C, C); g.rotate((i / 16) * Math.PI * 2 + 0.1);
      g.fillRect(345, -6, 26, 12);
      g.restore();
    }
    // cyan glass windows
    for (let i = 0; i < 8; i++) {
      g.save(); g.translate(C, C); g.rotate((i / 8) * Math.PI * 2 + Math.PI / 8);
      g.fillStyle = '#20365f'; g.fillRect(392, -22, 34, 44);
      g.fillStyle = '#5fd0ff'; g.globalAlpha = 0.85; g.fillRect(396, -18, 26, 36); g.globalAlpha = 1;
      g.restore();
    }
    // green shield pads
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = C + Math.cos(a) * 290, y = C + Math.sin(a) * 290;
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 22, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#3a3360'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#2bd66b';
      g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + 10, y - 7); g.lineTo(x + 9, y + 4); g.lineTo(x, y + 12); g.lineTo(x - 9, y + 4); g.lineTo(x - 10, y - 7); g.closePath(); g.fill();
    }
    // name
    g.save(); g.translate(C, C);
    g.font = 'bold 22px Orbitron, sans-serif'; g.fillStyle = 'rgba(47,79,209,.85)'; g.textAlign = 'center';
    const txt = ' DEGEN ARENA  ✦  ENTER THE DOJO  ✦  CLAIM YOUR RANK  ✦ ';
    const full = txt + txt;
    for (let i = 0; i < full.length; i++) { g.save(); g.rotate((i / full.length) * Math.PI * 2); g.fillText(full[i], 0, -446); g.restore(); }
    g.restore();
    // subtle grime
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(60,50,100,${Math.random() * 0.05})`; g.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2); }
  });
}

/** Marbled blue-white moon. */
export function moonTexture() {
  return make('moon', 512, 256, (g) => {
    g.fillStyle = '#e6eeff';
    g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * 512, y = Math.random() * 256, r = 4 + Math.random() * 26;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      const c = Math.random() < 0.5 ? '74,120,200' : '120,164,232';
      grd.addColorStop(0, `rgba(${c},.55)`);
      grd.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

/** Vertical water streaks for the waterfall (scrolled each frame). */
export function waterTexture() {
  const t = make('water', 64, 256, (g) => {
    g.fillStyle = '#2f6fe0';
    g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(200,235,255,${0.25 + Math.random() * 0.5})`;
      g.fillRect(Math.random() * 64, Math.random() * 256, 2 + Math.random() * 3, 20 + Math.random() * 50);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Mossy stone dojo floor for Crystal Grove. */
export function groveTexture() {
  return make('grove', 1024, 1024, (g) => {
    const C = 512;
    g.fillStyle = '#4a7f3a';
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(30,70,25,.35)' : 'rgba(120,180,80,.25)';
      g.fillRect(Math.random() * 1024, Math.random() * 1024, 3, 5);
    }
    // stone rings made of tiles
    const tiles = (r1: number, r2: number, n: number, color: string) => {
      for (let i = 0; i < n; i++) {
        const a1 = (i / n) * Math.PI * 2 + 0.01, a2 = ((i + 1) / n) * Math.PI * 2 - 0.01;
        g.fillStyle = color;
        g.beginPath(); g.arc(C, C, r2, a1, a2); g.arc(C, C, r1, a2, a1, true); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(30,20,30,.5)'; g.lineWidth = 3; g.stroke();
      }
    };
    tiles(440, 500, 48, '#7d6a78');
    tiles(250, 320, 32, '#8a7686');
    tiles(0, 120, 8, '#6f5d6c');
    // glowing rune circles
    const ring = (r: number, color: string, w: number) => { g.save(); g.shadowColor = color; g.shadowBlur = 16; g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.arc(C, C, r, 0, Math.PI * 2); g.stroke(); g.restore(); };
    ring(470, '#5ff2e0', 3);
    ring(285, '#ff6ad5', 3);
    ring(135, '#5ff2e0', 4);
    // rune glyphs
    g.save(); g.translate(C, C); g.fillStyle = 'rgba(95,242,224,.9)'; g.font = 'bold 26px serif'; g.textAlign = 'center';
    const glyphs = '忍道勝負力風火水土空';
    for (let i = 0; i < 20; i++) { g.save(); g.rotate((i / 20) * Math.PI * 2); g.fillText(glyphs[i % glyphs.length], 0, -372); g.restore(); }
    g.restore();
    // flowers
    for (let i = 0; i < 120; i++) {
      const a = Math.random() * Math.PI * 2, r = 330 + Math.random() * 100;
      g.fillStyle = ['#ff8ad8', '#ffffff', '#8ad4ff'][i % 3];
      g.beginPath(); g.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, 3, 0, Math.PI * 2); g.fill();
    }
  });
}

/** Dark steel hex deck with cyan rings for Cosmic Harbor. */
export function harborTexture() {
  return make('harbor', 1024, 1024, (g) => {
    const C = 512;
    g.fillStyle = '#2b2d3d';
    g.fillRect(0, 0, 1024, 1024);
    const s = 52;
    for (let y = 0; y < 1024 + s; y += s * 1.5) {
      for (let x = 0; x < 1024 + s; x += s * Math.sqrt(3)) {
        const ox = (Math.round(y / (s * 1.5)) % 2) * (s * Math.sqrt(3)) / 2;
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          const px = x + ox + Math.cos(a) * s * 0.94, py = y + Math.sin(a) * s * 0.94;
          if (i) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.closePath();
        g.fillStyle = `rgba(${70 + Math.random() * 25},${72 + Math.random() * 25},${95 + Math.random() * 25},1)`;
        g.fill();
        g.strokeStyle = 'rgba(15,15,25,.8)'; g.lineWidth = 2; g.stroke();
      }
    }
    const ring = (r: number, color: string, w: number) => { g.save(); g.shadowColor = color; g.shadowBlur = 18; g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.arc(C, C, r, 0, Math.PI * 2); g.stroke(); g.restore(); };
    ring(495, '#e7d8b8', 18);
    ring(472, '#22d3ee', 5);
    ring(340, '#ff4fa3', 4);
    ring(150, '#22d3ee', 6);
    // warning stripes near the edge
    g.save(); g.translate(C, C);
    for (let i = 0; i < 48; i++) {
      g.save(); g.rotate((i / 48) * Math.PI * 2);
      g.fillStyle = i % 2 ? '#f59e0b' : '#1b1b24';
      g.fillRect(-14, -458, 28, 16);
      g.restore();
    }
    g.restore();
  });
}
