"use client";

import { useSyncExternalStore } from "react";

type Updater<T> = T | ((prev: T) => T);

export type PersistentStore<T> = {
  read: () => T;
  set: (next: Updater<T>) => void;
  subscribe: (listener: () => void) => () => void;
  fallback: T;
};

/**
 * A tiny localStorage-backed store for useSyncExternalStore. It keeps working
 * in memory when storage is unavailable (private mode, blocked site data).
 */
export function createPersistentStore<T>(key: string, fallback: T): PersistentStore<T> {
  let cache: { raw: string | null; value: T } | null = null;
  const listeners = new Set<() => void>();

  const read = (): T => {
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return cache?.value ?? fallback;
    }
    if (cache && cache.raw === raw) return cache.value;
    let value = fallback;
    if (raw) {
      try {
        value = JSON.parse(raw) as T;
      } catch {
        value = fallback;
      }
    }
    cache = { raw, value };
    return value;
  };

  const set = (next: Updater<T>) => {
    const value = typeof next === "function" ? (next as (prev: T) => T)(read()) : next;
    const raw = JSON.stringify(value);
    try {
      window.localStorage.setItem(key, raw);
    } catch {
      // Storage unavailable: keep the value in memory only.
    }
    cache = { raw, value };
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  return { read, set, subscribe, fallback };
}

export function usePersistentStore<T>(store: PersistentStore<T>) {
  const value = useSyncExternalStore(store.subscribe, store.read, () => store.fallback);
  return [value, store.set] as const;
}
