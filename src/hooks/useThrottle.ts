import { useRef, useCallback } from "react";

export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 3000
): [(...args: Parameters<T>) => ReturnType<T> | undefined, boolean] {
  const lastCall = useRef(0);
  const isThrottled = useRef(false);

  const throttledFn = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current < delayMs) {
        isThrottled.current = true;
        return undefined;
      }
      lastCall.current = now;
      isThrottled.current = false;
      return fn(...args);
    },
    [fn, delayMs]
  );

  return [throttledFn as any, isThrottled.current];
}
