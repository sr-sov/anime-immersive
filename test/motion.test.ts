import { describe, expect, it } from 'vitest'
import { clamp, damp, dampFrame60, lerp, mapRange } from '~/utils/motion'

describe('lerp', () => {
  it('interpolates linearly', () => {
    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 1)).toBe(10)
    expect(lerp(0, 10, 0.5)).toBe(5)
  })
})

describe('clamp', () => {
  it('bounds a value', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(99, 0, 10)).toBe(10)
  })
})

describe('mapRange', () => {
  it('remaps across ranges', () => {
    expect(mapRange(0.5, 0, 1, 0, 100)).toBe(50)
    expect(mapRange(5, 0, 10, -1, 1)).toBe(0)
  })
  it('guards a zero-width input range', () => {
    expect(mapRange(5, 2, 2, 10, 20)).toBe(10)
  })
})

describe('damp — framerate independence (the load-bearing cursor property)', () => {
  const damping = 0.01 // 1% of the gap survives each second

  it('converges toward the target', () => {
    let v = 0
    // 2 seconds of easing: well past the 1s mark (which lands exactly on 99).
    for (let i = 0; i < 120; i++) v = damp(v, 100, damping, 1 / 60)
    expect(v).toBeGreaterThan(99.9)
    expect(v).toBeLessThanOrEqual(100)
  })

  it('lands on (nearly) the same place at 60fps and 120fps over equal time', () => {
    // 1 second of simulated easing at two different frame rates.
    let at60 = 0
    for (let i = 0; i < 60; i++) at60 = damp(at60, 100, damping, 1 / 60)

    let at120 = 0
    for (let i = 0; i < 120; i++) at120 = damp(at120, 100, damping, 1 / 120)

    // A naive per-frame lerp would diverge badly here; the exponential form
    // keeps them within a hair of each other.
    expect(Math.abs(at60 - at120)).toBeLessThan(0.5)
  })

  it('exactly matches the analytic decay after one whole second', () => {
    // After 1s, remaining gap == damping * initial gap, regardless of steps.
    let v = 0
    const steps = 240
    for (let i = 0; i < steps; i++) v = damp(v, 100, damping, 1 / steps)
    const remaining = 100 - v
    expect(remaining).toBeCloseTo(100 * damping, 1)
  })
})

describe('dampFrame60 — the Math.pow(d, dt*60) idiom', () => {
  it('is also framerate independent over equal wall-clock time', () => {
    const factor = 0.15
    let a = 0
    for (let i = 0; i < 60; i++) a = dampFrame60(a, 100, factor, 1 / 60)
    let b = 0
    for (let i = 0; i < 120; i++) b = dampFrame60(b, 100, factor, 1 / 120)
    expect(Math.abs(a - b)).toBeLessThan(0.5)
  })
})
