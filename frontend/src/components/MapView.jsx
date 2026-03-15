import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import L from "leaflet";
import { cacheRoute, getCachedRoute } from "../services/offlineDB.js";
import { buildStraightLineRoute, nearestNode, pathToPolyline, dijkstraRoute } from "../services/offlineRouting.js";
import gunturGraph from "../data/gunturRoadGraph.json";

const ambulanceIcon = L.divIcon({
  className: "ambulance-div-icon",
  html: '<div class="icon"><svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="6" width="14" height="8" rx="1.5" fill="white"/><rect x="14" y="8" width="6" height="4" rx="0.5" fill="white"/><circle cx="6" cy="16" r="1.4" fill="#222"/><circle cx="12" cy="16" r="1.4" fill="#222"/></svg></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

const hospitalIcon = L.divIcon({
  className: "hospital-div-icon",
  html: '<div class="icon"><svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="2" width="18" height="20" rx="2" fill="white"/><rect x="9" y="6" width="6" height="12" fill="#1f78d1"/><rect x="6" y="9" width="12" height="6" fill="#1f78d1"/></svg></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

// auto-pan the map when ambulance position changes
function MapUpdater({ pos }) {
  const map = useMap();
  useEffect(() => { if (pos) map.panTo(pos, { animate: true, duration: 0.8 }); }, [pos]);
  return null;
}

export default function MapView({ ambulancePos, routes, setRoutes, selectedHospital, onPlaySound, setEmergencyActive, setCurrentStep, onReached, isOffline }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [usingOfflineRoute, setUsingOfflineRoute] = useState(false);

  useEffect(() => {
    if (!routes) {
      setEmergencyTriggered(false);
      setUsingOfflineRoute(false);
    }
  }, [routes]);

  async function fetchRoute() {
    if (!ambulancePos || !selectedHospital) {
      alert("Please detect ambulance location and select a hospital first.");
      return;
    }

    setLoading(true);
    setError(null);

    // ── Try 1: Online API route ──────────────────────────────────
    if (navigator.onLine) {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
        const res = await fetch(`${backendUrl}/route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ambulance_lat: ambulancePos[0],
            ambulance_lng: ambulancePos[1],
            hospital_lat: selectedHospital.lat,
            hospital_lng: selectedHospital.lng
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (res.ok) {
          const data = await res.json();
          data.best_route.distance = data.best_route.distance || 0;
          data.best_route.duration = data.best_route.duration || 0;

          // Cache the successful route for later offline use
          await cacheRoute(ambulancePos, selectedHospital, data);

          activateEmergency(data, false);
          return;
        }
      } catch (err) {
        console.warn("Online route fetch failed:", err.message);
      }
    }

    // ── Try 2: Cached route from IndexedDB ───────────────────────
    const cached = await getCachedRoute(ambulancePos, selectedHospital);
    if (cached) {
      const data = {
        best_route: {
          polyline: cached.polyline,
          distance: cached.distance,
          duration: cached.duration,
          steps: cached.steps
        },
        traffic_route: null
      };
      setUsingOfflineRoute(true);
      activateEmergency(data, true, "📋 Using cached route from your last visit.");
      return;
    }

    // ── Try 3: Dijkstra on local road graph ─────────────────────
    try {
      const startNode = nearestNode(gunturGraph, ambulancePos[0], ambulancePos[1]);
      const endNode = nearestNode(gunturGraph, selectedHospital.lat, selectedHospital.lng);
      if (startNode && endNode && startNode !== endNode) {
        const { path, totalDist } = dijkstraRoute(gunturGraph, startNode, endNode);
        if (path.length > 1) {
          const polyline = pathToPolyline(gunturGraph, path);
          const estimatedDuration = Math.ceil((totalDist / 40) * 3600);
          const data = {
            best_route: {
              polyline,
              distance: Math.round(totalDist * 1000),
              duration: estimatedDuration,
              steps: [
                "📴 Offline Mode — Local road graph used",
                "📍 Route calculated using preloaded city road network",
                `🏥 Destination: ${selectedHospital.name}`,
                `📏 Estimated distance: ${totalDist.toFixed(1)} km`,
                "📞 Call hospital if communication is needed",
                "🛣️ Follow the highlighted path on the map",
                "⚡ Proceed to Emergency Bay upon arrival"
              ]
            },
            traffic_route: null
          };
          setUsingOfflineRoute(true);
          activateEmergency(data, true, "🗺️ Offline route via local road network.");
          return;
        }
      }
    } catch (graphErr) {
      console.warn("Graph routing failed:", graphErr.message);
    }

    // ── Try 4: Absolute fallback — straight-line ─────────────────
    const fallback = buildStraightLineRoute(ambulancePos, selectedHospital);
    setUsingOfflineRoute(true);
    activateEmergency(fallback, true, "⚠️ Offline — straight-line estimate shown.");
  }

  function activateEmergency(data, offline, offlineMsg) {
    setRoutes(data);
    setEmergencyTriggered(true);
    setEmergencyActive?.(true);
    setLoading(false);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const text = offline
        ? (offlineMsg || "Offline mode. Estimated route activated.")
        : "Found the shortest route. Now start.";
      setTimeout(() => {
        const msg = new SpeechSynthesisUtterance(text);
        msg.rate = 1.0;
        window.speechSynthesis.speak(msg);
      }, 800);
    }

    alert(offline
      ? `🚑 EMERGENCY ACTIVATED (OFFLINE)\n\n⚠️ ${offlineMsg || "Estimated route loaded"}\n🏥 Routing to: ${selectedHospital.name}\n📞 Call: ${selectedHospital.phone}`
      : `🚑 EMERGENCY ACTIVATED!\n\n🏥 Routing to: ${selectedHospital.name}\n⏱️ ETA: ${Math.ceil((data.best_route.duration || 0) / 60)} minutes\n\n🎯 Follow the highlighted route on the map!`
    );
  }

  if (!ambulancePos) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f5f5f5", fontSize: "18px", color: "#999"
      }}>
        📍 Detect ambulance location to view map
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <button
        onClick={fetchRoute}
        disabled={loading || !selectedHospital || emergencyTriggered}
        className={emergencyTriggered ? "btn-glass" : "btn-primary"}
        style={{
          margin: "12px 20px",
          padding: "16px 24px",
          fontSize: "16px",
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: "1px",
          background: emergencyTriggered ? "rgba(255, 42, 95, 0.15)" : (loading ? "var(--glass-bg)" : ""),
          color: emergencyTriggered ? "var(--primary-color)" : "",
          border: emergencyTriggered ? "2px solid rgba(255, 42, 95, 0.4)" : "none",
          animation: "slide-up-fade 0.4s ease-out"
        }}
      >
        {emergencyTriggered
          ? (usingOfflineRoute ? "📴 Emergency Routed (Offline)" : "🚨 Emergency Routed")
          : loading
            ? "⏳ Finding Optimal Route..."
            : (isOffline ? "📴 Dispatch (Offline Mode)" : "🚑 Dispatch Ambulance Now")}
      </button>

      {error && (
        <div className="glass-panel" style={{
          margin: "0 15px 15px 15px", padding: "12px 16px",
          background: "rgba(255, 71, 87, 0.1)", border: "1px solid rgba(255, 71, 87, 0.3)",
          color: "var(--primary-color)", fontSize: "14px", fontWeight: "600",
          display: "flex", alignItems: "center", gap: "8px"
        }}>
          ⚠️ {error}
        </div>
      )}

      {usingOfflineRoute && (
        <div style={{
          margin: "0 15px 10px 15px", padding: "10px 14px",
          background: "rgba(255,165,0,0.12)", border: "1px solid rgba(255,165,0,0.35)",
          borderRadius: "8px", color: "#ffb347", fontSize: "13px", fontWeight: "600"
        }}>
          📴 Offline Route Active — Live traffic unavailable. Estimated path shown.
        </div>
      )}

      <MapContainer center={ambulancePos} zoom={13} style={{ flex: 1, position: "relative" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapUpdater pos={ambulancePos} />

        <Marker position={ambulancePos} icon={ambulanceIcon}>
          <Popup>🚑 Ambulance Location</Popup>
        </Marker>

        {selectedHospital && (
          <Marker position={[selectedHospital.lat, selectedHospital.lng]} icon={hospitalIcon}>
            <Popup>🏥 {selectedHospital.name} 📞 {selectedHospital.phone}</Popup>
          </Marker>
        )}

        {routes && (
          <>
            {routes.best_route?.polyline?.length > 0 && (
              <Polyline
                positions={routes.best_route.polyline}
                color={usingOfflineRoute ? "#ffb347" : "#1e90ff"}
                weight={6} opacity={0.95}
              >
                <Tooltip sticky>
                  {usingOfflineRoute ? "🟠 Offline Estimated Route" : "🔵 Shortest Route (Recommended)"}
                </Tooltip>
              </Polyline>
            )}
          </>
        )}
      </MapContainer>

      {routes && (
        <div className="glass-panel" style={{
          position: "absolute", bottom: "40px", left: "20px",
          padding: "16px 20px", zIndex: 1000,
          color: "#fff", fontSize: "14px",
          display: "flex", flexDirection: "column", gap: "10px",
          animation: "slide-up-fade 0.5s ease-out"
        }}>
          <div style={{ fontWeight: 700, marginBottom: "4px", fontSize: "12px", opacity: 0.7, letterSpacing: "1px" }}>ROUTE LEGEND</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "4px", background: usingOfflineRoute ? "#ffb347" : "#1e90ff", borderRadius: "2px" }} />
            <span>{usingOfflineRoute ? "Offline Estimated Path" : "Shortest Path (Recommended)"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
