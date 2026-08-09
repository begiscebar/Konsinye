/**
 * Location / routing / GPS-ELD integration seam.
 *
 * No live tracking provider is connected. `ManualLocationProvider` is the
 * MVP implementation: distance and drive time are ESTIMATED from state
 * centroids (straight-line / haversine, not real road miles) and are
 * always labeled "estimated" in the UI. A future provider (Samsara, Motive,
 * Google Maps, Mapbox) implements the same `LocationProvider` interface —
 * swapping it in requires an API key and one line in getLocationProvider(),
 * nothing else in the app changes.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationProvider {
  /** Best-known current location for a truck. Null if unknown. */
  getTruckLocation(input: { city?: string | null; state?: string | null }): LatLng | null;
  /** Straight-line distance in miles between two points. */
  distanceMiles(a: LatLng, b: LatLng): number;
  /** Rough drive-time estimate in hours at a fixed average speed. */
  estimateDriveHours(miles: number): number;
}

// Approximate geographic centroid per US state, used only for MVP distance
// estimates when no lat/lng is on file for a load or truck.
export const STATE_CENTROIDS: Record<string, LatLng> = {
  AL: { lat: 32.8, lng: -86.8 }, AK: { lat: 64.2, lng: -149.5 }, AZ: { lat: 34.2, lng: -111.9 },
  AR: { lat: 34.9, lng: -92.4 }, CA: { lat: 37.2, lng: -119.4 }, CO: { lat: 39.0, lng: -105.5 },
  CT: { lat: 41.6, lng: -72.7 }, DE: { lat: 39.0, lng: -75.5 }, FL: { lat: 28.6, lng: -82.4 },
  GA: { lat: 32.6, lng: -83.4 }, HI: { lat: 20.3, lng: -156.4 }, ID: { lat: 44.1, lng: -114.7 },
  IL: { lat: 40.0, lng: -89.2 }, IN: { lat: 39.9, lng: -86.3 }, IA: { lat: 42.0, lng: -93.5 },
  KS: { lat: 38.5, lng: -98.4 }, KY: { lat: 37.5, lng: -85.3 }, LA: { lat: 31.0, lng: -92.0 },
  ME: { lat: 45.4, lng: -69.2 }, MD: { lat: 39.0, lng: -76.7 }, MA: { lat: 42.3, lng: -71.8 },
  MI: { lat: 44.3, lng: -85.4 }, MN: { lat: 46.3, lng: -94.3 }, MS: { lat: 32.7, lng: -89.7 },
  MO: { lat: 38.5, lng: -92.5 }, MT: { lat: 47.0, lng: -109.6 }, NE: { lat: 41.5, lng: -99.8 },
  NV: { lat: 39.3, lng: -116.6 }, NH: { lat: 43.7, lng: -71.6 }, NJ: { lat: 40.1, lng: -74.7 },
  NM: { lat: 34.4, lng: -106.1 }, NY: { lat: 42.9, lng: -75.5 }, NC: { lat: 35.6, lng: -79.4 },
  ND: { lat: 47.5, lng: -100.5 }, OH: { lat: 40.4, lng: -82.8 }, OK: { lat: 35.6, lng: -97.5 },
  OR: { lat: 44.0, lng: -120.6 }, PA: { lat: 40.9, lng: -77.7 }, RI: { lat: 41.7, lng: -71.5 },
  SC: { lat: 33.9, lng: -80.9 }, SD: { lat: 44.4, lng: -100.2 }, TN: { lat: 35.9, lng: -86.3 },
  TX: { lat: 31.5, lng: -99.3 }, UT: { lat: 39.3, lng: -111.7 }, VT: { lat: 44.0, lng: -72.7 },
  VA: { lat: 37.5, lng: -78.9 }, WA: { lat: 47.4, lng: -120.5 }, WV: { lat: 38.6, lng: -80.6 },
  WI: { lat: 44.6, lng: -89.9 }, WY: { lat: 43.0, lng: -107.5 }, DC: { lat: 38.9, lng: -77.0 },
};

function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.8; // earth radius, miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.asin(Math.sqrt(h));
}

const AVG_TRUCK_SPEED_MPH = 50;

class ManualLocationProvider implements LocationProvider {
  getTruckLocation(input: { city?: string | null; state?: string | null }): LatLng | null {
    if (!input.state) return null;
    return STATE_CENTROIDS[input.state.toUpperCase()] ?? null;
  }
  distanceMiles(a: LatLng, b: LatLng): number {
    return Math.round(haversineMiles(a, b));
  }
  estimateDriveHours(miles: number): number {
    return Math.round((miles / AVG_TRUCK_SPEED_MPH) * 10) / 10;
  }
}

let provider: LocationProvider | null = null;

/** Returns the active location provider. Today this is always the manual/estimated one. */
export function getLocationProvider(): LocationProvider {
  if (!provider) provider = new ManualLocationProvider();
  return provider;
}

export function stateDistanceMiles(stateA?: string | null, stateB?: string | null): number | null {
  if (!stateA || !stateB) return null;
  const p = getLocationProvider();
  const a = STATE_CENTROIDS[stateA.toUpperCase()];
  const b = STATE_CENTROIDS[stateB.toUpperCase()];
  if (!a || !b) return null;
  return p.distanceMiles(a, b);
}
