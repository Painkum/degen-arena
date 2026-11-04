// Pooled particle bursts rendered as one THREE.Points object (cheap on mobile).
import * as THREE from 'three';

const MAX = 600;
const pos = new Float32Array(MAX * 3);
const col = new Float32Array(MAX * 3);
const vel = new Float32Array(MAX * 3);
const life = new Float32Array(MAX);
let cursor = 0;
let budget = 1; // scaled by quality setting
const tmp = new THREE.Color();

export function setParticleBudget(b: number) { budget = b; }

export function emitBurst(x: number, y: number, z: number, color: string, count: number, speed: number) {
  tmp.set(color);
  const n = Math.max(1, Math.round(count * budget));
  for (let i = 0; i < n; i++) {
    const k = cursor;
    cursor = (cursor + 1) % MAX;
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
    const a = Math.random() * Math.PI * 2;
    const u = Math.random() * 2 - 1;
    const s = speed * (0.4 + Math.random() * 0.8);
    const h = Math.sqrt(1 - u * u);
    vel[k * 3] = Math.cos(a) * h * s;
    vel[k * 3 + 1] = Math.abs(u) * s * 0.9 + speed * 0.3;
    vel[k * 3 + 2] = Math.sin(a) * h * s;
    col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
    life[k] = 0.5 + Math.random() * 0.5;
  }
}

function spriteTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,.7)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createParticleSystem() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.35, map: spriteTexture(), vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  for (let i = 0; i < MAX; i++) pos[i * 3 + 1] = -999;

  const update = (dt: number) => {
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      if (life[i] <= 0) { pos[i * 3 + 1] = -999; continue; }
      vel[i * 3 + 1] -= 9 * dt * 0.6;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (pos[i * 3 + 1] < 0.05) { pos[i * 3 + 1] = 0.05; vel[i * 3 + 1] *= -0.4; }
      const f = Math.min(1, life[i] * 2);
      col[i * 3] *= 0.995 + 0.005 * f;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  };
  const clear = () => { for (let i = 0; i < MAX; i++) { life[i] = 0; pos[i * 3 + 1] = -999; } };
  return { points, update, clear };
}
