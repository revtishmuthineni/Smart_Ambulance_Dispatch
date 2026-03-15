/**
 * syncService.js
 * Handles syncing data to/from IndexedDB when online.
 * Call this PROACTIVELY on startup to ensure offline data is ready.
 */
import { syncHospitalsToDB, getUnsyncedLogs, clearTripLogs } from "./offlineDB.js";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

/**
 * Called on app startup (and when network returns).
 * Fetches hospitals from backend and stores them immediately in IndexedDB.
 */
export async function proactivelyCacheHospitals() {
  try {
    const res = await fetch(`${BACKEND}/hospitals`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("Hospital fetch failed");
    const hospitals = await res.json();
    await syncHospitalsToDB(hospitals);
    console.log("✅ Hospital data proactively cached to IndexedDB");
    return { success: true, count: hospitals.length };
  } catch (err) {
    console.warn("⚠️ Could not sync hospitals to offline DB:", err.message);
    return { success: false };
  }
}

/**
 * Called when the network comes back online.
 * Syncs trip logs to backend and refreshes the hospital cache.
 */
export async function syncWhenOnline() {
  console.log("🔄 Network restored — syncing offline data...");

  // 1. Re-cache hospitals
  await proactivelyCacheHospitals();

  // 2. Upload trip logs (fire-and-forget)
  try {
    const logs = await getUnsyncedLogs();
    if (logs.length === 0) return;

    const res = await fetch(`${BACKEND}/trips/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs }),
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      await clearTripLogs();
      console.log(`✅ Synced ${logs.length} trip logs to backend`);
    }
  } catch (err) {
    console.warn("⚠️ Trip log sync failed (will retry next time):", err.message);
  }
}

/**
 * Attach global listeners: proactive sync on startup and auto-sync on reconnect.
 */
export function setupNetworkSyncListeners(onStatusChange) {
  // Proactive cache on start
  proactivelyCacheHospitals();

  // Auto-sync when internet returns
  window.addEventListener("online", () => {
    console.log("🌐 Network returned");
    if (onStatusChange) onStatusChange(false); // isOffline = false
    syncWhenOnline();
  });

  window.addEventListener("offline", () => {
    console.log("📴 Network lost — switching to offline mode");
    if (onStatusChange) onStatusChange(true); // isOffline = true
  });
}
