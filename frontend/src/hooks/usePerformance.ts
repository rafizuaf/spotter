import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { InteractionManager } from 'react-native';

/**
 * useDebounce - Debounces a value
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Debounces a callback function
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delayMs: number
): (...args: TArgs) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: TArgs) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delayMs);
    },
    [callback, delayMs]
  );
}

/**
 * useThrottledCallback - Throttles a callback function
 */
export function useThrottledCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  limitMs: number
): (...args: TArgs) => void {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: TArgs) => {
      const now = Date.now();
      const remaining = limitMs - (now - lastCallRef.current);

      if (remaining <= 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        lastCallRef.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
          timeoutRef.current = null;
        }, remaining);
      }
    },
    [callback, limitMs]
  );
}

/**
 * useAfterInteractions - Runs code after animations/interactions complete
 * Useful for deferring expensive operations
 */
export function useAfterInteractions(
  callback: () => void,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      callback();
    });

    return () => task.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * useLazyLoad - Defers expensive initialization
 */
export function useLazyLoad<T>(
  factory: () => T,
  deps: React.DependencyList = []
): T | null {
  const [value, setValue] = useState<T | null>(null);

  useAfterInteractions(() => {
    setValue(factory());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}

/**
 * usePrevious - Returns the previous value of a variable
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useStableCallback - Returns a stable reference to a callback
 * The callback will always have access to the latest props/state
 */
export function useStableCallback<TArgs extends unknown[], TReturn>(
  callback: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: TArgs) => {
    return callbackRef.current(...args);
  }, []);
}

/**
 * useMemoCompare - useMemo with custom comparison
 */
export function useMemoCompare<T>(
  factory: () => T,
  deps: React.DependencyList,
  isEqual: (prev: T | undefined, next: T) => boolean
): T {
  const previousRef = useRef<T | undefined>(undefined);

  const next = useMemo(factory, deps);

  // Return previous if equal
  if (previousRef.current !== undefined && isEqual(previousRef.current, next)) {
    return previousRef.current;
  }

  previousRef.current = next;
  return next;
}

/**
 * useDeepMemo - useMemo with deep equality check
 */
export function useDeepMemo<T>(factory: () => T, deps: React.DependencyList): T {
  return useMemoCompare(
    factory,
    deps,
    (prev, next) => JSON.stringify(prev) === JSON.stringify(next)
  );
}

/**
 * useRenderCount - Tracks component render count (dev only)
 */
export function useRenderCount(componentName: string): void {
  const renderCount = useRef(0);

  useEffect(() => {
    if (__DEV__) {
      renderCount.current += 1;
      console.log(`[Render] ${componentName}: ${renderCount.current}`);
    }
  });
}

/**
 * useIsMounted - Returns whether the component is still mounted
 * Useful for avoiding state updates after unmount
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * useSafeState - useState that ignores updates after unmount
 */
export function useSafeState<T>(
  initialValue: T | (() => T)
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue);
  const isMounted = useIsMounted();

  const safeSetState = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (isMounted()) {
        setState(value);
      }
    },
    [isMounted]
  );

  return [state, safeSetState];
}

/**
 * useUpdateEffect - Like useEffect but skips first render
 */
export function useUpdateEffect(
  effect: React.EffectCallback,
  deps?: React.DependencyList
): void {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * useInterval - setInterval as a hook
 */
export function useInterval(
  callback: () => void,
  delayMs: number | null
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;

    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

/**
 * useTimeout - setTimeout as a hook
 */
export function useTimeout(
  callback: () => void,
  delayMs: number | null
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;

    const id = setTimeout(() => savedCallback.current(), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);
}
