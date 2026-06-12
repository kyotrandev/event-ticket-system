import { useEffect, type DependencyList } from 'react';

/**
 * Runs an effect after the current commit, avoiding synchronous setState
 * inside useEffect (react-hooks/set-state-in-effect).
 */
export function useDeferredEffect(
  effect: () => void | (() => void) | Promise<void>,
  deps: DependencyList,
): void {
  useEffect(() => {
    let cancelled = false;
    let cleanup: void | (() => void);

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      cleanup = await effect();
    });

    return () => {
      cancelled = true;
      if (typeof cleanup === 'function') cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps
  }, deps);
}
