import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDebouncedRef } from '~/composables/useDebounce'

describe('useDebouncedRef', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('mirrors the source only after the delay elapses', async () => {
    const source = ref('a')
    const debounced = useDebouncedRef(source, 400)
    expect(debounced.value).toBe('a')

    source.value = 'b'
    await nextTick() // flush the watcher so the timer is scheduled
    expect(debounced.value).toBe('a')

    vi.advanceTimersByTime(399)
    expect(debounced.value).toBe('a')
    vi.advanceTimersByTime(1)
    expect(debounced.value).toBe('b')
  })

  it('collapses rapid changes to the final value', async () => {
    const source = ref(0)
    const debounced = useDebouncedRef(source, 200)

    source.value = 1
    await nextTick()
    vi.advanceTimersByTime(100)

    source.value = 2 // resets the timer before the first one fires
    await nextTick()
    vi.advanceTimersByTime(100)
    expect(debounced.value).toBe(0)

    vi.advanceTimersByTime(100)
    expect(debounced.value).toBe(2)
  })
})
