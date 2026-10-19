import { mulberry32 } from "./utils";

type Point = [number, number];

export type ContourSpec = {
  x: number;
  y: number;
  rings: number;
  base: number;
  step: number;
  seed: number;
  /** Horizontal stretch, so hills read as ridges rather than circles. */
  stretch?: number;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Closed Catmull-Rom spline through `pts`, emitted as cubic Béziers. */
function smoothClosedPath(pts: Point[]) {
  const n = pts.length;
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d + "Z";
}

/** Nested, wobbling rings around a peak — the classic topographic map look. */
export function contourRings(spec: ContourSpec): string[] {
  const rand = mulberry32(spec.seed);
  const phase = [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2];
  const amp = [0.1 + rand() * 0.08, 0.05 + rand() * 0.05, 0.02 + rand() * 0.03];
  const stretch = spec.stretch ?? 1.3;
  const steps = 40;

  return Array.from({ length: spec.rings }, (_, k) => {
    const radius = spec.base + k * spec.step;
    const pts: Point[] = Array.from({ length: steps }, (_, i) => {
      const t = (i / steps) * Math.PI * 2;
      const wobble =
        1 +
        amp[0] * Math.sin(2 * t + phase[0] + k * 0.18) +
        amp[1] * Math.sin(3 * t + phase[1] - k * 0.12) +
        amp[2] * Math.sin(5 * t + phase[2] + k * 0.25);
      return [spec.x + Math.cos(t) * radius * wobble * stretch, spec.y + Math.sin(t) * radius * wobble];
    });
    return smoothClosedPath(pts);
  });
}

/** A gently meandering open line, used for rivers and arterial roads. */
export function meander(from: Point, to: Point, seed: number, amplitude: number, segments = 6) {
  const rand = mulberry32(seed);
  const pts: Point[] = [];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const off = i === 0 || i === segments ? 0 : (rand() - 0.5) * 2 * amplitude;
    pts.push([from[0] + dx * t + nx * off, from[1] + dy * t + ny * off]);
  }
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}
