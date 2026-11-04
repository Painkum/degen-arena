// Unified input: keyboard + virtual joystick + camera drag. Read by the simulation each frame.

export const input = {
  keys: new Set<string>(),
  joy: { x: 0, y: 0, active: false }, // joystick, y = forward
  dashQueued: false,
  jumpQueued: false,
  camYawDelta: 0,
  zoomDelta: 0,
};

export function moveVector() {
  let x = 0;
  let y = 0;
  const k = input.keys;
  if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
  if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
  if (input.joy.active) {
    x += input.joy.x;
    y += input.joy.y;
  }
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  return { x, y };
}

export function queueDash() {
  input.dashQueued = true;
}

export function queueJump() {
  input.jumpQueued = true;
}

export function resetInput() {
  input.keys.clear();
  input.joy.x = input.joy.y = 0;
  input.joy.active = false;
  input.dashQueued = false;
  input.jumpQueued = false;
  input.camYawDelta = 0;
  input.zoomDelta = 0;
}
