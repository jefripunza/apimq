export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function randomWalk(prev: number, base: number) {
  const next = prev + (Math.random() - 0.5) * Math.max(1, base * 0.2);
  return clamp(next, 0, Math.max(10, base * 2));
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}
