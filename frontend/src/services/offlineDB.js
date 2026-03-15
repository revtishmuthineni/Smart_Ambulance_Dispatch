/**
 * offlineDB.js
 * A robust IndexedDB wrapper using Dexie.js.
 * Stores hospitals, cached routes, and trip logs.
 * Data is populated while online so the app works seamlessly offline.
 */
import Dexie from "dexie";

export const db = new Dexie("AmbulanceDB");

db.version(1).stores({
  hospitals: "++id, name, lat, lng, phone, city, state, type, emergencySupport, lastSynced",
  routesCache: "signature, polyline, distance, duration, steps, cachedAt",
  tripLogs:    "++id, ambulanceLat, ambulanceLng, hospitalName, status, timestamp"
});

// ─── Hospitals ────────────────────────────────────────────────────
/** Save/refresh all hospitals from backend into IndexedDB */
export async function syncHospitalsToDB(hospitals) {
  const now = new Date().toISOString();
  const withTimestamp = hospitals.map((h, i) => ({
    id: i + 1,
    name: h.name,
    lat: h.lat,
    lng: h.lng,
    phone: h.phone || "102",
    city: h.city || "",
    state: h.state || "",
    type: h.type || "General",
    emergencySupport: h.emergencySupport !== false, // default true
    lastSynced: now
  }));
  await db.hospitals.clear();
  await db.hospitals.bulkPut(withTimestamp);
  console.log(`📦 Synced ${withTimestamp.length} hospitals to offline DB`);
}

/** Read all hospitals from local IndexedDB (works offline) */
export async function getOfflineHospitals() {
  return db.hospitals.toArray();
}

// ─── Route Cache ───────────────────────────────────────────────────
/** Cache a successfully fetched online route */
export async function cacheRoute(ambulancePos, hospital, routeData) {
  const sig = `${ambulancePos[0].toFixed(3)},${ambulancePos[1].toFixed(3)}->${hospital.lat.toFixed(3)},${hospital.lng.toFixed(3)}`;
  await db.routesCache.put({
    signature: sig,
    polyline: routeData.best_route?.polyline || [],
    distance: routeData.best_route?.distance || 0,
    duration: routeData.best_route?.duration || 0,
    steps: routeData.best_route?.steps || [],
    cachedAt: new Date().toISOString()
  });
  console.log(`🗂️ Route cached: ${sig}`);
}

/** Try to find an existing cached route for a given start/end pair */
export async function getCachedRoute(ambulancePos, hospital) {
  const sig = `${ambulancePos[0].toFixed(3)},${ambulancePos[1].toFixed(3)}->${hospital.lat.toFixed(3)},${hospital.lng.toFixed(3)}`;
  const cached = await db.routesCache.get(sig);
  if (cached) {
    console.log("📋 Using cached route from offline DB");
    return cached;
  }
  return null;
}

// ─── Trip Logs ─────────────────────────────────────────────────────
/** Save a log of a dispatch trip (useful for audit and sync back when online) */
export async function logTrip({ ambulanceLat, ambulanceLng, hospitalName, status }) {
  await db.tripLogs.add({
    ambulanceLat,
    ambulanceLng,
    hospitalName,
    status: status || "started",
    timestamp: new Date().toISOString()
  });
}

/** Return all unsynced trip logs */
export async function getUnsyncedLogs() {
  return db.tripLogs.toArray();
}

/** Clear trip logs after syncing with backend */
export async function clearTripLogs() {
  await db.tripLogs.clear();
}
