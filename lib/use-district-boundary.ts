"use client";

import { useEffect, useState } from "react";
import type { DistrictGeometry } from "./api/district";

/** Outlines already fetched this session, so switching back to a district draws it instantly. */
const cache = new Map<string, DistrictGeometry | null>();

/** True for codes the Census has shapes for ("CA-11", "WY-AL"), not "Ward 4" or "Near Me". */
const isCongressional = (code: string) => /^[A-Z]{2}-(\d{2}|AL)$/.test(code);

/** The district's outline once it loads; null for non-congressional regions or when the Census is unreachable. */
export function useDistrictBoundary(code: string): DistrictGeometry | null {
  const [loaded, setLoaded] = useState<{ code: string; geometry: DistrictGeometry | null } | null>(null);

  useEffect(() => {
    if (!isCongressional(code) || cache.has(code)) return;
    let cancelled = false;
    fetch(`/api/district/boundary?code=${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ geometry: DistrictGeometry | null }>) : { geometry: null }))
      .then(({ geometry }) => {
        // Only remember real answers; a failed request can be retried on the next visit.
        if (geometry) cache.set(code, geometry);
        if (!cancelled) setLoaded({ code, geometry });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ code, geometry: null });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!isCongressional(code)) return null;
  return cache.get(code) ?? (loaded?.code === code ? loaded.geometry : null);
}
