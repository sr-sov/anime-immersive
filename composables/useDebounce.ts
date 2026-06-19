import { ref, watch, type Ref } from 'vue'

/**
 * useDebouncedRef — returns a ref that mirrors `source` but only updates after
 * `delay` ms of quiet. Used to keep the search input snappy while throttling
 * how often we actually hit the Jikan API.
 */
export function useDebouncedRef<T>(source: Ref<T>, delay = 400): Ref<T> {
  const debounced = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, (value) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = value
    }, delay)
  })

  return debounced
}
