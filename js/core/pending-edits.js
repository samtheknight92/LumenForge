const flushers = []

export function trackPendingEditDebouncer(debouncer) {
  if (debouncer && typeof debouncer.flush === 'function') flushers.push(debouncer)
}

export function flushPendingCharacterEdits() {
  for (const debouncer of flushers) debouncer.flush?.()
}
