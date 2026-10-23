"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createPersistentStore, usePersistentStore } from "./persistent-store";
import type { Coordinates, LocationProfile } from "./types";

export const LOCATION_PROFILES: LocationProfile[] = [
  {
    id: "ca-11",
    code: "CA-11",
    name: "San Francisco",
    label: "California's 11th Congressional District",
    kind: "congressional",
    centroid: { lat: 37.765, lng: -122.435 },
    anchorLabel: "Castro / Upper Market",
    edges: { north: "Pacific Heights", south: "Glen Park", east: "Mission District", west: "Twin Peaks" },
  },
  {
    id: "il-07",
    code: "IL-07",
    name: "Chicago",
    label: "Illinois's 7th Congressional District",
    kind: "congressional",
    centroid: { lat: 41.88, lng: -87.665 },
    anchorLabel: "Near West Side",
    edges: { north: "Wicker Park", south: "Pilsen", east: "The Loop", west: "Garfield Park" },
  },
  {
    id: "tx-07",
    code: "TX-07",
    name: "Houston",
    label: "Texas's 7th Congressional District",
    kind: "congressional",
    centroid: { lat: 29.74, lng: -95.46 },
    anchorLabel: "Upper Kirby",
    edges: { north: "Memorial Park", south: "Bellaire", east: "Montrose", west: "Westchase" },
  },
  {
    id: "co-01",
    code: "CO-01",
    name: "Denver",
    label: "Colorado's 1st Congressional District",
    kind: "congressional",
    centroid: { lat: 39.74, lng: -104.98 },
    anchorLabel: "Capitol Hill",
    edges: { north: "Five Points", south: "Washington Park", east: "Congress Park", west: "Sloan's Lake" },
  },
  {
    id: "wa-07",
    code: "WA-07",
    name: "Seattle",
    label: "Washington's 7th Congressional District",
    kind: "congressional",
    centroid: { lat: 47.625, lng: -122.315 },
    anchorLabel: "Capitol Hill",
    edges: { north: "University District", south: "Beacon Hill", east: "Madison Park", west: "Queen Anne" },
  },
  {
    id: "dc-ward-4",
    code: "Ward 4",
    name: "Washington, DC",
    label: "Ward 4 · District of Columbia",
    kind: "municipal",
    centroid: { lat: 38.96, lng: -77.03 },
    anchorLabel: "Brightwood",
    edges: { north: "Takoma", south: "Petworth", east: "Fort Totten", west: "Rock Creek Park" },
  },
];

export const DEFAULT_PROFILE_ID = "ca-11";

const profileIdStore = createPersistentStore<string>("cp:location", DEFAULT_PROFILE_ID);
const detectedStore = createPersistentStore<Coordinates | null>("cp:detected", null);

function detectedProfile(coords: Coordinates): LocationProfile {
  return {
    id: "detected",
    code: "Near Me",
    name: "Your Neighborhood",
    label: "Based on your device location",
    kind: "detected",
    centroid: coords,
    anchorLabel: "your location",
    edges: { north: "North", south: "South", east: "East", west: "West" },
  };
}

type DetectStatus = "idle" | "locating" | "denied" | "unavailable";

type LocationState = {
  profile: LocationProfile;
  profiles: LocationProfile[];
  setProfileId: (id: string) => void;
  detectLocation: () => Promise<boolean>;
  detectStatus: DetectStatus;
};

const LocationContext = createContext<LocationState | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileId] = usePersistentStore(profileIdStore);
  const [detected, setDetected] = usePersistentStore(detectedStore);
  const [detectStatus, setDetectStatus] = useState<DetectStatus>("idle");

  const profiles = useMemo(
    () => (detected ? [detectedProfile(detected), ...LOCATION_PROFILES] : LOCATION_PROFILES),
    [detected],
  );
  const profile = profiles.find((p) => p.id === profileId) ?? LOCATION_PROFILES[0];

  const detectLocation = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setDetectStatus("unavailable");
        resolve(false);
        return;
      }
      setDetectStatus("locating");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDetected({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setProfileId("detected");
          setDetectStatus("idle");
          resolve(true);
        },
        (err) => {
          setDetectStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
      );
    });
  }, [setDetected, setProfileId]);

  const value = useMemo(
    () => ({ profile, profiles, setProfileId, detectLocation, detectStatus }),
    [profile, profiles, setProfileId, detectLocation, detectStatus],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationState() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocationState must be used inside <LocationProvider>");
  return ctx;
}
