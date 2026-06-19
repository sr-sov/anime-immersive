/**
 * Pure motion math — framerate-independent smoothing and helpers.
 *
 * These are the load-bearing primitives behind the custom cursor and any
 * per-frame lerp in the app. They are pure (no DOM, no GSAP) precisely so the
 * Vitest suite can pin the framerate-independence guarantee: the same input
 * over the same wall-clock time must converge to the same place regardless of
 * frame rate. A naive `a += (b-a)*0.1` per frame fails that; this does not.
 */

/** Plain linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/**
 * Frame-rate-independent exponential smoothing (Rory Driscoll / Freya Holmér).
 *
 * `damping` is the fraction of the remaining distance that survives after ONE
 * full second — so 0.0001 is snappy (almost nothing survives a second) and
 * 0.5 is languid. `dt` is the frame delta in SECONDS. Because the decay is
 * `damping^dt`, halving the frame time and doubling the frame count lands on
 * the exact same value: the feel no longer depends on the monitor's refresh.
 *
 *   next = target + (current - target) * damping^dt
 */
export function damp(
  current: number,
  target: number,
  damping: number,
  dt: number,
): number {
  return target + (current - target) * Math.pow(damping, dt)
}

/**
 * Equivalent form expressed against a per-frame-at-60fps factor, matching the
 * `Math.pow(d, dt*60)` idiom: `factor` is how much of the gap remains each
 * frame at 60fps, and the exponent rescales it to the real frame time.
 */
export function dampFrame60(
  current: number,
  target: number,
  factor: number,
  dt: number,
): number {
  const t = 1 - Math.pow(1 - factor, dt * 60)
  return current + (target - current) * t
}

/** Map a value from one range to another (no clamping). */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin
  return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin)
}
