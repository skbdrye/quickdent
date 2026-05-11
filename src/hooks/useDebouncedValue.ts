import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that updates only after `delay` ms
 * have elapsed without further changes. Used to keep heavy filtering
 * effects (`useMemo` over large arrays) off the keystroke critical path
 * so typing in inputs stays smooth.
 */
export function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
